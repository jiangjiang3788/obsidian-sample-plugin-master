/**
 * 测试覆盖声明（测试体系审计使用，不代表执行已通过）
 * @covers F038/e2e
 * @covers F116/e2e
 */
import { $, browser } from '@wdio/globals';
import { THINK_PLUGIN_ID, clearE2EState, waitForThinkReady } from './support/thinkE2e';

const GOAL = 'E2E/模板字段';

async function openGoalSettings(): Promise<void> {
  await browser.executeObsidianCommand('think-os:think-open-control-center');
  const root = await $('.think-setting-root--workspace');
  await root.waitForExist({ timeout: 10_000 });
  const goalButton = await $('//nav[@aria-label="数据管理"]//button[normalize-space()="目标"]');
  await goalButton.click();
}

describe('Think OS 真机 UI：GoalTemplate 与 FieldsEditor', () => {
  beforeEach(async () => {
    await waitForThinkReady();
    await clearE2EState();
    await browser.executeObsidian(async ({ app }, pluginId, goalPath) => {
      const plugin = (app as any).plugins.plugins[pluginId] as any;
      await plugin.serviceManager.useCases.goal.addGoal({ path: 'E2E' });
      await plugin.serviceManager.useCases.goal.addGoal({ path: goalPath });
    }, THINK_PLUGIN_ID, GOAL);
  });

  it('从目标矩阵新建任务模板、添加字段并保存，重载 Obsidian 后完整恢复', async () => {
    await openGoalSettings();
    const expand = await $('//tr[contains(@class,"think-goal-template-matrix__goal-row")][.//span[contains(@class,"think-goal-template-matrix__goal-name") and normalize-space()="E2E"]]//button[@aria-label="展开子目标"]');
    if (await expand.isExisting()) await expand.click();

    const row = await $('//tr[contains(@class,"think-goal-template-matrix__goal-row")][.//span[contains(@class,"think-goal-template-matrix__goal-name") and normalize-space()="模板字段"]]');
    await row.waitForExist({ timeout: 10_000 });
    await (await row.$('button[aria-label="添加模板"]')).click();
    const menu = await $(`div[role="menu"][aria-label="给 ${GOAL} 添加模板"]`);
    await menu.waitForExist({ timeout: 5_000 });
    const task = await menu.$('button*=任务');
    await task.click();

    const editor = await $('.think-goal-template-editor');
    await editor.waitForExist({ timeout: 10_000 });
    const targetRow = await editor.$('//div[contains(@class,"think-settings-row")][.//div[normalize-space()="保存文件"]]');
    const targetInput = await targetRow.$('input');
    await targetInput.setValue('E2E/模板字段任务.md');

    const addField = await editor.$('button*=添加字段');
    await addField.click();
    const fieldName = await editor.$('input[placeholder="字段名称"]');
    await fieldName.setValue('场景');
    await fieldName.click();
    await browser.keys('Tab');

    const save = await editor.$('button=保存');
    await save.click();
    await editor.waitForExist({ reverse: true, timeout: 10_000 });

    await browser.waitUntil(async () => browser.executeObsidian(({ app }, pluginId, goalPath) => {
      const plugin = (app as any).plugins.plugins[pluginId] as any;
      const rows = plugin.serviceManager.settingsRepository.getSettings().goalSettings.goalTemplates || [];
      const template = rows.find((item: any) => item.goalPath === goalPath && item.recordTypeId === 'core.task');
      return Boolean(template?.targetFile === 'E2E/模板字段任务.md' && template?.fields?.some((field: any) => field.key === '场景'));
    }, THINK_PLUGIN_ID, GOAL), {
      timeout: 10_000,
      interval: 250,
      timeoutMsg: 'GoalTemplate 或自定义字段没有保存到真实设置仓储。',
    });

    await browser.reloadObsidian();
    await waitForThinkReady();
    const restored = await browser.executeObsidian(({ app }, pluginId, goalPath) => {
      const plugin = (app as any).plugins.plugins[pluginId] as any;
      const template = (plugin.serviceManager.settingsRepository.getSettings().goalSettings.goalTemplates || [])
        .find((item: any) => item.goalPath === goalPath && item.recordTypeId === 'core.task');
      return template ? { targetFile: template.targetFile, fields: template.fields || [] } : null;
    }, THINK_PLUGIN_ID, GOAL);
    expect(restored).toMatchObject({
      targetFile: 'E2E/模板字段任务.md',
      fields: expect.arrayContaining([expect.objectContaining({ key: '场景' })]),
    });
  });
});
