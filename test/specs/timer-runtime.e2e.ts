/**
 * 测试覆盖声明（测试体系审计使用，不代表执行已通过）
 * @covers F050/e2e
 * @covers F051/e2e
 * @covers F055/e2e
 * @covers F056/e2e
 * @covers F126/e2e
 */
import { browser } from '@wdio/globals';
import { obsidianPage } from 'wdio-obsidian-service';
import {
  THINK_PLUGIN_ID,
  clearE2EState,
  externalTaskMarkdown,
  getRecordById,
  getRuntimeSnapshot,
  waitForRecord,
  waitForThinkReady,
} from './support/thinkE2e';

const TASK_ID = 'task.01KZZE2E000000000000000010';
const FILE = 'E2E/TimerTask.md';

describe('Think OS 真机 Runtime：Task / Timer / TaskSession', () => {
  beforeEach(async () => {
    await waitForThinkReady();
    await clearE2EState();
    await obsidianPage.write(FILE, externalTaskMarkdown(TASK_ID, '真机计时任务'));
    await waitForRecord(TASK_ID);
  });

  it('真实 DataStore 中的任务可以开始→暂停→重启恢复→继续→停止并完成', async () => {
    await browser.executeObsidian(async ({ app }, pluginId, taskId) => {
      const plugin = (app as any).plugins.plugins[pluginId] as any;
      await plugin.serviceManager.timerService.startOrResume(taskId);
      const timer = plugin.serviceManager.useCases.timer.getTimers().find((entry: any) => entry.taskId === taskId);
      if (!timer) throw new Error('计时器未创建');
      await plugin.serviceManager.timerService.pause(timer.id);
    }, THINK_PLUGIN_ID, TASK_ID);

    let snapshot: any = await getRuntimeSnapshot();
    let timer = snapshot.timers.find((entry: any) => entry.taskId === TASK_ID);
    expect(timer?.status).toBe('paused');

    await browser.reloadObsidian();
    await waitForThinkReady();
    snapshot = await getRuntimeSnapshot();
    timer = snapshot.timers.find((entry: any) => entry.taskId === TASK_ID);
    expect(timer?.status).toBe('paused');

    const result = await browser.executeObsidian(async ({ app }, pluginId, taskId) => {
      const plugin = (app as any).plugins.plugins[pluginId] as any;
      const service = plugin.serviceManager.timerService;
      const current = plugin.serviceManager.useCases.timer.getTimers().find((entry: any) => entry.taskId === taskId);
      if (!current) return { ok: false, reason: 'missing_timer' };
      await service.resume(current.id);
      await new Promise((resolve) => setTimeout(resolve, 50));
      const resumed = plugin.serviceManager.useCases.timer.getTimers().find((entry: any) => entry.id === current.id);
      const ok = await service.stopAndApply(resumed.id);
      const records = plugin.serviceManager.dataStore.queryRecords();
      return {
        ok,
        taskStatus: plugin.serviceManager.dataStore.getRecordById(taskId)?.status || null,
        sessionCount: records.filter((item: any) => item.recordType === 'task-session' && item.taskId === taskId).length,
        timerRemaining: plugin.serviceManager.useCases.timer.getTimers().some((entry: any) => entry.taskId === taskId),
      };
    }, THINK_PLUGIN_ID, TASK_ID);

    expect(result).toMatchObject({ ok: true, taskStatus: 'done', timerRemaining: false });
    expect((result as any).sessionCount).toBeGreaterThanOrEqual(1);

    const task: any = await getRecordById(TASK_ID);
    expect(task?.status).toBe('done');
  });
});
