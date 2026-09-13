/**
 * 测试覆盖声明（测试体系审计使用，不代表执行已通过）
 * @covers F046/ui
 * @covers F046/e2e
 * @covers F046/persistence
 * @covers F061/e2e
 * @covers F061/persistence
 */
import { $, browser } from '@wdio/globals';
import { THINK_PLUGIN_ID, clearE2EState, waitForThinkReady } from './support/thinkE2e';

const GOAL = 'E2E/快速精力';

describe('Think OS 真机 UI：精力快速采集', () => {
  beforeEach(async () => {
    await waitForThinkReady();
    await clearE2EState();
    await browser.executeObsidian(async ({ app }, pluginId, goalPath) => {
      const plugin = (app as any).plugins.plugins[pluginId] as any;
      const manager = plugin.serviceManager;
      await manager.useCases.goal.addGoal({ path: 'E2E' });
      await manager.useCases.goal.addGoal({ path: goalPath });
      await manager.settingsRepository.update((draft: any) => {
        draft.energySettings = { ...(draft.energySettings || {}), defaultGoalPath: goalPath };
      });
    }, THINK_PLUGIN_ID, GOAL);
  });

  it('从真实 Quick Input 点一次 80 分即可写入精力记录，插件重载后同一记录仍存在', async () => {
    const beforeIds = await browser.executeObsidian(({ app }, pluginId, goalPath) => {
      const plugin = (app as any).plugins.plugins[pluginId] as any;
      return plugin.serviceManager.dataStore.queryRecords()
        .filter((item: any) => item.recordType === 'energy' && item.goalPath === goalPath)
        .map((item: any) => item.id);
    }, THINK_PLUGIN_ID, GOAL) as string[];

    await browser.executeObsidianCommand('think-os:think-quick-input-unified-core.energy');
    const modal = await $('.think-modal--quick-input');
    await modal.waitForExist({ timeout: 10_000 });
    const panel = await $('.think-quick-input-energy-panel');
    await panel.waitForExist({ timeout: 5_000 });
    await browser.waitUntil(async () => (await panel.getText()).includes(GOAL), {
      timeout: 5_000,
      interval: 100,
      timeoutMsg: '精力快速采集没有选中配置的默认 Goal。',
    });

    const score = await panel.$('button[title^="80 ·"]');
    await score.click();
    await modal.waitForExist({ reverse: true, timeout: 15_000 });

    const created = await browser.executeObsidian(({ app }, pluginId, goalPath, existingIds) => {
      const plugin = (app as any).plugins.plugins[pluginId] as any;
      const existing = new Set(existingIds);
      const item = plugin.serviceManager.dataStore.queryRecords()
        .find((row: any) => row.recordType === 'energy' && row.goalPath === goalPath && !existing.has(row.id));
      return item ? { id: item.id, goalPath: item.goalPath, score: item.score ?? item.extra?.['精力值'] } : null;
    }, THINK_PLUGIN_ID, GOAL, beforeIds);
    expect(created).toMatchObject({ goalPath: GOAL, score: 80 });

    const id = String((created as any)?.id || '');
    expect(id).toBeTruthy();
    await browser.reloadObsidian();
    await waitForThinkReady();
    const restored = await browser.executeObsidian(({ app }, pluginId, recordId) => {
      const plugin = (app as any).plugins.plugins[pluginId] as any;
      const item = plugin.serviceManager.dataStore.getRecordById(recordId);
      return item ? { id: item.id, recordType: item.recordType, goalPath: item.goalPath } : null;
    }, THINK_PLUGIN_ID, id);
    expect(restored).toMatchObject({ id, recordType: 'energy', goalPath: GOAL });
  });
});
