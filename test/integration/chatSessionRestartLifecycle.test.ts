/**
 * 测试覆盖声明（测试体系审计使用，不代表执行已通过）
 * @covers F077/integration
 * @covers F077/persistence
 * @covers F077/restart
 */
import { ChatSessionStore } from '@/core/ai/ChatSessionStore';
import type { IPluginStorage } from '@/core/services/StorageService';

function persistentMemoryStorage() {
  const files = new Map<string, unknown>();
  const storage: IPluginStorage = {
    readJSON: async <T,>(path: string) => files.has(path) ? JSON.parse(JSON.stringify(files.get(path))) as T : null,
    writeJSON: jest.fn(async (path, value) => { files.set(path, JSON.parse(JSON.stringify(value))); }),
    remove: jest.fn(async (path) => { files.delete(path); }),
  };
  return { files, storage };
}

describe('P1 AI Chat 会话持久化与重启', () => {
  it('新 Store 实例能恢复会话、消息、过滤条件和消息类型', async () => {
    const h = persistentMemoryStorage();
    const first = new ChatSessionStore(h.storage);
    await first.initialize();
    const session = await first.createSession('重启测试', { goalPaths: ['学习'] });
    await first.appendMessage(session.id, 'user', '第一条问题');
    await first.appendMessage(session.id, 'assistant', '# 第一条回答', { model: 'mock' });
    first.dispose();

    const restarted = new ChatSessionStore(h.storage);
    await restarted.initialize();
    const restored = restarted.getSession(session.id);
    expect(restored?.filters).toEqual({ goalPaths: ['学习'] });
    expect(restored?.messages.map((m) => [m.role, m.contentType])).toEqual([
      ['user', 'plain'],
      ['assistant', 'markdown'],
    ]);
  });
});
