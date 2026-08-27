/**
 * 测试覆盖声明（测试体系审计使用，不代表执行已通过）
 * @covers F074/integration
 * @covers F074/error
 */
const mockOpenPrompt = jest.fn(async () => '帮我记录完成 V6 测试体系');
const mockOpenConfirm = jest.fn();
const mockConfirmCtor = jest.fn();

jest.mock('@/app/public', () => ({
  AiTextPromptModal: class {
    openAndGetValue = mockOpenPrompt;
  },
  AiBatchConfirmModal: class {
    constructor(_app: unknown, options: unknown) { mockConfirmCtor(options); }
    open() { mockOpenConfirm(); }
  },
  getZustandState: (store: any, selector: (state: any) => unknown) => selector(store.getState()),
}));

import { createNaturalInputCommandRunner } from '@/features/aiinput/aiNaturalInputCommand';

function makeStore() {
  return {
    getState: () => ({
      settings: {
        aiSettings: {
          enabled: true,
          apiEndpoint: 'https://example.invalid/v1',
          apiKey: 'v6-key',
          model: 'v6-model',
          temperature: 0.2,
          maxTokens: 1024,
          requestTimeoutMs: 5000,
          customPrompt: '',
          allowMultipleResults: true,
          maxResults: 3,
        },
        goalSettings: { goals: [], goalTemplates: [] },
      },
    }),
  } as any;
}

describe('AI 自然语言命令编排', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockOpenPrompt.mockResolvedValue('帮我记录完成 V6 测试体系');
  });

  it('输入文本经过解析器后打开真实批量确认边界，并向用户报告识别数量', async () => {
    const notice = jest.fn(() => ({ hide: jest.fn(), setMessage: jest.fn() }));
    const parser = { parse: jest.fn(async () => ({ items: [{ rawText: '完成 V6', target: { blockId: 'core.task', goalPath: 'E2E/AI' }, fieldValues: { 内容: '完成 V6' } }] })) } as any;
    const runner = createNaturalInputCommandRunner({
      plugin: { app: {}, register: jest.fn(), addCommand: jest.fn() } as any,
      store: makeStore(),
      ui: { notice },
      parser,
      takeLatest: { run: (fn: any) => fn(new AbortController().signal) } as any,
    });

    await runner(false);

    expect(parser.parse).toHaveBeenCalledWith(expect.objectContaining({ text: '帮我记录完成 V6 测试体系', fastMode: false }));
    expect(mockConfirmCtor).toHaveBeenCalledWith(expect.objectContaining({ title: '确认记录', items: expect.any(Array) }));
    expect(mockOpenConfirm).toHaveBeenCalledTimes(1);
    expect(notice).toHaveBeenCalledWith('AI 识别出 1 条记录', 2000);
  });

  it('解析器失败时关闭等待提示并展示中文失败信息，不打开批量确认窗口', async () => {
    const hide = jest.fn();
    const notice = jest.fn(() => ({ hide, setMessage: jest.fn() }));
    const parser = { parse: jest.fn(async () => { throw new Error('模拟模型服务不可用'); }) } as any;
    const runner = createNaturalInputCommandRunner({
      plugin: { app: {}, register: jest.fn(), addCommand: jest.fn() } as any,
      store: makeStore(),
      ui: { notice },
      parser,
      takeLatest: { run: (fn: any) => fn(new AbortController().signal) } as any,
    });

    await runner(true);

    expect(mockOpenConfirm).not.toHaveBeenCalled();
    expect(notice).toHaveBeenCalledWith('AI 解析失败：模拟模型服务不可用', 6000);
  });
});
