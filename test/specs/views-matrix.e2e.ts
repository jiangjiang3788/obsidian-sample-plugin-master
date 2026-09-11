/**
 * 测试覆盖声明（测试体系审计使用，不代表执行已通过）
 * @covers F003/ui
 * @covers F080/ui
 * @covers F080/e2e
 * @covers F081/ui
 * @covers F081/e2e
 * @covers F082/ui
 * @covers F082/e2e
 * @covers F083/ui
 * @covers F083/e2e
 * @covers F084/ui
 * @covers F084/e2e
 * @covers F085/ui
 * @covers F085/e2e
 * @covers F086/ui
 * @covers F086/e2e
 * @covers F087/ui
 * @covers F087/e2e
 * @covers F088/ui
 * @covers F088/e2e
 * @covers F101/ui
 * @covers F101/e2e
 * @covers F089/ui
 * @covers F089/e2e
 * @covers F091/e2e
 * @covers F092/e2e
 * @covers F093/e2e
 * @covers F090/e2e
 * @covers F104/ui
 * @covers F104/e2e
 */
import { $, browser } from '@wdio/globals';
import { obsidianPage } from 'wdio-obsidian-service';
import { externalTaskMarkdown, THINK_PLUGIN_ID, waitForThinkReady } from './support/thinkE2e';

const LAYOUT_NAME = 'E2E 十视图';
const FILE = 'E2E/十视图.md';
const DATA_FILE = 'E2E/十视图数据.md';
const RECORD_ID = 'e2e-view-export-task';
const EXPORT_CONTENT = 'E2E 十视图导出任务';
const VIEWS = [
  ['BlockView', '块视图'], ['TableView', '表格'], ['ExcelView', '数据表格'], ['TimelineView', '时间轴'],
  ['EventTimelineView', '事件时间线'], ['StatisticsView', '统计'], ['HeatmapView', '打卡'], ['ProgressView', '成长'], ['EnergyView', '精力'], ['EisenhowerView', '四象限'],
] as const;

async function openFile(name: string): Promise<void> {
  await browser.keys(['Control', 'o']);
  const input = await $('input.prompt-input');
  await input.waitForDisplayed({ timeout: 5_000 });
  await input.setValue(name);
  await browser.pause(300);
  await browser.keys('Enter');
  await browser.pause(700);
  const thinkBlock = await $('.block-language-think');
  if (!(await thinkBlock.isExisting())) {
    await browser.keys(['Control', 'e']);
    await browser.pause(500);
  }
}

describe('Think OS 真机 UI：十种普通 View 矩阵', () => {
  before(async () => {
    await waitForThinkReady();
    try { await obsidianPage.delete('E2E'); } catch {}
    await browser.executeObsidian(async ({ app }, pluginId, layoutName, views) => {
      const plugin = (app as any).plugins.plugins[pluginId] as any;
      const manager = plugin.serviceManager;
      const settings = manager.settingsRepository.getSettings();
      for (const layout of [...(settings.layouts || [])].filter((item: any) => item.name === layoutName)) {
        try { await manager.useCases.layout.deleteLayout(layout.id); } catch {}
      }
      for (const view of [...(settings.viewInstances || [])].filter((item: any) => String(item.title || '').startsWith('E2E视图-'))) {
        try { await manager.useCases.viewInstance.deleteView(view.id); } catch {}
      }
      const layout = await manager.useCases.layout.addLayout(layoutName);
      if (!layout) throw new Error('无法创建 E2E 十视图布局');
      await manager.useCases.layout.updateLayout(layout.id, { globalFilters: [{ field: 'content', op: 'includes', value: 'E2E' }] });
      for (const [viewType, label] of views) {
        const view = await manager.useCases.viewInstance.createView(`E2E视图-${label}`, viewType);
        if (!view) throw new Error(`无法创建 E2E 视图：${label}`);
        await manager.useCases.layout.addViewInstanceToLayout(layout.id, view.id);
      }
    }, THINK_PLUGIN_ID, LAYOUT_NAME, VIEWS);
    await obsidianPage.write(DATA_FILE, externalTaskMarkdown(RECORD_ID, EXPORT_CONTENT, 'E2E'));
    await browser.executeObsidian(async ({ app }, pluginId) => {
      const plugin = (app as any).plugins.plugins[pluginId] as any;
      await plugin.serviceManager.dataStore.clearCacheAndRescan('full');
    }, THINK_PLUGIN_ID);
    await obsidianPage.write(FILE, `# 十视图真机测试\n\n\`\`\`think\n{"layout":"${LAYOUT_NAME}"}\n\`\`\`\n`);
  });

  it('真实 think 代码块装载同一布局中的十种普通 View，并且每个模块都能进入实际内容容器', async () => {
    await openFile('十视图');
    const thinkBlock = await $('.block-language-think');
    await thinkBlock.waitForExist({ timeout: 15_000 });

    for (const [, label] of VIEWS) {
      const module = await $(`section[aria-label="E2E视图-${label} 视图"]`);
      await module.waitForExist({ timeout: 10_000 });
      await module.scrollIntoView();
      const content = await module.$('.module-content');
      await content.waitForExist({ timeout: 10_000 });
      const gate = await content.$('.think-view-viewport-gate');
      await gate.waitForExist({ timeout: 10_000 });
    }
    expect((await $$('section.think-module')).length).toBeGreaterThanOrEqual(10);
  });


  it('真实工具栏可切换时间范围，日期标签会随用户操作变化', async () => {
    await openFile('十视图');
    const toolbar = await $('.think-os--layout .tp-toolbar');
    await toolbar.waitForExist({ timeout: 15_000 });
    const label = await toolbar.$('.tp-toolbar-date-display');
    const before = await label.getText();
    const previous = await toolbar.$('button[aria-label="上一时间范围"]');
    await previous.click();
    await browser.waitUntil(async () => (await label.getText()) !== before, {
      timeout: 5_000,
      interval: 100,
      timeoutMsg: '点击上一时间范围后，日期标签没有变化。',
    });
    const month = await toolbar.$('button*=月');
    await month.click();
    expect(await toolbar.getText()).toContain('月');
  });

  it('块视图的“导出为 Markdown”把真实 Record 写入剪贴板', async () => {
    await openFile('十视图');
    await browser.execute(() => {
      (window as any).__thinkE2EClipboard = '';
      const writeText = async (text: string) => { (window as any).__thinkE2EClipboard = String(text); };
      try {
        Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
      } catch {
        (navigator as any).clipboard.writeText = writeText;
      }
    });
    const module = await $('section[aria-label="E2E视图-块视图 视图"]');
    await module.waitForExist({ timeout: 15_000 });
    const exportButton = await module.$('button[aria-label="导出为 Markdown"]');
    await exportButton.waitForClickable({ timeout: 10_000 });
    await exportButton.click();
    await browser.waitUntil(async () => String(await browser.execute(() => (window as any).__thinkE2EClipboard || '')).includes(EXPORT_CONTENT), {
      timeout: 5_000,
      interval: 100,
      timeoutMsg: '真实块视图导出后，剪贴板里没有对应 Record。',
    });
    const markdown = String(await browser.execute(() => (window as any).__thinkE2EClipboard || ''));
    expect(markdown).toContain(EXPORT_CONTENT);
  });

  it('时间轴头部“创建记录”会打开真实 Quick Input，而不只是调用内部函数', async () => {
    await openFile('十视图');
    const module = await $('section[aria-label="E2E视图-时间轴 视图"]');
    await module.waitForExist({ timeout: 15_000 });
    const createButton = await module.$('button[aria-label="创建记录"]');
    await createButton.waitForClickable({ timeout: 10_000 });
    await createButton.click();
    const modal = await $('.think-modal--quick-input');
    await modal.waitForExist({ timeout: 10_000 });
    expect(await modal.isDisplayed()).toBe(true);
    await browser.keys('Escape');
  });


  it('布局全局筛选从真实设置进入 RuleBuilder，用户可在界面删除规则并写回布局', async () => {
    await openFile('十视图');
    const filterButton = await $('.think-os--layout .tp-toolbar-data-filter button*=数据筛选');
    await filterButton.waitForClickable({ timeout: 10_000 });
    expect(await filterButton.getText()).toContain('(1)');
    await filterButton.click();

    const dialog = await $('.think-data-filter-dialog');
    await dialog.waitForExist({ timeout: 10_000 });
    expect(await dialog.getText()).toContain('高级规则');
    expect(await dialog.getText()).toContain('E2E');

    const advancedChip = await dialog.$('button.think-chip');
    await advancedChip.waitForClickable({ timeout: 5_000 });
    await advancedChip.click();
    const done = await dialog.$('button*=完成');
    await done.click();
    await dialog.waitForExist({ reverse: true, timeout: 5_000 });

    const filters = await browser.executeObsidian(({ app }, pluginId, layoutName) => {
      const plugin = (app as any).plugins.plugins[pluginId] as any;
      const layout = plugin.serviceManager.settingsRepository.getSettings().layouts.find((item: any) => item.name === layoutName);
      return layout?.globalFilters || [];
    }, THINK_PLUGIN_ID, LAYOUT_NAME);
    expect(filters).toEqual([]);
  });
});
