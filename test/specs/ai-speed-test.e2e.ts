/**
 * 测试覆盖声明（测试体系审计使用，不代表执行已通过）
 * @covers F075/e2e
 */
import { $$, browser } from '@wdio/globals';
import { THINK_PLUGIN_ID, clearE2EState, waitForThinkReady } from './support/thinkE2e';

async function prepareSpeedTestRuntime(): Promise<void> {
  const endpoint = String(process.env.THINK_E2E_AI_ENDPOINT || '').trim();
  if (!endpoint) throw new Error('缺少本地 AI 测试端点，请通过中文真机运行器执行本测试。');

  await browser.executeObsidian(async ({ app }, pluginId, value) => {
    const plugin = (app as any).plugins.plugins[pluginId] as any;
    const manager = plugin.serviceManager;
    const current = manager.settingsRepository.getSettings().aiSettings || {};
    await manager.useCases.settings.updateAiSettings({
      ...current,
      enabled: true,
      apiEndpoint: value,
      apiKey: 'think-e2e-local-key',
      persistApiKey: true,
      model: 'think-e2e-local-model',
      requestTimeoutMs: 10_000,
    });
  }, THINK_PLUGIN_ID, endpoint);
}

async function waitForNoticeText(fragment: string): Promise<string> {
  let matched = '';
  await browser.waitUntil(async () => {
    for (const notice of await $$('.notice')) {
      const text = await notice.getText();
      if (text.includes(fragment)) {
        matched = text;
        return true;
      }
    }
    return false;
  }, {
    timeout: 15_000,
    interval: 200,
    timeoutMsg: `没有观察到包含“${fragment}”的中文通知。`,
  });
  return matched;
}

describe('Think OS 真机：AI 接口测速', () => {
  beforeEach(async () => {
    await waitForThinkReady();
    await clearE2EState();
    await prepareSpeedTestRuntime();
  });

  it('真实 Obsidian 命令经过本地 OpenAI 兼容服务完成测速，并向用户显示毫秒结果', async () => {
    await browser.executeObsidianCommand('think-os:think-ai-speed-test');
    const text = await waitForNoticeText('智能助手接口测速完成');
    expect(text).toMatch(/\d+ms/);
    expect(text).toContain('接口状态还可以');
  });
});
