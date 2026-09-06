/**
 * 测试覆盖声明（测试体系审计使用，不代表执行已通过）
 * @covers F001/e2e
 * @covers F001/restart
 * @covers F002/e2e
 * @covers F130/e2e
 * @covers F130/regression
 */
import { browser } from '@wdio/globals';
import { obsidianPage } from 'wdio-obsidian-service';
import { THINK_PLUGIN_ID, getRuntimeSnapshot, waitForThinkReady } from './support/thinkE2e';

describe('Think OS 真机：插件生命周期', () => {
  before(async () => {
    await waitForThinkReady();
  });

  it('真实 Obsidian 中核心服务与关键命令均已注册', async () => {
    const snapshot: any = await getRuntimeSnapshot();
    expect(snapshot.loaded).toBe(true);
    expect(snapshot.loadingStatus).toMatchObject({ coreLoaded: true, dataLoaded: true, uiLoaded: true, timerLoaded: true });
    expect(snapshot.commandIds).toEqual(expect.arrayContaining([
      'think-os:think-rebuild-index',
      'think-os:think-open-control-center',
      'think-os:think-open-ai-chat',
      'think-os:toggle-think-floating-timer',
      'think-os:think-quick-input-unified-core.task',
    ]));
  });

  it('插件禁用后清理，重新启用后能再次完整启动', async () => {
    await obsidianPage.disablePlugin(THINK_PLUGIN_ID);
    await browser.waitUntil(async () => browser.executeObsidian(({ app }, id) => !(app as any).plugins?.plugins?.[id], THINK_PLUGIN_ID), {
      timeout: 10_000,
      interval: 250,
      timeoutMsg: 'Think OS 未能完成卸载。',
    });

    await obsidianPage.enablePlugin(THINK_PLUGIN_ID);
    await waitForThinkReady();
    const snapshot: any = await getRuntimeSnapshot();
    expect(snapshot.loaded).toBe(true);
    expect(snapshot.loadingStatus.timerLoaded).toBe(true);
  });
});
