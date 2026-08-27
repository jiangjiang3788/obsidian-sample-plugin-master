/**
 * 测试覆盖声明（测试体系审计使用，不代表执行已通过）
 * @covers F077/e2e
 * @covers F077/error
 * @covers F077/persistence
 * @covers F077/restart
 */
import { browser } from '@wdio/globals';
import { obsidianPage } from 'wdio-obsidian-service';
import { THINK_PLUGIN_ID, waitForThinkReady } from './support/thinkE2e';

const FILE = 'Think/chat-sessions.json';

describe('Think OS v4 真机 Runtime：AI Chat 会话存储', () => {
  beforeEach(async () => {
    await waitForThinkReady();
    try { await obsidianPage.delete(FILE); } catch {}
    try { await obsidianPage.delete('Think/chat-sessions.corrupt.json'); } catch {}
    await browser.reloadObsidian();
    await waitForThinkReady();
  });

  it('真实 Vault 中创建会话和消息，重启 Obsidian 后仍可恢复', async () => {
    const created: any = await browser.executeObsidian(async ({ app }, pluginId) => {
      const plugin = (app as any).plugins.plugins[pluginId] as any;
      const store = plugin.serviceManager.chatSessionStore;
      const session = await store.createSession('E2E AI Chat', { goalPaths: ['E2E'] });
      await store.appendMessage(session.id, 'user', 'E2E 用户消息');
      await store.appendMessage(session.id, 'assistant', '**E2E 回答**', { model: 'e2e-model' });
      return { id: session.id };
    }, THINK_PLUGIN_ID);

    expect(await obsidianPage.read(FILE)).toContain('E2E 用户消息');
    await browser.reloadObsidian();
    await waitForThinkReady();

    const restored: any = await browser.executeObsidian(({ app }, pluginId, sessionId) => {
      const plugin = (app as any).plugins.plugins[pluginId] as any;
      const session = plugin.serviceManager.chatSessionStore.getSession(sessionId);
      return session ? {
        title: session.title,
        filters: session.filters,
        messages: session.messages.map((m: any) => ({ role: m.role, content: m.content, contentType: m.contentType })),
      } : null;
    }, THINK_PLUGIN_ID, created.id);

    expect(restored).not.toBeNull();
    expect(restored.filters.goalPaths).toContain('E2E');
    expect(restored.messages).toEqual(expect.arrayContaining([
      expect.objectContaining({ role: 'user', content: 'E2E 用户消息', contentType: 'plain' }),
      expect.objectContaining({ role: 'assistant', content: '**E2E 回答**', contentType: 'markdown' }),
    ]));
  });

  it('真实 Vault 中损坏的会话 JSON 不阻止插件启动，并生成 corrupt 备份', async () => {
    await obsidianPage.write(FILE, JSON.stringify({ version: 999, sessions: 'broken' }));
    await browser.reloadObsidian();
    await waitForThinkReady();

    const count = await browser.executeObsidian(({ app }, pluginId) => {
      const plugin = (app as any).plugins.plugins[pluginId] as any;
      return plugin.serviceManager.chatSessionStore.listSessions().length;
    }, THINK_PLUGIN_ID);
    expect(count).toBe(0);
    const backup = await obsidianPage.read('Think/chat-sessions.corrupt.json');
    expect(backup).toContain('broken');
  });
});
