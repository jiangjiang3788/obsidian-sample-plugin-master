/**
 * 测试覆盖声明（测试体系审计使用，不代表执行已通过）
 * @covers F113/e2e
 */
import { $, browser } from '@wdio/globals';
import { THINK_PLUGIN_ID, clearE2EState, waitForThinkReady } from './support/thinkE2e';

const GOAL = 'E2E/精力设置';

async function openEnergyRecordTypeSettings(): Promise<WebdriverIO.Element> {
  await browser.executeObsidianCommand('think-os:think-open-control-center');
  const root = await $('.think-setting-root--workspace');
  await root.waitForExist({ timeout: 10_000 });

  const recordTypes = await $('//nav[@aria-label="数据管理"]//button[normalize-space()="记录类型"]');
  await recordTypes.click();
  const energy = await $('//div[contains(@class,"think-block-accordion")][.//button[contains(@class,"think-block-accordion__title") and normalize-space()="精力"]]');
  await energy.waitForExist({ timeout: 10_000 });
  const details = await energy.$('.think-block-accordion__details');
  if (!(await details.isExisting())) {
    await (await energy.$('button.think-block-accordion__title')).click();
  }
  await (await energy.$('.think-block-accordion__details')).waitForExist({ timeout: 5_000 });
  return energy;
}

describe('Think OS 真机 UI：精力默认目标设置', () => {
  beforeEach(async () => {
    await waitForThinkReady();
    await clearE2EState();
    await browser.executeObsidian(async ({ app }, pluginId, goalPath) => {
      const plugin = (app as any).plugins.plugins[pluginId] as any;
      const goal = plugin.serviceManager.useCases.goal;
      await goal.addGoal({ path: 'E2E' });
      await goal.addGoal({ path: goalPath });
    }, THINK_PLUGIN_ID, GOAL);
  });

  it('从真实记录类型设置选择默认 Goal，写入设置仓储并在 Obsidian 重载后恢复', async () => {
    let energy = await openEnergyRecordTypeSettings();
    const row = await energy.$('.//div[contains(@class,"think-settings-row")][.//span[normalize-space()="默认目标"]]');
    const select = await row.$('[role="combobox"]');
    await select.click();
    const option = await row.$(`.//*[@role="option" and normalize-space()="${GOAL}"]`);
    await option.click();

    await browser.waitUntil(async () => browser.executeObsidian(({ app }, pluginId) => {
      const plugin = (app as any).plugins.plugins[pluginId] as any;
      return plugin.serviceManager.settingsRepository.getSettings().energySettings?.defaultGoalPath;
    }, THINK_PLUGIN_ID).then((value) => value === GOAL), {
      timeout: 10_000,
      interval: 200,
      timeoutMsg: '精力默认目标没有写入真实设置仓储。',
    });

    await browser.reloadObsidian();
    await waitForThinkReady();
    energy = await openEnergyRecordTypeSettings();
    const restoredRow = await energy.$('.//div[contains(@class,"think-settings-row")][.//span[normalize-space()="默认目标"]]');
    expect(await (await restoredRow.$('[role="combobox"]')).getText()).toContain(GOAL);
  });
});
