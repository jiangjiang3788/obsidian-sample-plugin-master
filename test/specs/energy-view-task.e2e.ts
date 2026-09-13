/**
 * 测试覆盖声明（测试体系审计使用，不代表执行已通过）
 * @covers F064/ui
 * @covers F064/e2e
 */
import { $, browser } from '@wdio/globals';
import { obsidianPage } from 'wdio-obsidian-service';
import { THINK_PLUGIN_ID, clearE2EState, waitForThinkReady } from './support/thinkE2e';

const GOAL = 'E2E/精力视图';
const LAYOUT = 'E2E 精力任务联动';
const PAGE = 'E2E/精力任务联动.md';
let expectedTaskId = '';

async function openPage(): Promise<void> {
  await browser.keys(['Control', 'o']);
  const input = await $('input.prompt-input');
  await input.waitForDisplayed({ timeout: 5_000 });
  await input.setValue('精力任务联动');
  await browser.keys('Enter');
  await browser.pause(500);
  if (!(await $('.block-language-think').isExisting())) await browser.keys(['Control', 'e']);
}

describe('Think OS 真机 UI：精力视图与任务联动', () => {
  beforeEach(async () => {
    await waitForThinkReady();
    await clearE2EState();
    expectedTaskId = String(await browser.executeObsidian(async ({ app }, pluginId, fixture) => {
      const plugin = (app as any).plugins.plugins[pluginId] as any;
      const manager = plugin.serviceManager;
      await manager.useCases.goal.addGoal({ path: 'E2E' });
      await manager.useCases.goal.addGoal({ path: fixture.goal });
      await manager.useCases.goal.upsertGoalTemplateDraft({ goalPath: fixture.goal, recordTypeId: 'core.task', enabled: true, targetFile: 'E2E/EnergyTasks.md' });
      const taskResult = await manager.useCases.recordInput.submitCreateRecord({
        recordTypeId: 'core.task', source: 'e2e',
        formData: { goalPath: fixture.goal, 目标: fixture.goal, 任务内容: 'V6 精力推荐任务', 脑力要求: 'medium', 体力要求: 'low', 预计时长: 25, 可用场景: ['work'] },
        context: { goalPath: fixture.goal, 目标: fixture.goal },
      });
      await manager.useCases.recordInput.submitEnergySnapshot({
        goalPath: fixture.goal, captureMode: 'now', scoreMode: 'quick', score: 85,
        date: '2026-08-24', time: '08:30', timePrecision: 'exact', source: 'desktop-panel',
      });
      const taskId = taskResult.affectedRecordId;
      const layout = await manager.useCases.layout.addLayout(fixture.layout);
      const view = await manager.useCases.viewInstance.createView('E2E 精力任务视图', 'EnergyView');
      if (!layout || !view || !taskId) throw new Error('无法准备精力视图真机数据');
      await manager.useCases.viewInstance.updateView(view.id, { viewConfig: { currentContext: 'work' } });
      await manager.useCases.layout.addViewInstanceToLayout(layout.id, view.id);
      return taskId;
    }, THINK_PLUGIN_ID, { goal: GOAL, layout: LAYOUT }));
    await obsidianPage.write(PAGE, `# 精力任务联动\n\n\`\`\`think\n{"layout":"${LAYOUT}"}\n\`\`\`\n`);
  });

  it('真实精力视图显示当前推荐，点击推荐后启动与该任务关联的 Timer', async () => {
    await openPage();
    const energyModule = await $('section[aria-label="E2E 精力任务视图 视图"]');
    await energyModule.waitForExist({ timeout: 15_000 });
    const recommendation = await energyModule.$('.think-energy-task-list__recommendation');
    await recommendation.waitForClickable({ timeout: 10_000 });
    expect(await recommendation.getText()).toContain('V6 精力推荐任务');
    await recommendation.click();

    await browser.waitUntil(async () => browser.executeObsidian(({ app }, pluginId, taskId) => {
      const plugin = (app as any).plugins.plugins[pluginId] as any;
      return (plugin.serviceManager.useCases.timer.getTimers?.() || []).some((timer: any) => timer.taskId === taskId && timer.status !== 'stopped');
    }, THINK_PLUGIN_ID, expectedTaskId), {
      timeout: 10_000,
      interval: 200,
      timeoutMsg: '点击精力推荐任务后没有启动对应 Timer。',
    });
  });
});
