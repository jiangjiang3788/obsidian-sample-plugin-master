/**
 * 测试覆盖声明（测试体系审计使用，不代表执行已通过）
 * @covers F078/ui
 * @covers F078/error
 */
/** @jsxImportSource preact */
import { h, render } from 'preact';
import { act } from 'preact/test-utils';
import { createRef } from 'preact';
import { useState } from 'preact/hooks';

const mockRenderMessage = jest.fn(async ({ containerEl, content }: any) => { containerEl.textContent = content; });
const mockClearMessage = jest.fn((containerEl: HTMLElement) => { containerEl.textContent = ''; });
jest.mock('@/app/public', () => ({
  useMessageRenderPort: () => ({ renderMessage: mockRenderMessage, clear: mockClearMessage }),
}));

import { AiChatModalView } from '@/features/aichat/AiChatModalView';
import { inputText, waitForUi } from '../support/uiTestUtils';

function props(overrides: Record<string, any> = {}): any {
  return {
    closeModal: jest.fn(), sessions: [{ id: 's1', title: '测试会话', created: 1, modified: 1, messages: [] }],
    currentSessionId: 's1', currentSessionTitle: '测试会话', onNewSession: jest.fn(), onSelectSession: jest.fn(), onDeleteSession: jest.fn(),
    enableRetrieval: true, setEnableRetrieval: jest.fn(), goals: ['工作'], selectedGoalPath: '', setSelectedGoalPath: jest.fn(), selectedType: '', setSelectedType: jest.fn(),
    recordTypes: [{ id: 'core.task', name: '任务' }], selectedRecordTypeId: '', setSelectedRecordTypeId: jest.fn(), indexItemCount: 3,
    messages: [{ id: 'm1', role: 'assistant', content: '你好', contentType: 'markdown', created: 1 }], isLoading: false,
    messagesEndRef: createRef(), error: null, inputText: '', setInputText: jest.fn(), onKeyDown: jest.fn(), onSend: jest.fn(), composerDisabled: false,
    composerPlaceholder: '输入消息...', emptyHint: { title: '开始新的对话', retrievalHint: '检索已开启' }, ...overrides,
  };
}

function ControlledHarness({ base, onSend }: { base: any; onSend: jest.Mock }) {
  const [input, setInput] = useState('');
  return <AiChatModalView {...base} inputText={input} setInputText={setInput} onSend={onSend} />;
}

describe('AI Chat 视图', () => {
  let host: HTMLDivElement;
  beforeEach(() => { host = document.createElement('div'); document.body.appendChild(host); });
  afterEach(() => { render(null, host); host.remove(); });

  it('同时展示会话列表、过滤区域、历史消息和可发送输入区', async () => {
    const onSend = jest.fn();
    const p = props();
    await act(async () => render(<ControlledHarness base={p} onSend={onSend} />, host));
    expect(host.querySelector('[aria-label="智能助手对话列表"]')).toBeTruthy();
    expect(host.textContent).toContain('测试会话');
    expect(host.textContent).toContain('你好');

    const textarea = host.querySelector('textarea') as HTMLTextAreaElement;
    await inputText(textarea, '新的问题');
    await waitForUi(() => (host.querySelector('button[aria-label="发送"]') as HTMLButtonElement)?.disabled === false, '输入消息后发送按钮仍被禁用');
    expect((host.querySelector('textarea') as HTMLTextAreaElement).value).toBe('新的问题');

    const send = host.querySelector('button[aria-label="发送"]') as HTMLButtonElement;
    await act(async () => send.click());
    expect(onSend).toHaveBeenCalledTimes(1);
  });

  it('请求失败时使用 role=alert 的可见错误区域，而不是静默吞掉错误', async () => {
    await act(async () => render(<AiChatModalView {...props({ error: '模拟 AI 请求失败' })} />, host));
    const alert = host.querySelector('.think-ai-chat__error[role="alert"]');
    expect(alert?.textContent).toContain('模拟 AI 请求失败');
  });
});
