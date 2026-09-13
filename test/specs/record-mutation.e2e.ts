/**
 * 测试覆盖声明（测试体系审计使用，不代表执行已通过）
 * @covers F015/e2e
 * @covers F016/e2e
 * @covers F045/e2e
 * @covers F045/restart
 * @covers F052/e2e
 * @covers F125/e2e
 * @covers F125/persistence
 * @covers F125/restart
 */
import { browser } from '@wdio/globals';
import { obsidianPage } from 'wdio-obsidian-service';
import {
  E2E_LEAF_GOAL,
  THINK_PLUGIN_ID,
  clearE2EState,
  externalTaskMarkdown,
  getRecordById,
  readVaultFileOrNull,
  waitForRecord,
  waitForRecordMissing,
  waitForThinkReady,
} from './support/thinkE2e';

const RECORD_ID = 'task.01KZZE2E000000000000000020';
const FILE = 'E2E/Mutation.md';
const MOVED_FILE = 'E2E/MovedTasks.md';
const MOVED_GOAL = 'E2E/迁移';

describe('Think OS 真机 Runtime：Record 修改 / 时间 / 删除 / 路径迁移', () => {
  beforeEach(async () => {
    await waitForThinkReady();
    await clearE2EState();
    await browser.executeObsidian(async ({ app }, pluginId, goals) => {
      const plugin = (app as any).plugins.plugins[pluginId] as any;
      const goal = plugin.serviceManager.useCases.goal;
      for (const path of goals.paths) await goal.addGoal({ path });
      await goal.upsertGoalTemplateDraft({
        goalPath: goals.leaf,
        recordTypeId: 'core.task',
        enabled: true,
        targetFile: goals.originalFile,
      });
      await goal.upsertGoalTemplateDraft({
        goalPath: goals.moved,
        recordTypeId: 'core.task',
        enabled: true,
        targetFile: goals.movedFile,
      });
    }, THINK_PLUGIN_ID, {
      paths: ['E2E', E2E_LEAF_GOAL, MOVED_GOAL],
      leaf: E2E_LEAF_GOAL,
      moved: MOVED_GOAL,
      originalFile: FILE,
      movedFile: MOVED_FILE,
    });
    await obsidianPage.write(
      FILE,
      externalTaskMarkdown(RECORD_ID, '修改前', E2E_LEAF_GOAL)
        .replace('<!-- end -->', '开始时间:: 2026-08-24 08:00\n结束时间:: 2026-08-24 08:30\n<!-- end -->'),
    );
    await waitForRecord(RECORD_ID);
  });

  it('任务时间更新与内容修改写回真实 Markdown，重启后保持', async () => {
    const result = await browser.executeObsidian(async ({ app }, pluginId, recordId) => {
      const plugin = (app as any).plugins.plugins[pluginId] as any;
      const manager = plugin.serviceManager;
      const item = manager.dataStore.getRecordById(recordId);
      if (!item) throw new Error('未找到记录');

      const timeResult = await manager.useCases.recordInput.submitUpdateTimelineRange({
        target: { kind: 'task-range', recordId },
        range: { start: '2026-08-24T09:00', end: '2026-08-24T09:45' },
        source: 'unknown',
      });

      const refreshed = manager.dataStore.getRecordById(recordId);
      const prepared = manager.useCases.recordInput.prepareEditRecord({
        item: refreshed,
        recordTypeId: 'core.task',
        source: 'quickinput',
      });
      const updateResult = await manager.useCases.recordInput.submitUpdateRecord({
        item: refreshed,
        recordTypeId: prepared.recordTypeId || 'core.task',
        formData: {
          ...prepared.initialFormData,
          任务内容: '修改后',
          内容: '修改后',
          goalPath: refreshed.goalPath,
          目标: refreshed.goalPath,
        },
        source: 'quickinput',
      });
      return { timeStatus: timeResult.status, updateStatus: updateResult.status };
    }, THINK_PLUGIN_ID, RECORD_ID);

    expect(result).toMatchObject({ timeStatus: 'success', updateStatus: 'success' });
    const markdown = await obsidianPage.read(FILE);
    expect(markdown).toContain('内容:: 修改后');
    expect(markdown).toContain('开始时间:: 2026-08-24 09:00');
    expect(markdown).toContain('结束时间:: 2026-08-24 09:45');
    expect(markdown).not.toContain('预计时长:: 45');

    await browser.reloadObsidian();
    await waitForThinkReady();
    const after: any = await getRecordById(RECORD_ID);
    expect(after?.content).toBe('修改后');
  });

  it('修改 Goal 导致输出路径变化时先迁移到新文件，重启后 Record ID 不变', async () => {
    const result = await browser.executeObsidian(async ({ app }, pluginId, recordId, nextGoal) => {
      const plugin = (app as any).plugins.plugins[pluginId] as any;
      const manager = plugin.serviceManager;
      const item = manager.dataStore.getRecordById(recordId);
      const prepared = manager.useCases.recordInput.prepareEditRecord({ item, recordTypeId: 'core.task', source: 'quickinput' });
      return manager.useCases.recordInput.submitUpdateRecord({
        item,
        recordTypeId: prepared.recordTypeId || 'core.task',
        formData: {
          ...prepared.initialFormData,
          任务内容: '路径迁移后',
          内容: '路径迁移后',
          goalPath: nextGoal,
          目标: nextGoal,
        },
        source: 'quickinput',
      });
    }, THINK_PLUGIN_ID, RECORD_ID, MOVED_GOAL);

    expect((result as any).status).toBe('success');
    const moved = await obsidianPage.read(MOVED_FILE);
    expect(moved).toContain(RECORD_ID);
    expect(moved).toContain('内容:: 路径迁移后');
    const old = await readVaultFileOrNull(FILE);
    expect(old || '').not.toContain(RECORD_ID);

    await browser.reloadObsidian();
    await waitForThinkReady();
    const after: any = await getRecordById(RECORD_ID);
    expect(after).not.toBeNull();
    expect(after.id).toBe(RECORD_ID);
    expect(after.goalPath).toBe(MOVED_GOAL);
  });

  it('删除 Record 后文件与 DataStore 同步移除，重启不会复活', async () => {
    const result = await browser.executeObsidian(async ({ app }, pluginId, recordId) => {
      const plugin = (app as any).plugins.plugins[pluginId] as any;
      const manager = plugin.serviceManager;
      const item = manager.dataStore.getRecordById(recordId);
      return manager.useCases.recordInput.submitDeleteRecord({ item, source: 'quickinput' });
    }, THINK_PLUGIN_ID, RECORD_ID);
    expect((result as any).status).toBe('success');
    await waitForRecordMissing(RECORD_ID);
    expect((await readVaultFileOrNull(FILE)) || '').not.toContain(RECORD_ID);

    await browser.reloadObsidian();
    await waitForThinkReady();
    expect(await getRecordById(RECORD_ID)).toBeNull();
  });
});
