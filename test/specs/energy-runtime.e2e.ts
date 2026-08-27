/**
 * 测试覆盖声明（测试体系审计使用，不代表执行已通过）
 * @covers F065/e2e
 */
import { browser } from '@wdio/globals';
import { obsidianPage } from 'wdio-obsidian-service';
import { THINK_PLUGIN_ID, clearE2EState, waitForThinkReady } from './support/thinkE2e';

const GOAL = 'E2E/精力';
const ENERGY_FILE = '01/目标精力.md';

describe('Think OS 真机 Runtime：精力记录', () => {
  beforeEach(async () => {
    await waitForThinkReady();
    await clearE2EState();
    await browser.executeObsidian(async ({ app }, pluginId, goalPath) => {
      const plugin = (app as any).plugins.plugins[pluginId] as any;
      await plugin.serviceManager.useCases.goal.addGoal({ path: 'E2E' });
      await plugin.serviceManager.useCases.goal.addGoal({ path: goalPath });
    }, THINK_PLUGIN_ID, GOAL);
  });

  it('精力快照写入真实 Vault、进入 DataStore，并在重启后恢复', async () => {
    const created = await browser.executeObsidian(async ({ app }, pluginId, goalPath) => {
      const plugin = (app as any).plugins.plugins[pluginId] as any;
      const result = await plugin.serviceManager.useCases.recordInput.submitEnergySnapshot({
        goalPath,
        captureMode: 'now',
        scoreMode: 'quick',
        score: 72,
        date: '2026-08-24',
        time: '12:30',
        timePrecision: 'exact',
        source: 'desktop-panel',
      });
      const records = plugin.serviceManager.dataStore.queryRecords();
      const energy = records.find((item: any) => item.coreBlock === 'energy' && item.goalPath === goalPath);
      return { status: result.status, recordId: energy?.id || null, score: energy?.score ?? energy?.extra?.score ?? null };
    }, THINK_PLUGIN_ID, GOAL);

    expect((created as any).status).toBe('success');
    expect((created as any).recordId).toBeTruthy();
    const markdown = await obsidianPage.read(ENERGY_FILE);
    expect(markdown).toContain(`目标:: ${GOAL}`);

    const recordId = String((created as any).recordId);
    await browser.reloadObsidian();
    await waitForThinkReady();
    const restored = await browser.executeObsidian(({ app }, pluginId, id) => {
      const plugin = (app as any).plugins.plugins[pluginId] as any;
      const item = plugin.serviceManager.dataStore.getRecordById(id);
      return item ? { id: item.id, coreBlock: item.coreBlock, goalPath: item.goalPath } : null;
    }, THINK_PLUGIN_ID, recordId);
    expect(restored).toMatchObject({ id: recordId, coreBlock: 'energy', goalPath: GOAL });
  });
});
