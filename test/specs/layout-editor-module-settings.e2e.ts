/**
 * 测试覆盖声明（测试体系审计使用，不代表执行已通过）
 * @covers F102/e2e
 * @covers F103/ui
 * @covers F103/e2e
 * @covers F103/persistence
 * @covers F103/restart
 */
import { $, browser } from '@wdio/globals';
import { THINK_PLUGIN_ID, clearE2EState, waitForThinkReady } from './support/thinkE2e';

const LAYOUT = 'E2E V6 布局编辑器';
const VIEW_A = 'E2E V6 视图 A';
const VIEW_B = 'E2E V6 视图 B';

async function seedLayout(): Promise<void> {
  await browser.executeObsidian(async ({ app }, pluginId, fixture) => {
    const plugin = (app as any).plugins.plugins[pluginId] as any;
    const manager = plugin.serviceManager;
    const settings = manager.settingsRepository.getSettings();
    for (const layout of [...(settings.layouts || [])].filter((item: any) => item.name === fixture.layout || item.name === `${fixture.layout} (副本)`)) {
      try { await manager.useCases.layout.deleteLayout(layout.id); } catch {}
    }
    for (const view of [...(settings.viewInstances || [])].filter((item: any) => [fixture.viewA, fixture.viewB, 'E2E V6 新视图'].includes(item.title))) {
      try { await manager.useCases.viewInstance.deleteView(view.id); } catch {}
    }
    const layout = await manager.useCases.layout.addLayout(fixture.layout);
    const viewA = await manager.useCases.viewInstance.createView(fixture.viewA, 'BlockView');
    const viewB = await manager.useCases.viewInstance.createView(fixture.viewB, 'TimelineView');
    if (!layout || !viewA || !viewB) throw new Error('无法准备 V6 布局真机测试数据');
    await manager.useCases.layout.addViewInstanceToLayout(layout.id, viewA.id);
    await manager.useCases.layout.addViewInstanceToLayout(layout.id, viewB.id);
  }, THINK_PLUGIN_ID, { layout: LAYOUT, viewA: VIEW_A, viewB: VIEW_B });
}

async function openExpandedLayout() {
  await browser.executeObsidianCommand('think-os:think-open-control-center');
  const layoutTab = await $('//nav[@aria-label="Think OS 设置"]//button[normalize-space()="布局"]');
  await layoutTab.waitForClickable({ timeout: 10_000 });
  await layoutTab.click();
  const item = await $(`//div[contains(@class,"think-layout-list__item")][.//button[contains(@class,"think-layout-list__item-title") and normalize-space()="${LAYOUT}"]]`);
  await item.waitForExist({ timeout: 10_000 });
  const toggle = await item.$('button[aria-label="展开布局"]');
  if (await toggle.isExisting()) await toggle.click();
  await item.$('.think-layout-editor').waitForExist({ timeout: 10_000 });
  return item;
}

describe('Think OS 真机 UI：布局编辑器与模块设置', () => {
  beforeEach(async () => {
    await waitForThinkReady();
    await clearE2EState();
    await seedLayout();
  });

  it('用户在真实布局编辑器中重新排序、移除、创建、复制并删除布局，设置仓储同步更新', async () => {
    const item = await openExpandedLayout();

    const before = await browser.executeObsidian(({ app }, pluginId, name) => {
      const plugin = (app as any).plugins.plugins[pluginId] as any;
      const settings = plugin.serviceManager.settingsRepository.getSettings();
      const layout = (settings.layouts || []).find((entry: any) => entry.name === name);
      return (layout?.viewInstanceIds || []).map((id: string) => (settings.viewInstances || []).find((view: any) => view.id === id)?.title);
    }, THINK_PLUGIN_ID, LAYOUT);
    expect(before).toEqual([VIEW_A, VIEW_B]);

    const handles = await item.$$('.think-layout-editor__view-drag');
    expect(handles.length).toBeGreaterThanOrEqual(2);
    await handles[0].click();
    await browser.keys('Space');
    await browser.keys('ArrowRight');
    await browser.keys('Space');
    await browser.waitUntil(async () => {
      const titles = await browser.executeObsidian(({ app }, pluginId, name) => {
        const plugin = (app as any).plugins.plugins[pluginId] as any;
        const settings = plugin.serviceManager.settingsRepository.getSettings();
        const layout = (settings.layouts || []).find((entry: any) => entry.name === name);
        return (layout?.viewInstanceIds || []).map((id: string) => (settings.viewInstances || []).find((view: any) => view.id === id)?.title);
      }, THINK_PLUGIN_ID, LAYOUT);
      return titles?.[0] === VIEW_B && titles?.[1] === VIEW_A;
    }, { timeout: 10_000, interval: 250, timeoutMsg: '键盘拖拽没有改变布局内视图顺序。' });

    const removeA = await item.$(`button[aria-label="从布局移除 ${VIEW_A}"]`);
    await removeA.click();
    await browser.waitUntil(async () => browser.executeObsidian(({ app }, pluginId, fixture) => {
      const plugin = (app as any).plugins.plugins[pluginId] as any;
      const settings = plugin.serviceManager.settingsRepository.getSettings();
      const layout = (settings.layouts || []).find((entry: any) => entry.name === fixture.layout);
      const titles = (layout?.viewInstanceIds || []).map((id: string) => (settings.viewInstances || []).find((view: any) => view.id === id)?.title);
      return !titles.includes(fixture.viewA);
    }, THINK_PLUGIN_ID, { layout: LAYOUT, viewA: VIEW_A }), { timeout: 10_000, interval: 200, timeoutMsg: '从布局移除视图后仓储没有更新。' });

    const picker = await item.$('input[placeholder="添加或创建视图…"]');
    await picker.setValue('E2E V6 新视图');
    await browser.keys('Enter');
    await browser.waitUntil(async () => browser.executeObsidian(({ app }, pluginId, fixture) => {
      const plugin = (app as any).plugins.plugins[pluginId] as any;
      const settings = plugin.serviceManager.settingsRepository.getSettings();
      const layout = (settings.layouts || []).find((entry: any) => entry.name === fixture.layout);
      const view = (settings.viewInstances || []).find((entry: any) => entry.title === fixture.title);
      return Boolean(view && layout?.viewInstanceIds?.includes(view.id));
    }, THINK_PLUGIN_ID, { layout: LAYOUT, title: 'E2E V6 新视图' }), { timeout: 10_000, interval: 200, timeoutMsg: '从布局编辑器创建的新视图没有加入布局。' });

    const copy = await item.$('button[aria-label="复制"]');
    await copy.click();
    const copyItem = await $(`//div[contains(@class,"think-layout-list__item")][.//button[contains(@class,"think-layout-list__item-title") and normalize-space()="${LAYOUT} (副本)"]]`);
    await copyItem.waitForExist({ timeout: 10_000 });
    const removeCopy = await copyItem.$('button[aria-label="删除"]');
    await removeCopy.click();
    await browser.acceptAlert();
    await copyItem.waitForExist({ reverse: true, timeout: 10_000 });
  });

  it('点击真实视图芯片打开模块设置，修改默认折叠并保存，Obsidian 重启后参数仍保持', async () => {
    const item = await openExpandedLayout();
    const chip = await item.$(`//button[contains(@class,"think-layout-editor__view-chip")][.//span[normalize-space()="${VIEW_B}"]]`);
    await chip.click();

    const panel = await $('.think-module-settings-panel');
    await panel.waitForExist({ timeout: 10_000 });
    const checkbox = await panel.$('//label[contains(@class,"think-selection-control")][.//span[normalize-space()="默认折叠"]]//input[@type="checkbox"]');
    if (!(await checkbox.isSelected())) await checkbox.click();
    const save = await panel.$('//button[normalize-space()="保存设置"]');
    await save.click();
    await panel.waitForExist({ reverse: true, timeout: 10_000 });

    const saved = await browser.executeObsidian(({ app }, pluginId, title) => {
      const plugin = (app as any).plugins.plugins[pluginId] as any;
      const view = (plugin.serviceManager.settingsRepository.getSettings().viewInstances || []).find((entry: any) => entry.title === title);
      return view ? { id: view.id, collapsed: view.collapsed } : null;
    }, THINK_PLUGIN_ID, VIEW_B);
    expect(saved?.collapsed).toBe(true);

    await browser.reloadObsidian();
    await waitForThinkReady();
    const restored = await browser.executeObsidian(({ app }, pluginId, id) => {
      const plugin = (app as any).plugins.plugins[pluginId] as any;
      const view = (plugin.serviceManager.settingsRepository.getSettings().viewInstances || []).find((entry: any) => entry.id === id);
      return view ? { id: view.id, collapsed: view.collapsed } : null;
    }, THINK_PLUGIN_ID, saved?.id || '');
    expect(restored).toEqual({ id: saved?.id, collapsed: true });
  });
});
