import { Notice, type Plugin } from 'obsidian';
import { diagnosticWarn } from '@shared/utils/public';

/** Local, bounded operation trace. Never persist input, titles, record IDs, paths or URLs. */
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

const MAX_LOG_BYTES = 2_000_000;
const FLUSH_INTERVAL_MS = 15_000;
const EVENT_LOOP_INTERVAL_MS = 2_000;
const SCOPE_SELECTOR = '.think-os, .think-modal-host, .think-quick-input-modal, .think-whiteboard-workspace-view, .think-settings-workspace-view';
const EVENT_TYPES = [
  'click', 'dblclick', 'pointerup', 'input', 'change', 'compositionstart', 'compositionend',
  'focusin', 'focusout', 'keydown', 'scroll', 'dragend', 'submit', 'paste',
] as const;

/** Only static, code-owned class tokens may label actions. Never use textContent, title, id or data-*. */
export function describeThinkControl(element: Element): string {
  const control = element.closest('button, input, textarea, select, [role="button"], [role="tab"], [role="option"], [role="menuitem"], [role="switch"], [role="checkbox"], a, summary') || element;
  const tag = control.tagName.toLowerCase();
  const validClass = (node: Element): string | undefined => Array.from(node.classList)
    .find((value) => /^think-[a-z0-9_-]{1,64}$/.test(value) || /^sv-[a-z0-9_-]{1,64}$/.test(value));
  // For otherwise-anonymous shared buttons, one immediate wrapper's static class gives useful grouping.
  const className = validClass(control) || (control.parentElement ? validClass(control.parentElement) : undefined);
  return `${tag}${className ? `.${className}` : ''}`;
}

export function getThinkSurface(target: EventTarget | null): string | null {
  if (!(target instanceof Element)) return null;
  const scope = target.closest(SCOPE_SELECTOR);
  if (!scope) return null;
  const inside = (selector: string) => Boolean(target.closest(selector));
  if (inside('.think-quick-input-modal')) return 'quickinput';
  if (inside('.think-ai-chat-modal')) return 'ai-chat';
  if (inside('.think-ai-batch-confirm-modal')) return 'ai-batch';
  if (inside('.think-ai-prompt-modal')) return 'ai-prompt';
  if (inside('.think-checkin-modal-host')) return 'checkin';
  if (inside('.think-name-prompt-modal')) return 'name-prompt';
  if (inside('.think-whiteboard-workspace-view')) return 'whiteboard';
  if (inside('.think-settings-workspace-view, .think-os--settings')) return 'settings';
  if (inside('.think-floating-panel')) return 'floating-panel';
  if (inside('.think-os--layout')) return 'dashboard';
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

/** P95 is computed from recorded samples only; sparse buckets need cautious interpretation. */
export function summarizeThinkLatency(
  entries: DiagnosticEntry[],
  kinds: ReadonlyArray<DiagnosticEntry['kind']> = ['response', 'long-task', 'lifecycle'],
): Array<{ action: string; count: number; p95Ms: number; maxMs: number }> {
  const buckets = new Map<string, number[]>();
  for (const item of entries) {
    if (item.durationMs == null || !kinds.includes(item.kind)) continue;
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

/** Platform-owned business boundaries: include only an invariant action name, timing and outcome. */
export function recordThinkDiagnostic(action: string, durationMs?: number, outcome?: string, surface = 'quickinput'): void {
  activeDiagnostics?.record('lifecycle', surface, action, durationMs, outcome);
}

/** Trace an async platform operation without adding tracing dependencies to domain services. */
export async function traceThinkOperation<T>(
  action: string,
  operation: () => Promise<T> | T,
  surface = 'operations',
  successThresholdMs = 0,
): Promise<T> {
  const startedAt = performance.now();
  try {
    const result = await operation();
    const elapsed = performance.now() - startedAt;
    if (elapsed >= successThresholdMs) recordThinkDiagnostic(action, elapsed, 'success', surface);
    return result;
  } catch (error) {
    recordThinkDiagnostic(action, performance.now() - startedAt, 'failure', surface);
    throw error;
  }
}

export class ThinkDiagnostics {
  private readonly session = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  private readonly platform = detectPlatform();
  private readonly filePath: string;
  private pending: DiagnosticEntry[] = [];
  private writeQueue: Promise<void> = Promise.resolve();
  private flushInterval: number | undefined;
  private lagInterval: number | undefined;
  private observer: PerformanceObserver | undefined;
  private lastScrollAt = 0;
  private lastInputAt = new WeakMap<Element, number>();
  private lastWriteWarningAt = 0;
  private flushFailed = false;
  private lastLagTick = 0;
  private running = false;

  constructor(private readonly plugin: Plugin) {
    const directory = plugin.manifest.dir || `${plugin.app.vault.configDir}/plugins/${plugin.manifest.id}`;
    this.filePath = `${directory}/think-os-performance-${this.platform}.jsonl`;
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    activeDiagnostics = this;
    for (const type of EVENT_TYPES) document.addEventListener(type, this.onInteraction, true);
    document.addEventListener('visibilitychange', this.onVisibilityChange);
    this.plugin.registerEvent(this.plugin.app.workspace.on('active-leaf-change', (leaf) => {
      const viewType = leaf?.view?.getViewType();
      if (viewType === 'think-os-settings-view') this.record('lifecycle', 'settings', 'activate');
      else if (viewType === 'think-os-whiteboard') this.record('lifecycle', 'whiteboard', 'activate');
      else if (leaf?.view?.containerEl?.querySelector('.think-os--layout')) this.record('lifecycle', 'dashboard', 'activate');
    }));
    this.flushInterval = window.setInterval(() => { void this.flush(); }, FLUSH_INTERVAL_MS);
    // Long Tasks API is unavailable in many iOS WebViews. Timer drift gives a coarse fallback.
    this.lastLagTick = performance.now();
    this.lagInterval = window.setInterval(() => {
      const now = performance.now();
      const elapsed = now - this.lastLagTick;
      this.lastLagTick = now;
      if (document.visibilityState !== 'visible' || elapsed > EVENT_LOOP_INTERVAL_MS * 4) return;
      if (elapsed - EVENT_LOOP_INTERVAL_MS >= 180 && document.querySelector(SCOPE_SELECTOR)) {
        this.record('long-task', 'webview', 'event-loop-delay', elapsed - EVENT_LOOP_INTERVAL_MS);
      }
    }, EVENT_LOOP_INTERVAL_MS);
    if (typeof PerformanceObserver !== 'undefined') {
      try {
        this.observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.duration >= 50 && document.querySelector(SCOPE_SELECTOR)) {
              // WebView-wide observation is evidence of lag, not proof Think OS caused it.
              this.record('long-task', 'webview', 'main-thread', entry.duration);
            }
          }
        });
        this.observer.observe({ entryTypes: ['longtask'] });
      } catch {
        this.observer?.disconnect();
        this.observer = undefined;
      }
    }
    this.record('lifecycle', 'plugin', 'start');
  }

  private readonly onVisibilityChange = () => {
    this.lastLagTick = performance.now();
    if (document.visibilityState === 'hidden') void this.flush();
  };

  private readonly onInteraction = (event: Event) => {
    const surface = getThinkSurface(event.target);
    if (!surface || !(event.target instanceof Element)) return;
    if (event.type === 'scroll') {
      const now = performance.now();
      if (now - this.lastScrollAt < 700) return;
      this.lastScrollAt = now;
    }
    if (event.type === 'input') {
      // Never emit one log entry per typed character. This also prevents dictation spam.
      const now = performance.now();
      if (now - (this.lastInputAt.get(event.target) ?? -Infinity) < 800) return;
      this.lastInputAt.set(event.target, now);
    }
    if (event.type === 'keydown') {
      const keyboard = event as KeyboardEvent;
      if (keyboard.repeat || !['Enter', 'Escape', 'Tab', 'ArrowDown', 'ArrowUp', ' '].includes(keyboard.key)) return;
    }
    const action = `${event.type}:${describeThinkControl(event.target)}`;
    this.record('interaction', surface, action);
    if (event.type !== 'click' || typeof requestAnimationFrame !== 'function') return;
    const startedAt = performance.now();
    // Click-to-two-animation-frames is a UI response proxy, not business completion time.
    requestAnimationFrame(() => requestAnimationFrame(() => {
      if (this.running) this.record('response', surface, action, performance.now() - startedAt);
    }));
  };

  record(kind: DiagnosticEntry['kind'], surface: string, action: string, durationMs?: number, outcome?: string): void {
    if (!this.running) return;
    // No spaces, paths, message strings or arbitrary HTML attributes in diagnostic labels.
    const safe = (value: string): string => /^[a-z][a-z0-9_.:-]{0,90}$/i.test(value) ? value : 'unknown';
    const entry: DiagnosticEntry = {
      time: new Date().toISOString(), session: this.session, platform: this.platform,
      kind, surface: safe(surface), action: safe(action),
    };
    if (typeof durationMs === 'number' && Number.isFinite(durationMs)) entry.durationMs = Math.max(0, Math.round(durationMs));
    if (outcome) entry.outcome = safe(outcome);
    this.pending.push(entry);
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
      const appendable = adapter as typeof adapter & { append?: (path: string, content: string) => Promise<void> };
      if (!existing) {
        await adapter.write(this.filePath, text);
      } else if (typeof appendable.append === 'function' && await adapter.exists(this.filePath)) {
        await appendable.append(this.filePath, text);
      } else {
        const prior = await adapter.exists(this.filePath) ? await adapter.read(this.filePath) : '';
        await adapter.write(this.filePath, prior + text);
      }
      this.flushFailed = false;
    }).catch((error: unknown) => {
      this.flushFailed = true;
      this.pending.unshift(...batch);
      if (this.pending.length > 2000) this.pending.splice(0, this.pending.length - 2000);
      if (Date.now() - this.lastWriteWarningAt >= 60_000) {
        this.lastWriteWarningAt = Date.now();
        diagnosticWarn('[Think OS diagnostics] Local diagnostic write failed', error);
      }
    });
    return this.writeQueue;
  }

  async exportReport(): Promise<string> {
    this.record('lifecycle', 'plugin', 'export');
    await this.flush();
    if (this.flushFailed) throw new Error('设备本地诊断日志写入失败，请检查存储权限或剩余空间。');
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

    const counts = new Map<string, number>();
    const failures = new Map<string, number>();
    for (const entry of events) {
      counts.set(entry.surface, (counts.get(entry.surface) || 0) + 1);
      if (['failure', 'error', 'http-error', 'conflict'].includes(entry.outcome || '')) {
        const key = `${entry.surface} / ${entry.action}`;
        failures.set(key, (failures.get(key) || 0) + 1);
      }
    }
    const lagMarks = events.filter((entry) => entry.action === 'lag.mark');
    const markRows = lagMarks.map((mark) => {
      const markTime = Date.parse(mark.time);
      const nearby = events
        .filter((entry) => entry.durationMs != null && Math.abs(Date.parse(entry.time) - markTime) <= 30_000)
        .sort((a, b) => (b.durationMs ?? 0) - (a.durationMs ?? 0))[0];
      const hint = nearby ? `${nearby.surface} / ${nearby.action} (${nearby.durationMs}ms)` : '未捕获耗时事件';
      return `| ${new Date(mark.time).toLocaleString('zh-CN')} | ${hint} |`;
    });
    const latencyTable = (kinds: ReadonlyArray<DiagnosticEntry['kind']>) => [
      '| 界面 / 操作 | 次数 | P95 (ms) | 最大 (ms) |',
      '| --- | ---: | ---: | ---: |',
      ...summarizeThinkLatency(events, kinds).map(({ action, count, p95Ms, maxMs }) => `| ${action} | ${count} | ${p95Ms} | ${maxMs} |`),
    ];
    const lines = [
      '# Think OS 本地操作与性能诊断', '',
      `- 设备：${this.platform}`,
      `- 日志时间范围（设备本地）：${events[0] ? new Date(events[0].time).toLocaleString('zh-CN') : '无'} ~ ${events.length ? new Date(events[events.length - 1].time).toLocaleString('zh-CN') : '无'}`, 
      `- 采集事件：${events.length}（最多保留约 4 MB 滚动日志，可能不包含全部历史）`,
      '- 只记录交互类型、平台、时刻、耗时、成功/失败；不包含输入文字、笔记、标题、路径、URL、坐标或录音。',
      '- 输入与滚动事件被采样；点击到下两帧仅代表绘制机会，不代表业务完成。',
      '- WebView 长任务 / 定时器漂移属于整页卡顿线索，不能直接归因到 Think OS。',
      '- 本报告写入 Vault；若启用 Obsidian Sync 或其他同步，导出的文件可能随 Vault 同步。', '',
      '## 各功能区事件数量', '',
      '| 功能区 | 事件数 |', '| --- | ---: |',
      ...[...counts.entries()].sort((a, b) => b[1] - a[1]).map(([surface, count]) => `| ${surface} | ${count} |`), '',
      '## 业务操作耗时 Top 20（含保存、加载、网络、存储）', '', ...latencyTable(['lifecycle']), '',
      '## 界面点击绘制延迟 Top 20', '', ...latencyTable(['response']), '',
      '## WebView 卡顿信号 Top 20', '', ...latencyTable(['long-task']), '',
      '## 失败操作', '', '| 功能区 / 操作 | 失败次数 |', '| --- | ---: |',
      ...[...failures.entries()].sort((a, b) => b[1] - a[1]).map(([action, count]) => `| ${action} | ${count} |`), '',
      '## 手动标记的卡顿', '',
      '标记发生在卡顿之后；附近 30 秒最慢事件只是线索，不代表因果关系。', '',
      '| 标记时间（设备本地） | 附近最慢的耗时事件 |', '| --- | --- |', ...markRows, '',
      `原始事件：[[${base}.jsonl]]`, '',
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
    for (const type of EVENT_TYPES) document.removeEventListener(type, this.onInteraction, true);
    document.removeEventListener('visibilitychange', this.onVisibilityChange);
    if (this.flushInterval !== undefined) window.clearInterval(this.flushInterval);
    if (this.lagInterval !== undefined) window.clearInterval(this.lagInterval);
    this.observer?.disconnect();
    void this.flush();
  }
}
