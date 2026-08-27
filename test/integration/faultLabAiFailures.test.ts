/**
 * 测试覆盖声明（测试体系审计使用，不代表执行已通过）
 * @covers F070/error
 * @covers F070/regression
 * @covers F072/error
 * @covers F074/error
 * @covers F075/error
 * @fault FL-AI-001
 * @fault FL-AI-002
 * @fault FL-AI-003
 * @fault FL-AI-004
 * @fault FL-AI-005
 */
import { AiHttpClient, type AiHttpResponse, type AiHttpTransport } from '@/core/ai/AiHttpClient';

function 响应(input: Partial<AiHttpResponse> & { json?: () => Promise<any>; text?: () => Promise<string> }): AiHttpResponse {
  return {
    ok: true,
    status: 200,
    statusText: 'OK',
    headers: new Headers({ 'content-type': 'application/json' }),
    text: async () => '',
    json: async () => ({}),
    ...input,
  } as AiHttpResponse;
}

function 请求参数(timeoutMs = 1000) {
  return {
    baseURL: 'https://故障实验室.invalid/v1',
    apiKey: 'test-key',
    model: 'test-model',
    temperature: 0,
    max_tokens: 100,
    messages: [{ role: 'user' as const, content: '测试' }],
    timeoutMs,
  };
}

function 等待取消传输(): AiHttpTransport {
  return {
    request: async (_url, init) => await new Promise<AiHttpResponse>((_resolve, reject) => {
      const signal = init.signal;
      const fail = () => {
        const error = new Error('请求已取消');
        error.name = 'AbortError';
        reject(error);
      };
      if (signal?.aborted) fail();
      else signal?.addEventListener('abort', fail, { once: true });
    }),
  };
}

describe('v9 故障实验室：AI 传输与异常响应', () => {
  it('HTTP 429限流时返回明确状态码错误，不产生假成功内容', async () => {
    const transport: AiHttpTransport = {
      request: async () => 响应({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
        text: async () => '请求过于频繁，请稍后重试。'.repeat(30),
      }),
    };
    const client = new AiHttpClient(transport);
    let failure: unknown;
    try {
      await client.chatCompletion(请求参数());
    } catch (error) {
      failure = error;
    }

    expect(failure).toBeInstanceOf(Error);
    expect((failure as Error).message).toMatch(/AI HTTP 429:/);
    expect((failure as Error).message.length).toBeLessThanOrEqual(220);
  });

  it('HTTP成功但JSON本身损坏时把解析错误向上返回，不伪装成空结果', async () => {
    jest.useFakeTimers();
    try {
      const transport: AiHttpTransport = {
        request: async () => 响应({
          json: async () => { throw new SyntaxError('故障实验室：响应JSON损坏'); },
        }),
      };
      const client = new AiHttpClient(transport);

      await expect(client.chatCompletion(请求参数())).rejects.toThrow('故障实验室：响应JSON损坏');
      expect(jest.getTimerCount()).toBe(0);
    } finally {
      jest.useRealTimers();
    }
  });

  it('响应没有message.content时明确拒绝空内容', async () => {
    const transport: AiHttpTransport = {
      request: async () => 响应({ json: async () => ({ choices: [{ message: { content: '' } }] }) }),
    };
    const client = new AiHttpClient(transport);

    await expect(client.chatCompletion(请求参数())).rejects.toThrow('AI returned empty content');
  });

  it('超过timeoutMs时通过内部AbortController取消请求并返回AbortError', async () => {
    jest.useFakeTimers();
    try {
      const client = new AiHttpClient(等待取消传输());
      const promise = client.chatCompletion(请求参数(50));
      const assertion = expect(promise).rejects.toMatchObject({ name: 'AbortError' });
      await jest.advanceTimersByTimeAsync(60);
      await assertion;
      expect(jest.getTimerCount()).toBe(0);
    } finally {
      jest.useRealTimers();
    }
  });

  it('外部AbortSignal触发时立即级联取消，不等待内部超时', async () => {
    jest.useFakeTimers();
    try {
      const client = new AiHttpClient(等待取消传输());
      const controller = new AbortController();
      const promise = client.chatCompletion({ ...请求参数(10_000), signal: controller.signal });
      const assertion = expect(promise).rejects.toMatchObject({ name: 'AbortError' });

      controller.abort();

      await assertion;
      expect(jest.getTimerCount()).toBe(0);
    } finally {
      jest.useRealTimers();
    }
  });
});
