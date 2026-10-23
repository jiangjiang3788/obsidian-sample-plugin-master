import { describeThinkControl, getThinkSurface, summarizeThinkLatency, ThinkDiagnostics } from '@/platform/obsidian/ThinkDiagnostics';

describe('Think OS performance diagnostics', () => {
  it('classifies own surfaces and never reads button text, goal data, or textarea values', () => {
    const root = document.createElement('section');
    root.className = 'think-os think-os--layout';
    root.innerHTML = '<button class="think-goal-row" data-goal-path="私人目标">绝密标题</button>';
    document.body.append(root);
    try {
      const button = root.querySelector('button')!;
      expect(getThinkSurface(button)).toBe('dashboard');
      expect(describeThinkControl(button)).toBe('button.think-goal-row');
      expect(describeThinkControl(button)).not.toMatch(/私人|绝密/);
      expect(getThinkSurface(document.body)).toBeNull();
    } finally {
      root.remove();
    }
  });

  it('distinguishes plugin dialogs but never claims unrelated Obsidian UI', () => {
    const cases = [
      ['think-ai-chat-modal', 'ai-chat'],
      ['think-ai-batch-confirm-modal', 'ai-batch'],
      ['think-ai-prompt-modal', 'ai-prompt'],
      ['think-checkin-modal-host', 'checkin'],
      ['think-name-prompt-modal', 'name-prompt'],
      ['think-quick-input-modal', 'quickinput'],
    ];
    for (const [className, expectedSurface] of cases) {
      const modal = document.createElement('div');
      modal.className = `think-os think-modal-host ${className}`;
      const button = document.createElement('button');
      button.textContent = '用户输入的私密标题';
      modal.append(button);
      document.body.append(modal);
      try {
        expect(getThinkSurface(button)).toBe(expectedSurface);
        expect(describeThinkControl(button)).not.toContain(button.textContent);
      } finally {
        modal.remove();
      }
    }
    const unrelated = document.createElement('button');
    document.body.append(unrelated);
    try { expect(getThinkSurface(unrelated)).toBeNull(); }
    finally { unrelated.remove(); }
  });

  it('calculates slowest p95 response per UI action without text payloads', () => {
    const sample = (action: string, durationMs: number) => ({
      time: '', session: '', platform: 'android', surface: 'quickinput', action,
      kind: 'response' as const, durationMs,
    });
    const summary = summarizeThinkLatency([sample('click:button', 55), sample('click:button', 230), sample('click:button2', 38)]);
    expect(summary[0]).toEqual({ action: 'quickinput / click:button', count: 2, p95Ms: 230, maxMs: 230 });
  });

  it('records interaction events with no captured field contents', async () => {
    const writes = new Map<string, string>();
    const adapter = {
      stat: async (path: string) => writes.has(path) ? { size: writes.get(path)!.length } : null,
      exists: async (path: string) => writes.has(path),
      read: async (path: string) => writes.get(path) || '',
      write: async (path: string, text: string) => { writes.set(path, text); },
      append: async (path: string, text: string) => { writes.set(path, (writes.get(path) || '') + text); },
      remove: async (path: string) => { writes.delete(path); },
      rename: async (from: string, to: string) => { writes.set(to, writes.get(from)!); writes.delete(from); },
    };
    const plugin: any = {
      manifest: { id: 'think-os', dir: '.obsidian/plugins/think-os' },
      app: { vault: { configDir: '.obsidian', adapter }, workspace: { on: () => ({}) } },
      registerEvent: () => undefined,
    };
    const root = document.createElement('div');
    root.className = 'think-quick-input-modal';
    const textarea = document.createElement('textarea');
    textarea.value = '不要把这一大段语音内容写入日志';
    root.append(textarea);
    document.body.append(root);
    const recorder = new ThinkDiagnostics(plugin);
    try {
      recorder.start();
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
      textarea.dispatchEvent(new Event('input', { bubbles: true })); // no per-letter log spam
      await recorder.flush();
      const content = [...writes.values()].join('\n');
      expect(content).toContain('quickinput');
      expect(content).toContain('input:textarea');
      expect(content.match(/input:textarea/g)).toHaveLength(1);
      expect(content).not.toContain(textarea.value);
    } finally {
      recorder.stop();
      root.remove();
    }
  });
});
