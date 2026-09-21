/**
 * 测试覆盖声明（测试体系审计使用，不代表执行已通过）
 * @covers F078/e2e
 */
import { $, browser } from '@wdio/globals';
import { THINK_PLUGIN_ID, waitForThinkReady } from './support/thinkE2e';

describe('Think OS 真机 UI：AI Chat', () => {
  beforeEach(async () => {
    await waitForThinkReady();
    await browser.executeObsidian(async ({ app }, pluginId) => {
      const plugin = (app as any).plugins.plugins[pluginId] as any;
      const repository = plugin.serviceManager.settingsRepository;
      await repository.update((draft: any) => {
        draft.aiSettings = {
          ...(draft.aiSettings || {}), enabled: true, apiEndpoint: 'https://example.invalid/v1', apiKey: '', model: 'e2e-model', requestTimeoutMs: 100,
        };
      });
    }, THINK_PLUGIN_ID);
  });

  it('真实命令打开 AI Chat，新建会话后输入区从禁用变为可输入，并展示检索过滤器', async () => {
    await browser.executeObsidianCommand('think-os:think-open-ai-chat');
    const root = await $('.think-ai-chat');
    await root.waitForExist({ timeout: 10_000 });
    expect(await $('[aria-label="智能助手对话列表"]').isExisting()).toBe(true);

    const newSession = await $('//button[contains(normalize-space(),"新建对话")]');
    await newSession.click();
    const textarea = await $('.think-ai-chat textarea');
    await textarea.waitForEnabled({ timeout: 5_000 });
    await textarea.setValue('真机输入但不发送');
    expect(await textarea.getValue()).toBe('真机输入但不发送');
    expect(await $('.think-ai-chat [role="combobox"]').isExisting()).toBe(true);
    expect(await $('button[aria-label="发送"]').isExisting()).toBe(true);
  });
});
