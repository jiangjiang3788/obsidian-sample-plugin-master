/**
 * 测试覆盖声明（测试体系审计使用，不代表执行已通过）
 * @covers F033/e2e
 * @covers F033/ui
 * @covers F126/e2e
 * @covers F127/e2e
 */
import { $, browser } from '@wdio/globals';
import { E2E_ROOT_GOAL, THINK_PLUGIN_ID, clearE2EState, getRuntimeSnapshot, waitForThinkReady } from './support/thinkE2e';

describe('Think OS 真机 UI：设置与 Goal', () => {
  beforeEach(async () => {
    await waitForThinkReady();
    await clearE2EState();
  });

  it('从控制台 UI 创建 Goal，落盘后重启插件仍存在', async () => {
    await browser.executeObsidianCommand('think-os:think-open-control-center');

    const settingsRoot = await $('.think-setting-root--workspace');
    await settingsRoot.waitForExist({ timeout: 10_000 });
    const dataNav = await $('nav[aria-label="数据管理"]');
    expect(await dataNav.isExisting()).toBe(true);

    const input = await $('input[aria-label="目标路径"]');
    await input.waitForDisplayed({ timeout: 5_000 });
    await input.setValue(E2E_ROOT_GOAL);

    const addButton = await $('//div[contains(@class,"think-goal-manager__create")]//button[normalize-space()="添加"]');
    await addButton.click();
    const status = await $('[role="status"]');
    await status.waitForDisplayed({ timeout: 5_000 });
    expect(await status.getText()).toContain(`已添加：${E2E_ROOT_GOAL}`);

    let snapshot: any = await getRuntimeSnapshot();
    expect(snapshot.goalPaths).toContain(E2E_ROOT_GOAL);

    await browser.reloadObsidian();
    await waitForThinkReady();
    snapshot = await getRuntimeSnapshot();
    expect(snapshot.goalPaths).toContain(E2E_ROOT_GOAL);
  });

  it('Goal 可从真实设置 UI 删除，删除结果同步到设置仓储', async () => {
    await browser.executeObsidian(async ({ app }, pluginId, goalPath) => {
      const plugin = (app as any).plugins.plugins[pluginId] as any;
      await plugin.serviceManager.useCases.goal.addGoal({ path: goalPath });
    }, THINK_PLUGIN_ID, E2E_ROOT_GOAL);

    await browser.executeObsidianCommand('think-os:think-open-control-center');
    const row = await $('//tr[contains(@class,"think-goal-template-matrix__goal-row")][.//span[contains(@class,"think-goal-template-matrix__goal-name") and normalize-space()="E2E"]]');
    await row.waitForExist({ timeout: 10_000 });

    await browser.execute(() => { window.confirm = () => true; });
    const deleteButton = await row.$('button[aria-label="删除目标"]');
    await deleteButton.click();

    await browser.waitUntil(async () => {
      const snapshot: any = await getRuntimeSnapshot();
      return !snapshot.goalPaths.includes(E2E_ROOT_GOAL);
    }, { timeout: 10_000, interval: 250, timeoutMsg: 'Goal 未能从设置中删除。' });
  });
});
