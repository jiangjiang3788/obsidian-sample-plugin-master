/**
 * 测试覆盖声明（测试体系审计使用，不代表执行已通过）
 * @covers F075/integration
 */
const mockGetZustandState = jest.fn((store: any, selector: (state: any) => unknown) => selector(store.getState()));

jest.mock('@/app/public', () => ({
  getZustandState: (store: unknown, selector: (state: unknown) => unknown) => mockGetZustandState(store, selector),
}));

import { AiHttpClient, type AiHttpTransport } from '@/core/ai/AiHttpClient';
import { createAiSpeedTestCommand } from '@/features/aiinput/aiSpeedTestCommand';
import { createTakeLatest } from '@/shared/utils/takeLatest';

function makeStore() {
  return {
    getState: () => ({
      settings: {
        aiSettings: {
          enabled: true,
          apiEndpoint: 'https://local.test/v1/',
          apiKey: 'integration-key',
          model: 'integration-model',
          requestTimeoutMs: 5000,
        },
        goalSettings: { goals: [], goalTemplates: [] },
      },
    }),
  } as any;
}

describe('AI 接口测速组合链路', () => {
  it('测速命令经过真实 AiHttpClient 和 takeLatest 到达传输层，并正确处理 OpenAI 兼容响应', async () => {
    let requestUrl = '';
    let requestInit: RequestInit | undefined;
    const transport: AiHttpTransport = {
      request: jest.fn(async (url, init) => {
        requestUrl = url;
        requestInit = init;
        return {
          ok: true,
          status: 200,
          statusText: 'OK',
          headers: { get: () => 'application/json' } as any,
          text: async () => '',
          json: async () => ({
            choices: [{ message: { content: '{"ok":true}' } }],
          }),
        } as any;
      }),
    };
    const http = new AiHttpClient(transport);
    const takeLatest = createTakeLatest('v7-ai-speed-test');
    const notices: string[] = [];
    const run = createAiSpeedTestCommand({
      store: makeStore(),
      http,
      takeLatest,
      ui: {
        notice(message: string) {
          notices.push(message);
          return { hide() {}, setMessage() {} };
        },
      },
    });

    await run();

    expect(requestUrl).toBe('https://local.test/v1/chat/completions');
    expect(requestInit?.method).toBe('POST');
    expect(String(requestInit?.body)).toContain('integration-model');
    expect(notices.some((message) => message.includes('智能助手接口测速完成'))).toBe(true);
    takeLatest.dispose();
  });
});
