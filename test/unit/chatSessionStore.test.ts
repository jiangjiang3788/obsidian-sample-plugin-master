/**
 * 测试覆盖声明（测试体系审计使用，不代表执行已通过）
 * @covers F077/error
 * @covers F077/unit
 * @fault FL-CHAT-001
 */
import { ChatSessionStore } from '@/core/ai/ChatSessionStore';
import type { IPluginStorage } from '@/core/services/StorageService';

function memoryStorage(initial: Record<string, unknown> = {}) {
  const files = new Map<string, unknown>(Object.entries(initial));
  const storage: IPluginStorage = {
    readJSON: async <T,>(path: string) => files.has(path) ? JSON.parse(JSON.stringify(files.get(path))) as T : null,
    writeJSON: jest.fn(async (path, value) => { files.set(path, JSON.parse(JSON.stringify(value))); }),
    remove: jest.fn(async (path) => { files.delete(path); }),
  };
  return { files, storage };
}

describe('ChatSessionStore', () => {
  beforeEach(() => localStorage.clear());

  it('创建会话、添加消息、更新过滤器和删除都写入同一 JSON 存储', async () => {
    const h = memoryStorage();
    const store = new ChatSessionStore(h.storage);
    await store.initialize();
    const session = await store.createSession('测试会话', { goalPaths: ['健康'] });
    const user = await store.appendMessage(session.id, 'user', '你好');
    const assistant = await store.appendMessage(session.id, 'assistant', '**你好**', { model: 'test-model' });
    await store.updateSession(session.id, { filters: { recordTypes: ['task'] } });

    expect(user?.contentType).toBe('plain');
    expect(assistant?.contentType).toBe('markdown');
    expect(store.getMessages(session.id)).toHaveLength(2);
    expect(store.getSession(session.id)?.filters).toEqual({ recordTypes: ['task'] });
    expect(h.storage.writeJSON).toHaveBeenCalled();

    expect(await store.deleteSession(session.id)).toBe(true);
    expect(store.getSession(session.id)).toBeUndefined();
  });

  it('损坏 JSON 会备份为 corrupt 文件并安全回到空会话，而不是让整个 Store 初始化失败', async () => {
    const bad = { version: 99, sessions: 'broken' };
    const h = memoryStorage({ 'Think/chat-sessions.json': bad });
    const store = new ChatSessionStore(h.storage);
    await expect(store.initialize()).resolves.toBeUndefined();
    expect(store.listSessions()).toEqual([]);
    expect(h.files.get('Think/chat-sessions.corrupt.json')).toEqual(bad);
  });
});
