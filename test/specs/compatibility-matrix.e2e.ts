/**
 * 测试覆盖声明（测试体系审计使用，不代表执行已通过）
 * @covers F133/e2e
 * @covers F133/regression
 */
import { browser } from '@wdio/globals';
import { THINK_PLUGIN_ID, clearE2EState, waitForThinkReady } from './support/thinkE2e';

describe('Think OS 真机兼容：Obsidian 版本矩阵', () => {
  it('当前矩阵版本能够加载插件、注册核心命令并完成一次真实 Goal 写入', async () => {
    await waitForThinkReady(60_000);
    await clearE2EState();

    const result = await browser.executeObsidian(async ({ app }, pluginId) => {
      const plugin = (app as any).plugins.plugins[pluginId] as any;
      const manager = plugin.serviceManager;
      await manager.useCases.goal.addGoal({ path: 'E2E' });
      await manager.useCases.goal.addGoal({ path: 'E2E/兼容矩阵' });
      const settings = manager.settingsRepository.getSettings();
      return {
        appVersion: String((app as any).version || '未知'),
        commandReady: Boolean((app as any).commands?.commands?.[`${pluginId}:think-open-control-center`]),
        goalReady: (settings.goalSettings.goals || []).some((goal: any) => goal.path === 'E2E/兼容矩阵'),
        status: manager.getLoadingStatus?.(),
      };
    }, THINK_PLUGIN_ID);

    console.log(`【兼容矩阵】当前 Obsidian 版本：${result.appVersion}`);
    expect(result.commandReady).toBe(true);
    expect(result.goalReady).toBe(true);
    expect(result.status).toMatchObject({ coreLoaded: true, dataLoaded: true, uiLoaded: true });
  });
});
