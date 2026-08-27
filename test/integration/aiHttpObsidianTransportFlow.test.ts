/**
 * 测试覆盖声明（测试体系审计使用，不代表执行已通过）
 * @covers F070/integration
 * @covers F070/regression
 */
import { requestUrl } from 'obsidian';
import { AiHttpClient } from '@/core/ai/AiHttpClient';
import { ObsidianAiHttpTransport } from '@/platform/obsidian/ObsidianAiHttpTransport';

const requestUrlMock = requestUrl as jest.MockedFunction<typeof requestUrl>;

describe('AI HTTP 客户端与 Obsidian 传输层组合', () => {
  beforeEach(() => requestUrlMock.mockReset());

  it('模型列表请求经过真实客户端与 Obsidian transport 后完成去重和排序', async () => {
    requestUrlMock.mockResolvedValue({
      status: 200,
      headers: { 'content-type': 'application/json' },
      text: JSON.stringify({ data: [{ id: 'z-model' }, { id: 'a-model' }, { id: 'a-model' }] }),
      json: { data: [{ id: 'z-model' }, { id: 'a-model' }, { id: 'a-model' }] },
    } as any);

    const client = new AiHttpClient(new ObsidianAiHttpTransport());
    await expect(client.listModels({
      baseURL: 'https://example.invalid/v1/', apiKey: 'secret', timeoutMs: 1000,
    })).resolves.toEqual(['a-model', 'z-model']);

    expect(requestUrlMock).toHaveBeenCalledWith(expect.objectContaining({
      url: 'https://example.invalid/v1/models',
      method: 'GET',
      headers: expect.objectContaining({ Authorization: 'Bearer secret' }),
    }));
  });

  it('非 2xx 响应经过两层边界后仍保留状态码与服务端摘要', async () => {
    requestUrlMock.mockResolvedValue({
      status: 429,
      headers: {},
      text: '请求过于频繁',
      json: {},
    } as any);
    const client = new AiHttpClient(new ObsidianAiHttpTransport());

    await expect(client.listModels({
      baseURL: 'https://example.invalid/v1', apiKey: 'secret', timeoutMs: 1000,
    })).rejects.toThrow('AI HTTP 429: 请求过于频繁');
  });
});
