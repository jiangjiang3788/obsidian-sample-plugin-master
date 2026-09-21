/**
 * 测试覆盖声明（测试体系审计使用，不代表执行已通过）
 * @covers F075/unit
 * @covers F075/error
 */
const mockGetZustandState = jest.fn((store: any, selector: (state: any) => unknown) => selector(store.getState()));

jest.mock('@/app/public', () => ({
  getZustandState: (store: unknown, selector: (state: unknown) => unknown) => mockGetZustandState(store, selector),
}));

import { createAiSpeedTestCommand } from '@/features/aiinput/aiSpeedTestCommand';
import { CancelledError } from '@/shared/utils/takeLatest';

function makeStore(overrides: Record<string, unknown> = {}) {
  return {
    getState: () => ({
      settings: {
        aiSettings: {
          enabled: true,
          apiEndpoint: 'https://example.test/v1',
          apiKey: 'test-key',
          model: 'test-model',
          requestTimeoutMs: 12_000,
          ...overrides,
        },
        goalSettings: { goals: [], goalTemplates: [] },
      },
    }),
  } as any;
}

function makeUi() {
  const hide = jest.fn();
  const setMessage = jest.fn();
  const notice = jest.fn((_message: string, _timeoutMs?: number) => ({ hide, setMessage }));
  return { ui: { notice } as any, notice, hide, setMessage };
}

function immediateTakeLatest() {
  return {
    run: (fn: (signal: AbortSignal) => Promise<unknown>) => fn(new AbortController().signal),
    cancel: jest.fn(),
    dispose: jest.fn(),
    signal: null,
  } as any;
}

describe('AI 接口测速命令', () => {
  it('配置完整时使用固定小请求测速，并向用户显示中文成功结果', async () => {
    const { ui, notice, hide } = makeUi();
    const http = { chatCompletion: jest.fn(async () => '{"ok":true}') } as any;
    const run = createAiSpeedTestCommand({
      store: makeStore(),
      ui,
      http,
      takeLatest: immediateTakeLatest(),
    });

    await run();

    expect(http.chatCompletion).toHaveBeenCalledWith(expect.objectContaining({
      baseURL: 'https://example.test/v1',
      apiKey: 'test-key',
      model: 'test-model',
      temperature: 0,
      max_tokens: 64,
      timeoutMs: 12_000,
      messages: expect.arrayContaining([
        expect.objectContaining({ role: 'user', content: 'Return exactly: {"ok":true}' }),
      ]),
    }));
    expect(hide).toHaveBeenCalled();
    expect(notice.mock.calls.some(([message]) => String(message).includes('智能助手接口测速完成'))).toBe(true);
  });

  it('AI 未启用或配置不完整时不发送网络请求，并给出中文配置提示', async () => {
    const { ui, notice } = makeUi();
    const http = { chatCompletion: jest.fn() } as any;
    const run = createAiSpeedTestCommand({
      store: makeStore({ enabled: false, apiKey: '' }),
      ui,
      http,
      takeLatest: immediateTakeLatest(),
    });

    await run();

    expect(http.chatCompletion).not.toHaveBeenCalled();
    expect(notice).toHaveBeenCalledWith('AI 快速记录未启用，请在设置中开启', 4000);
  });

  it('接口失败时关闭等待提示并显示中文失败原因', async () => {
    const { ui, notice, hide } = makeUi();
    const http = { chatCompletion: jest.fn(async () => { throw new Error('模拟接口不可用'); }) } as any;
    const run = createAiSpeedTestCommand({
      store: makeStore(),
      ui,
      http,
      takeLatest: immediateTakeLatest(),
    });

    await run();

    expect(hide).toHaveBeenCalled();
    expect(notice).toHaveBeenCalledWith('AI 接口测速失败：模拟接口不可用', 6000);
  });

  it('被新请求取消时只结束当前测速，不把取消伪装成接口故障', async () => {
    const { ui, notice, hide } = makeUi();
    const run = createAiSpeedTestCommand({
      store: makeStore(),
      ui,
      http: { chatCompletion: jest.fn() } as any,
      takeLatest: { run: jest.fn(async () => { throw new CancelledError('测试取消'); }) } as any,
    });

    await run();

    expect(hide).toHaveBeenCalled();
    expect(notice.mock.calls.some(([message]) => String(message).includes('测速失败'))).toBe(false);
  });
});
