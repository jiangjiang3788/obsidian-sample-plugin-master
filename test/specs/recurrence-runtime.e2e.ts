/**
 * 测试覆盖声明（测试体系审计使用，不代表执行已通过）
 * @covers F053/e2e
 */
import { browser } from '@wdio/globals';
import { obsidianPage } from 'wdio-obsidian-service';
import { THINK_PLUGIN_ID, clearE2EState, waitForThinkReady } from './support/thinkE2e';

const SERIES_ID = 'taskseries.01KZZE2E000000000000000030';
const TASK_ID = 'task.01KZZE2E000000000000000031';
const FILE = 'E2E/Recurring.md';

function recurringMarkdown(): string {
  return [
    '<!-- start -->',
    `记录ID:: ${SERIES_ID}`,
    '记录类型:: task-series',
    '状态:: active',
    '重复单位:: week',
    '重复间隔:: 1',
    '重复锚点:: scheduled',
    '系列开始日期:: 2026-08-24',
    `当前任务ID:: ${TASK_ID}`,
    '滚动策略:: carry',
    '内容:: E2E 每周复盘',
    '<!-- end -->',
    '',
    '<!-- start -->',
    `记录ID:: ${TASK_ID}`,
    '记录类型:: task',
    '状态:: open',
    '计划日期:: 2026-08-24',
    `系列ID:: ${SERIES_ID}`,
    '内容:: E2E 每周复盘',
    '<!-- end -->',
    '',
  ].join('\n');
}

describe('Think OS 真机 Runtime：循环任务', () => {
  beforeEach(async () => {
    await waitForThinkReady();
    await clearE2EState();
    await obsidianPage.write(FILE, recurringMarkdown());
    await browser.waitUntil(async () => browser.executeObsidian(({ app }, pluginId, ids) => {
      const plugin = (app as any).plugins.plugins[pluginId] as any;
      return Boolean(plugin.serviceManager.dataStore.getRecordById(ids.task) && plugin.serviceManager.dataStore.getRecordById(ids.series));
    }, THINK_PLUGIN_ID, { task: TASK_ID, series: SERIES_ID }), {
      timeout: 15_000,
      interval: 250,
      timeoutMsg: '循环任务测试样本未进入索引。',
    });
  });

  it('完成当前周期任务会生成下一实例并推进 TaskSeries，重启后关系保持', async () => {
    const completed = await browser.executeObsidian(async ({ app }, pluginId, ids) => {
      const plugin = (app as any).plugins.plugins[pluginId] as any;
      const ok = await plugin.serviceManager.timerService.completeTask(ids.task);
      const series = plugin.serviceManager.dataStore.getRecordById(ids.series);
      const current = series?.currentTaskId ? plugin.serviceManager.dataStore.getRecordById(series.currentTaskId) : null;
      return {
        ok,
        firstStatus: plugin.serviceManager.dataStore.getRecordById(ids.task)?.status || null,
        nextTaskId: series?.currentTaskId || null,
        nextStatus: current?.status || null,
        nextScheduledDate: current?.scheduledDate || null,
      };
    }, THINK_PLUGIN_ID, { task: TASK_ID, series: SERIES_ID });

    expect(completed).toMatchObject({ ok: true, firstStatus: 'done', nextStatus: 'open', nextScheduledDate: '2026-08-31' });
    expect((completed as any).nextTaskId).toBeTruthy();
    expect((completed as any).nextTaskId).not.toBe(TASK_ID);

    const nextTaskId = String((completed as any).nextTaskId);
    await browser.reloadObsidian();
    await waitForThinkReady();
    const restored = await browser.executeObsidian(({ app }, pluginId, ids) => {
      const plugin = (app as any).plugins.plugins[pluginId] as any;
      const series = plugin.serviceManager.dataStore.getRecordById(ids.series);
      const next = plugin.serviceManager.dataStore.getRecordById(ids.next);
      return { first: plugin.serviceManager.dataStore.getRecordById(ids.first)?.status, currentTaskId: series?.currentTaskId, nextDate: next?.scheduledDate };
    }, THINK_PLUGIN_ID, { series: SERIES_ID, first: TASK_ID, next: nextTaskId });
    expect(restored).toMatchObject({ first: 'done', currentTaskId: nextTaskId, nextDate: '2026-08-31' });
  });
});
