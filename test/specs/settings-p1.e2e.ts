/**
 * 测试覆盖声明（测试体系审计使用，不代表执行已通过）
 * @covers F034/e2e
 * @covers F034/ui
 * @covers F110/e2e
 * @covers F110/ui
 * @covers F112/e2e
 * @covers F112/ui
 * @covers F114/e2e
 * @covers F115/e2e
 * @covers F111/ui
 * @covers F111/e2e
 * @covers F111/restart
 */
import { $, browser } from '@wdio/globals';
import { THINK_PLUGIN_ID, clearE2EState, waitForThinkReady } from './support/thinkE2e';

async function openControlCenter(): Promise<void> {
  await browser.executeObsidianCommand('think-os:think-open-control-center');
  const root = await $('.think-setting-root--workspace');
  await root.waitForExist({ timeout: 10_000 });
}

async function clickPrimary(label: string): Promise<void> {
  const button = await $(`//nav[@aria-label="Think OS 设置"]//button[normalize-space()="${label}"]`);
  await button.click();
}

async function clickDataSection(label: string): Promise<void> {
  const button = await $(`//nav[@aria-label="数据管理"]//button[normalize-space()="${label}"]`);
  await button.click();
}

describe('Think OS 真机 UI：P1 设置功能', () => {
  beforeEach(async () => {
    await waitForThinkReady();
    await clearE2EState();
  });

  it('数据管理在记录类型、目标、指标三个真实分区之间切换，记录类型页保持只读注册表语义', async () => {
    await openControlCenter();
    const dataNav = await $('nav[aria-label="数据管理"]');
    expect(await dataNav.isExisting()).toBe(true);

    await clickDataSection('记录类型');
    const rows = await $$('.think-block-accordion');
    expect(rows.length).toBeGreaterThanOrEqual(9);
    expect(await $('.think-block-manager').getText()).toContain('记录类型由代码统一注册');

    await clickDataSection('目标');
    expect(await $('input[aria-label="目标路径"]').isExisting()).toBe(true);

    await clickDataSection('指标');
    expect(await $('.think-goal-metrics').isExisting()).toBe(true);
  });

  it('从设置 UI 保存 Goal 指标，插件重载后指标仍存在', async () => {
    const goalPath = 'E2E/指标';
    await browser.executeObsidian(async ({ app }, pluginId, path) => {
      const plugin = (app as any).plugins.plugins[pluginId] as any;
      await plugin.serviceManager.useCases.goal.addGoal({ path: 'E2E' });
      await plugin.serviceManager.useCases.goal.addGoal({ path });
    }, THINK_PLUGIN_ID, goalPath);

    await openControlCenter();
    await clickDataSection('指标');

    const trigger = await $('.think-goal-metrics .think-simple-select__trigger');
    await trigger.click();
    const option = await $(`//div[contains(@class,"think-goal-metrics")]//*[@role="option" and normalize-space()="${goalPath}"]`);
    await option.click();

    const labelInput = await $('//div[contains(@class,"think-goal-metrics")]//div[contains(@class,"think-settings-row")][.//span[contains(normalize-space(),"指标名称")]]//input');
    await labelInput.setValue('每周完成');
    const keyInput = await $('//div[contains(@class,"think-goal-metrics")]//div[contains(@class,"think-settings-row")][.//span[contains(normalize-space(),"指标 Key")]]//input');
    await keyInput.setValue('task.week.done');
    const targetInput = await $('//div[contains(@class,"think-goal-metrics")]//div[contains(@class,"think-settings-row")][.//span[contains(normalize-space(),"目标值")]]//input');
    await targetInput.setValue('7');
    const save = await $('//div[contains(@class,"think-goal-metrics")]//button[normalize-space()="保存指标"]');
    await save.click();

    await browser.waitUntil(async () => browser.executeObsidian(({ app }, pluginId, path) => {
      const plugin = (app as any).plugins.plugins[pluginId] as any;
      const goal = plugin.serviceManager.settingsRepository.getSettings().goalSettings.goals.find((item: any) => item.path === path);
      return Boolean(goal?.metrics?.some((metric: any) => metric.key === 'task.week.done' && metric.targetValue === 7));
    }, THINK_PLUGIN_ID, goalPath), { timeout: 10_000, interval: 250, timeoutMsg: 'Goal 指标没有保存到真实设置仓储。' });

    await browser.reloadObsidian();
    await waitForThinkReady();
    const restored = await browser.executeObsidian(({ app }, pluginId, path) => {
      const plugin = (app as any).plugins.plugins[pluginId] as any;
      return plugin.serviceManager.settingsRepository.getSettings().goalSettings.goals.find((item: any) => item.path === path)?.metrics || [];
    }, THINK_PLUGIN_ID, goalPath);
    expect(restored).toEqual(expect.arrayContaining([expect.objectContaining({ key: 'task.week.done', targetValue: 7 })]));
  });

  it('通用设置里的悬浮计时器开关保存后，重载插件仍保持', async () => {
    await openControlCenter();
    await clickPrimary('通用');
    const row = await $('//div[contains(@class,"think-settings-row")][.//span[normalize-space()="悬浮计时器"]]');
    const checkbox = await row.$('input[type="checkbox"]');
    const initial = await checkbox.isSelected();
    await checkbox.click();
    const expected = !initial;

    await browser.waitUntil(async () => browser.executeObsidian(({ app }, pluginId, value) => {
      const plugin = (app as any).plugins.plugins[pluginId] as any;
      return plugin.serviceManager.settingsRepository.getSettings().floatingTimerEnabled === value;
    }, THINK_PLUGIN_ID, expected), { timeout: 10_000, interval: 250, timeoutMsg: '通用设置没有写入真实设置仓储。' });

    await browser.reloadObsidian();
    await waitForThinkReady();
    const restored = await browser.executeObsidian(({ app }, pluginId) => {
      const plugin = (app as any).plugins.plugins[pluginId] as any;
      return plugin.serviceManager.settingsRepository.getSettings().floatingTimerEnabled;
    }, THINK_PLUGIN_ID);
    expect(restored).toBe(expected);
  });

  it('布局设置从真实控制中心修改工具栏与初始视图，插件重载后仍保持', async () => {
    const layoutName = 'E2E 布局设置';
    await browser.executeObsidian(async ({ app }, pluginId, name) => {
      const plugin = (app as any).plugins.plugins[pluginId] as any;
      const manager = plugin.serviceManager;
      for (const layout of [...(manager.settingsRepository.getSettings().layouts || [])].filter((item: any) => item.name === name)) {
        try { await manager.useCases.layout.deleteLayout(layout.id); } catch {}
      }
      await manager.useCases.layout.addLayout(name);
    }, THINK_PLUGIN_ID, layoutName);

    await openControlCenter();
    await clickPrimary('布局');
    const item = await $(`//div[contains(@class,"think-layout-list__item")][.//button[contains(@class,"think-layout-list__item-title") and normalize-space()="${layoutName}"]]`);
    await item.waitForExist({ timeout: 10_000 });
    await (await item.$('button[aria-label="展开布局"]')).click();

    const toolbarRow = await item.$('//div[contains(@class,"think-settings-row")][.//span[normalize-space()="工具栏"]]');
    const toolbarCheckbox = await toolbarRow.$('input[type="checkbox"]');
    if (await toolbarCheckbox.isSelected()) await toolbarCheckbox.click();

    const initialView = await item.$('[role="group"][aria-label="初始视图"]');
    const week = await initialView.$('button*=周');
    await week.click();

    await browser.waitUntil(async () => browser.executeObsidian(({ app }, pluginId, name) => {
      const plugin = (app as any).plugins.plugins[pluginId] as any;
      const layout = plugin.serviceManager.settingsRepository.getSettings().layouts.find((item: any) => item.name === name);
      return layout?.hideToolbar === true && layout?.initialView === '周';
    }, THINK_PLUGIN_ID, layoutName), {
      timeout: 10_000,
      interval: 250,
      timeoutMsg: '布局设置没有写入真实设置仓储。',
    });

    await browser.reloadObsidian();
    await waitForThinkReady();
    const restored = await browser.executeObsidian(({ app }, pluginId, name) => {
      const plugin = (app as any).plugins.plugins[pluginId] as any;
      const layout = plugin.serviceManager.settingsRepository.getSettings().layouts.find((item: any) => item.name === name);
      return layout ? { hideToolbar: layout.hideToolbar, initialView: layout.initialView } : null;
    }, THINK_PLUGIN_ID, layoutName);
    expect(restored).toEqual({ hideToolbar: true, initialView: '周' });
  });

  it('AI 设置页真实修改端点、模型并保存，插件重载后恢复；密钥持久化开关保持关闭时不要求保存密钥', async () => {
    await openControlCenter();
    await clickPrimary('AI');

    const endpoint = await $('//div[contains(@class,"think-settings-row")][.//span[normalize-space()="API 端点"]]//input');
    const model = await $('//div[contains(@class,"think-settings-row")][.//span[normalize-space()="模型"]]//input');
    await endpoint.setValue('https://example.invalid/v1');
    await model.setValue('e2e-model');
    const save = await $('//button[normalize-space()="保存设置"]');
    await save.click();

    await browser.waitUntil(async () => browser.executeObsidian(({ app }, pluginId) => {
      const plugin = (app as any).plugins.plugins[pluginId] as any;
      const ai = plugin.serviceManager.settingsRepository.getSettings().aiSettings;
      return ai?.apiEndpoint === 'https://example.invalid/v1' && ai?.model === 'e2e-model';
    }, THINK_PLUGIN_ID), { timeout: 10_000, interval: 250, timeoutMsg: 'AI 设置没有保存到真实设置仓储。' });

    await browser.reloadObsidian();
    await waitForThinkReady();
    const restored = await browser.executeObsidian(({ app }, pluginId) => {
      const plugin = (app as any).plugins.plugins[pluginId] as any;
      const ai = plugin.serviceManager.settingsRepository.getSettings().aiSettings;
      return { apiEndpoint: ai?.apiEndpoint, model: ai?.model, persistApiKey: ai?.persistApiKey };
    }, THINK_PLUGIN_ID);
    expect(restored).toMatchObject({ apiEndpoint: 'https://example.invalid/v1', model: 'e2e-model', persistApiKey: false });
  });
});
