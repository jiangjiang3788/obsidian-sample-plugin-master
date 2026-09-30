/** New acceptance cases use an isolated WDIO fixture vault, not the user's vault.
 * The preview case injects structured drafts: it is NOT a live-model semantic test.
 */
import { $, browser } from '@wdio/globals';
import { THINK_PLUGIN_ID, clearE2EState, waitForThinkReady } from './support/thinkE2e';

describe('重启数据保护与批量时间轴验收', () => {
  beforeEach(async () => { await waitForThinkReady(); await clearE2EState(); });

  it('实际关闭/启用插件后，截断配置原件不被空设置覆盖', async () => {
    const original = await browser.executeObsidian(async ({ app }) => app.vault.adapter.read('Think/data.json'));
    const broken = '{"goalSettings":';
    try {
      const after = await browser.executeObsidian(async ({ app }, id, raw) => {
        const plugins = (app as any).plugins;
        await plugins.disablePlugin(id);
        await app.vault.adapter.write('Think/data.json', raw);
        await plugins.enablePlugin(id);
        return app.vault.adapter.read('Think/data.json');
      }, THINK_PLUGIN_ID, broken);
      expect(after).toBe(broken);
    } finally {
      await browser.executeObsidian(async ({ app }, id, raw) => {
        const plugins = (app as any).plugins;
        await plugins.disablePlugin(id); await app.vault.adapter.write('Think/data.json', raw); await plugins.enablePlugin(id);
      }, THINK_PLUGIN_ID, original);
      await waitForThinkReady();
    }
  });

  it('三条草稿默认时间轴；缩小隐藏五分钟线；预览不创建记录', async () => {
    const countBefore = await browser.executeObsidian(({ app }, id) => {
      const plugin = (app as any).plugins.plugins[id];
      const count = plugin.serviceManager.dataStore.queryRecords().length;
      void plugin.modalPort.openAiBatchConfirm({ title: '结构化草稿验收', items: [
        { rawText: '已完成周报', target: { recordTypeId: 'core.task' }, fieldValues: { 内容: '已完成周报', status: 'done', startAt: '2026-09-30T09:00', endAt: '2026-09-30T10:00' } },
        { rawText: '计划散步', target: { recordTypeId: 'core.task' }, fieldValues: { 内容: '计划散步', status: 'open', scheduledAt: '2026-09-30T14:00' } },
        { rawText: '读书半小时', target: { recordTypeId: 'core.task' }, fieldValues: { 内容: '读书半小时', expectedDurationMinutes: 30 } },
      ] });
      return count;
    }, THINK_PLUGIN_ID);
    const preview = await $('[data-ai-batch-preview="timeline"]'); await preview.waitForExist({ timeout: 10000 });
    expect(await preview.getText()).toContain('未定位到时间轴');
    await browser.execute(() => {
      const slider = document.querySelector<HTMLInputElement>('[aria-label="时间轴每小时高度"]')!;
      slider.value = '10'; slider.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await browser.waitUntil(async () => browser.execute(() => document.querySelectorAll('[data-ai-batch-preview] [data-tick-level="five"]').length === 0));
    await browser.execute(() => {
      const slider = document.querySelector<HTMLInputElement>('[aria-label="时间轴每小时高度"]')!;
      slider.value = '200'; slider.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await browser.waitUntil(async () => browser.execute(() => document.querySelectorAll('[data-ai-batch-preview] [data-tick-level="five"]').length > 0));
    const hierarchy = await browser.execute(() => {
      const read = (level: string) => {
        const element = document.querySelector<HTMLElement>(`[data-ai-batch-preview] [data-tick-level="${level}"]`);
        return element ? {
          width: element.style.getPropertyValue('--timeline-tick-width'),
          strength: element.style.getPropertyValue('--timeline-tick-strength'),
        } : null;
      };
      const root = document.querySelector<HTMLElement>('[data-ai-batch-preview="timeline"]');
      return { density: root?.dataset.timelineDensity, tickStep: root?.dataset.timelineTickStep, half: read('half'), quarter: read('quarter'), five: read('five') };
    });
    expect(hierarchy.half).toEqual({ width: '1.5px', strength: '36%' });
    expect(hierarchy.quarter).toEqual({ width: '1.25px', strength: '25%' });
    expect(hierarchy.five).toEqual({ width: '0.5px', strength: '8%' });
    const countAfter = await browser.executeObsidian(({ app }, id) => (app as any).plugins.plugins[id].serviceManager.dataStore.queryRecords().length, THINK_PLUGIN_ID);
    expect(countAfter).toBe(countBefore);
    await $('[data-preview-record-id="record-0"]').click();
    await browser.waitUntil(async () => !await $('[data-ai-batch-preview="timeline"]').isExisting());
    await browser.keys('Escape');
  });
});
