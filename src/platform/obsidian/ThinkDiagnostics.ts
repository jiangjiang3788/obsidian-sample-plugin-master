import { Notice, type Plugin } from 'obsidian';

/** Device-local, bounded diagnostics. Never collect text, titles, paths or coordinates. */
interface DiagnosticEntry {
  time: string;
  session: string;
  platform: string;
  kind: 'lifecycle' | 'interaction' | 'response' | 'long-task';
  surface: string;
  action: string;
  durationMs?: number;
  outcome?: string;
}

const MAX_LOG_BYTES = 1_000_000;
const FLUSH_INTERVAL_MS = 15_000;
const SCOPE_SELECTOR = '.think-quick-input-modal, .think-whiteboard-workspace-view, .think-settings-workspace-view, .think-os';

/** Only static code-owned classes can appear in the log, not user/record data. */
export function describeThinkControl(element: Element): string {
  const control = element.closest('button, input, textarea, select, [role="button"], [role="tab"], [role="option"]') || element;
  const tag = control.tagName.toLowerCase();
  const className = Array.from(control.classList).find((value) => /^think-[a-z0-9_-]{1,64}$/.test(value));
  return `${tag}${className ? `.${className}` : ''}`;
}

export function getThinkSurface(target: EventTarget | null): string | null {
  if (!(target instanceof Element)) return null;
  const scope = target.closest(SCOPE_SELECTOR);
  if (!scope) return null;
  if (scope.matches('.think-quick-input-modal')) return 'quickinput';
  if (scope.matches('.think-whiteboard-workspace-view') || scope.closest('.think-whiteboard-workspace-view')) return 'whiteboard';
  if (scope.matches('.think-settings-workspace-view, .think-os--settings') || scope.closest('.think-settings-workspace-view')) return 'settings';
  if (scope.matches('.think-os--layout') || scope.closest('.think-os--layout')) return 'dashboard';
  if (scope.matches('.think-floating-panel') || scope.closest('.think-floating-panel')) return 'floating-panel';
  return 'think-ui';
}

function detectPlatform(): string {
  const ua = navigator.userAgent || '';
  if (/android/i.test(ua)) return 'android';
  if (/iphone|ipad|ipod/i.test(ua) || (/macintosh/i.test(ua) && navigator.maxTouchPoints > 1)) return 'ios';
  if (/windows/i.test(ua)) return 'windows';
  if (/mac/i.test(ua)) return 'macos';
  if (/linux/i.test(ua)) return 'linux';
  return 'other';
}

/** Pure report model; the raw JSONL remains available for detailed comparisons. */
export function summarizeThinkLatency(entries: DiagnosticEntry[]): Array<{ action: string; count: number; p95Ms: number; maxMs: number }> {
  const buckets = new Map<string, number[]>();
  for (const item of entries) {
    if (item.durationMs == null || !['response', 'long-task', 'lifecycle'].includes(item.kind)) continue;
    const label = `${item.surface} / ${item.action}`;
    const values = buckets.get(label) || [];
    values.push(item.durationMs);
    buckets.set(label, values);
  }
  return Array.from(buckets, ([action, values]) => {
    values.sort((a, b) => a - b);
    return { action, count: values.length, p95Ms: values[Math.ceil(values.length * 0.95) - 1], maxMs: values[values.length - 1] };
  }).sort((a, b) => b.p95Ms - a.p95Ms).slice(0, 20);
}

let activeDiagnostics: ThinkDiagnostics | null = null;

/** Platform UI adapters can report lifecycle operations without importing main.ts. */
export function recordThinkDiagnostic(action: string, durationMs?: number, outcome?: string, surface = 'quickinput'): void {
  activeDiagnostics?.record('lifecycle', surface, action, durationMs, outcome);
}

export class ThinkDiagnostics {
  private readonly session = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  private readonly platform = detectPlatform();
  private readonly filePath: string;
  private pending: DiagnosticEntry[] = [];
  private writeQueue: Promise<void> = Promise.resolve();
  private interval: number | undefined;
  private observer: PerformanceObserver | undefined;
  private lastScrollAt = 0;
  private lastWriteWarningAt = 0;
  private running = false;

  constructor(private readonly plugin: Plugin) {
    const directory = plugin.manifest.dir || `${plugin.app.vault.configDir}/plugins/${plugin.manifest.id}`;
    this.filePath = `${directory}/think-os-performance.jsonl`;
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    activeDiagnostics = this;
    document.addEventListener('click', this.onInteraction, true);
    document.addEventListener('input', this.onInteraction, true);
    document.addEventListener('change', this.onInteraction, true);
    document.addEventListener('compositionstart', this.onInteraction, true);
    document.addEventListener('compositionend', this.onInteraction, true);
    document.addEventListener('focusin', this.onInteraction, true);
    document.addEventListener('keydown', this.onInteraction, true);
    document.addEventListener('scroll', this.onInteraction, true);
    document.addEventListener('visibilitychange', this.onVisibilityChange);
    this.plugin.registerEvent(this.plugin.app.workspace.on('active-leaf-change', (leaf) => {
      const viewType = leaf?.view?.getViewType();
      if (viewType === 'think-os-settings-view') this.record('lifecycle', 'settings', 'activate');
      else if (viewType === 'think-os-whiteboard') this.record('lifecycle', 'whiteboard', 'activate');
      else if (leaf?.view?.containerEl?.querySelector('.think-os--layout')) this.record('lifecycle', 'dashboard', 'activate');
    }));
    this.interval = window.setInterval(() => { void this.flush(); }, FLUSH_INTERVAL_MS);
    if (typeof PerformanceObserver !== 'undefined') {
      try {
        this.observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.duration < 50) continue;
            const active = document.activeElement;
            // Long tasks belong to the whole WebView, not necessarily this plugin.
            // Mark their attribution explicitly rather than claiming a culprit.
            if (getThinkSurface(active) || document.querySelector('.think-quick-input-modal, .think-os--layout, .think-settings-workspace-view, .think-whiteboard-workspace-view')) {
              this.record('long-task', 'webview', 'main-thread', entry.duration);
            }
          }
        });
        this.observer.observe({ entryTypes: ['longtask'] });
      } catch {
        this.observer?.disconnect();
        this.observer = undefined; // iOS WebKit often lacks longtask support.
      }
    }
    this.record('lifecycle', 'plugin', 'start');
  }

  private readonly onVisibilityChange = () => {
    if (document.visibilityState === 'hidden') void this.flush();
  };

  private readonly onInteraction = (event: Event) => {
    const surface = getThinkSurface(event.target);
    if (!surface || !(event.target instanceof Element)) return;
    if (event.type === 'scroll') {
      const now = Date.now();
      if (now - this.lastScrollAt < 700) return;
      this.lastScrollAt = now;
    }
    if (event.type === 'keydown') {
      const keyboard = event as KeyboardEvent;
      if (keyboard.repeat || !['Enter', 'Escape', 'Tab', 'ArrowDown', 'ArrowUp', ' '].includes(keyboard.key)) return;
    }
    const action = `${event.type}:${describeThinkControl(event.target)}`;
    this.record('interaction', surface, action);
    if (event.type !== 'click' || typeof requestAnimationFrame !== 'function') return;
    const start = performance.now();
    // Two frames measure click-to-next-paint opportunity; not business completion.
    requestAnimationFrame(() => requestAnimationFrame(() => {
      if (this.running) this.record('response', surface, action, performance.now() - start);
    }));
  };

  record(kind: DiagnosticEntry['kind'], surface: string, action: string, durationMs?: number, outcome?: string): void {
    if (!this.running) return;
    // Callers must provide code-owned tokens; reject freeform user data.
    const safe = (value: string) => /^[a-z0-9_.:/ -]{1,110}$/i.test(value) ? value : 'unknown';
    const entry: DiagnosticEntry = {
      time: new Date().toISOString(), session: this.session, platform: this.platform,
      kind, surface: safe(surface), action: safe(action),
    };
    if (typeof durationMs === 'number' && Number.isFinite(durationMs)) entry.durationMs = Math.round(durationMs);
    if (outcome) entry.outcome = safe(outcome);
    this.pending.push(entry);
    // In-memory bound when storage is unavailable; interaction never blocks on IO.
    if (this.pending.length > 2000) this.pending.splice(0, this.pending.length - 2000);
  }

  async flush(): Promise<void> {
    if (this.pending.length === 0) return this.writeQueue;
    const batch = this.pending.splice(0);
    const text = batch.map((entry) => JSON.stringify(entry)).join('\n') + '\n';
    this.writeQueue = this.writeQueue.catch(() => undefined).then(async () => {
      const adapter = this.plugin.app.vault.adapter;
      const existing = await adapter.stat(this.filePath);
      if (existing && existing.size + text.length > MAX_LOG_BYTES) {
        const previous = `${this.filePath}.old`;
        if (await adapter.exists(previous)) await adapter.remove(previous);
        await adapter.rename(this.filePath, previous);
      }
      // Append avoids rewriting/reading megabytes on low-end Android devices.
      const appendable = adapter as typeof adapter & { append?: (path: string, content: string) => Promise<void> };
      if (!existing) {
        await adapter.write(this.filePath, text);
      } else if (typeof appendable.append === 'function' && await adapter.exists(this.filePath)) {
        await appendable.append(this.filePath, text);
      } else {
        const prior = await adapter.exists(this.filePath) ? await adapter.read(this.filePath) : '';
        await adapter.write(this.filePath, prior + text);
      }
    }).catch((error: unknown) => {
      this.pending.unshift(...batch);
      if (this.pending.length > 2000) this.pending.splice(0, this.pending.length - 2000);
      if (Date.now() - this.lastWriteWarningAt >= 60_000) {
        this.lastWriteWarningAt = Date.now();
        console.warn('[Think OS diagnostics] Local diagnostic write failed', error);
      }
    });
    return this.writeQueue;
  }

  async exportReport(): Promise<string> {
    this.record('lifecycle', 'plugin', 'export');
    await this.flush();
    const adapter = this.plugin.app.vault.adapter;
    const previous = `${this.filePath}.old`;
    const raw = `${await adapter.exists(previous) ? await adapter.read(previous) : ''}${await adapter.exists(this.filePath) ? await adapter.read(this.filePath) : ''}`;
    const events: DiagnosticEntry[] = [];
    for (const line of raw.split('\n')) {
      if (!line) continue;
      try { events.push(JSON.parse(line) as DiagnosticEntry); } catch { /* truncated last line */ }
    }
    const folder = 'Think/diagnostics';
    if (!await adapter.exists('Think')) await adapter.mkdir('Think');
    if (!await adapter.exists(folder)) await adapter.mkdir(folder);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const base = `${folder}/think-os-${timestamp}`;
    await adapter.write(`${base}.jsonl`, raw);
    const rows = summarizeThinkLatency(events);
    const lines = [
      '# Think OS 本地性能诊断', '',
      `- 设备：${this.platform}`,
      `- 采集事件：${events.length}（最近约 2 MB，日志滚动覆盖）`,
      '- 只包含界面操作和时间；不包含笔记、语音、输入文字或文件路径。',
      '- 点击响应：点击到下两帧的耗时，并不等于数据保存完成。',
      '- 主线程长任务：WebView 全局耗时，不一定由 Think OS 引起。', '',
      '## 响应耗时 Top 20', '',
      '| 界面 / 操作 | 次数 | P95 (ms) | 最大 (ms) |',
      '| --- | ---: | ---: | ---: |',
      ...rows.map(({ action, count, p95Ms, maxMs }) => `| ${action} | ${count} | ${p95Ms} | ${maxMs} |`),
      '', `原始事件：[[${base}.jsonl]]`, '',
    ];
    await adapter.write(`${base}.md`, lines.join('\n'));
    new Notice('Think OS 诊断已导出到 Think/diagnostics（报告与原始日志）');
    return `${base}.md`;
  }

  stop(): void {
    if (!this.running) return;
    this.record('lifecycle', 'plugin', 'stop');
    this.running = false;
    if (activeDiagnostics === this) activeDiagnostics = null;
    for (const type of ['click', 'input', 'change', 'compositionstart', 'compositionend', 'focusin', 'keydown', 'scroll']) {
      document.removeEventListener(type, this.onInteraction, true);
    }
    document.removeEventListener('visibilitychange', this.onVisibilityChange);
    if (this.interval !== undefined) window.clearInterval(this.interval);
    this.observer?.disconnect();
    void this.flush();
  }
}
