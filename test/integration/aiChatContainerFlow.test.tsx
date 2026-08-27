/**
 * 测试覆盖声明（测试体系审计使用，不代表执行已通过）
 * @covers F078/integration
 * @covers F078/error
 */
/** @jsxImportSource preact */
import { h, render } from 'preact';
import { act } from 'preact/test-utils';
import { inputText, waitForUi } from '../support/uiTestUtils';

const mockState: any = {
  settings: {
    aiSettings: { enabled: true },
    inputSettings: { blocks: [{ id: 'core.task', name: '任务' }] },
    goalSettings: { goals: [{ path: '工作', status: 'active' }], goalTemplates: [] },
  },
};
jest.mock('@/app/public', () => ({
  selectAiSettings: (state: any) => state.settings.aiSettings,
  selectInputSettings: (state: any) => state.settings.inputSettings,
  selectSettings: (state: any) => state.settings,
  useSelector: (selector: any) => selector(mockState),
  useMessageRenderPort: () => ({
    renderMessage: async ({ containerEl, content }: any) => { containerEl.textContent = content; },
    clear: (containerEl: HTMLElement) => { containerEl.textContent = ''; },
  }),
}));

import { AiChatModalContainer } from '@/features/aichat/AiChatModalContainer';

function createSessionStore() {
  const sessions: any[] = [];
  const listeners = new Set<() => void>();
  const notify = () => listeners.forEach((fn) => fn());
  return {
    sessions,
    getRecentSessions: jest.fn(() => [...sessions]),
    subscribe: jest.fn((fn: () => void) => { listeners.add(fn); return () => listeners.delete(fn); }),
    createSession: jest.fn(async () => {
      const session = { id: `s${sessions.length + 1}`, title: `对话 ${sessions.length + 1}`, created: Date.now(), modified: Date.now(), messages: [] as any[], filters: undefined };
      sessions.unshift(session); notify(); return session;
    }),
    getMessages: jest.fn((id: string) => sessions.find((s) => s.id === id)?.messages || []),
    getSession: jest.fn((id: string) => sessions.find((s) => s.id === id)),
    deleteSession: jest.fn(async (id: string) => { const i = sessions.findIndex((s) => s.id === id); if (i >= 0) sessions.splice(i, 1); notify(); }),
    appendMessage: jest.fn(async (id: string, role: string, content: string, meta?: any) => {
      const session = sessions.find((s) => s.id === id); if (!session) return null;
      const message = { id: `m${session.messages.length + 1}`, role, content, contentType: role === 'user' ? 'plain' : 'markdown', created: Date.now(), meta };
      session.messages.push(message); notify(); return message;
    }),
  };
}

function services(chatImpl: (...args: any[]) => Promise<any>) {
  const sessionStore = createSessionStore();
  return {
    sessionStore,
    retrievalService: { needsRebuild: jest.fn(() => false), buildIndex: jest.fn(), getIndexStats: jest.fn(() => ({ itemCount: 2 })) },
    chatService: { chat: jest.fn(chatImpl) },
  } as any;
}

describe('AI Chat 容器组合流程', () => {
  let host: HTMLDivElement;
  beforeEach(() => {
    (Element.prototype as any).scrollIntoView = jest.fn();
    host = document.createElement('div'); document.body.appendChild(host);
  });
  afterEach(() => { render(null, host); host.remove(); });

  async function createConversation(): Promise<HTMLTextAreaElement> {
    const newSession = [...host.querySelectorAll('button')].find((button) => button.textContent?.includes('新建对话')) as HTMLButtonElement;
    await act(async () => newSession.click());
    await waitForUi(() => {
      const textarea = host.querySelector('textarea') as HTMLTextAreaElement | null;
      return Boolean(textarea && !textarea.disabled);
    }, '新建会话后输入框没有进入可用状态');
    return host.querySelector('textarea') as HTMLTextAreaElement;
  }

  it('新建会话 → 输入用户消息 → AI 回复 → 会话存储收到双方消息', async () => {
    const s = services(async () => ({ content: '组合测试回复', referencedItemIds: [], model: 'fake-model', retrievalCount: 0 }));
    await act(async () => render(<AiChatModalContainer closeModal={jest.fn()} services={s} />, host));
    const textarea = await createConversation();
    await inputText(textarea, '组合测试问题');
    await waitForUi(() => !(host.querySelector('button[aria-label="发送"]') as HTMLButtonElement)?.disabled, '输入后发送按钮仍不可用');

    const send = host.querySelector('button[aria-label="发送"]') as HTMLButtonElement;
    await act(async () => send.click());
    await waitForUi(() => s.chatService.chat.mock.calls.length === 1, 'AI 请求没有发出');
    await waitForUi(() => s.sessionStore.appendMessage.mock.calls.some((call: any[]) => call[1] === 'assistant'), 'AI 回复没有写入会话');
    await waitForUi(() => host.textContent?.includes('组合测试回复') === true, '会话存储更新后 AI 回复没有同步显示到界面');

    expect(s.chatService.chat).toHaveBeenCalledWith(expect.objectContaining({ userMessage: '组合测试问题', enableRetrieval: true }), expect.anything());
    expect(s.sessionStore.appendMessage).toHaveBeenCalledWith(expect.any(String), 'user', '组合测试问题');
    expect(s.sessionStore.appendMessage).toHaveBeenCalledWith(expect.any(String), 'assistant', '组合测试回复', expect.any(Object));
  });

  it('AI 请求失败时保留用户消息、写入系统错误消息，并在 UI 显示错误', async () => {
    const s = services(async () => { throw new Error('模拟服务不可用'); });
    await act(async () => render(<AiChatModalContainer closeModal={jest.fn()} services={s} />, host));
    const textarea = await createConversation();
    await inputText(textarea, '失败问题');
    await waitForUi(() => !(host.querySelector('button[aria-label="发送"]') as HTMLButtonElement)?.disabled, '输入后发送按钮仍不可用');
    await act(async () => (host.querySelector('button[aria-label="发送"]') as HTMLButtonElement).click());

    await waitForUi(() => Boolean(host.querySelector('[role="alert"]')?.textContent?.includes('模拟服务不可用')), 'AI 请求失败后错误区域没有出现');
    await waitForUi(() => s.sessionStore.appendMessage.mock.calls.some((call: any[]) => call[1] === 'system'), 'AI 请求失败后系统错误消息没有写入');
    expect(host.querySelector('[role="alert"]')?.textContent).toContain('模拟服务不可用');
    expect(s.sessionStore.appendMessage).toHaveBeenCalledWith(expect.any(String), 'system', expect.stringContaining('模拟服务不可用'));
  });
});
