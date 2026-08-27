/**
 * 测试覆盖声明（测试体系审计使用，不代表执行已通过）
 * @covers F070/unit
 */
import { AiHttpClient } from '@core/ai/AiHttpClient';
import type { AiHttpResponse, AiHttpTransport } from '@core/ai/AiHttpClient';

function makeResponse(payload: unknown, status = 200, text?: string): AiHttpResponse {
    const bodyText = text ?? JSON.stringify(payload);
    return {
        ok: status >= 200 && status < 300,
        status,
        statusText: '',
        headers: { get: () => 'application/json' } as Headers,
        text: async () => bodyText,
        json: async () => payload,
    };
}

describe('AiHttpClient.listModels', () => {
    it('requests /models with bearer auth and normalizes OpenAI data items', async () => {
        const request = jest.fn(async () => makeResponse({
            data: [
                { id: 'gpt-4o-mini' },
                { id: 'gemini-3-flash-preview' },
                { id: 'gpt-4o-mini' },
            ],
        }));
        const transport: AiHttpTransport = { request };
        const client = new AiHttpClient(transport);

        const models = await client.listModels({
            baseURL: 'https://example.com/v1/',
            apiKey: 'secret-key',
            timeoutMs: 30000,
        });

        expect(models).toEqual(['gemini-3-flash-preview', 'gpt-4o-mini']);
        expect(request).toHaveBeenCalledTimes(1);
        expect(request).toHaveBeenCalledWith(
            'https://example.com/v1/models',
            expect.objectContaining({
                method: 'GET',
                headers: {
                    Accept: 'application/json',
                    Authorization: 'Bearer secret-key',
                },
            }),
        );
    });

    it('accepts common proxy shapes and item name/model fields', async () => {
        const transport: AiHttpTransport = {
            request: jest.fn(async () => makeResponse({
                models: [
                    'model-a',
                    { name: 'model-b' },
                    { model: 'model-c' },
                    { id: 'model-d' },
                ],
            })),
        };
        const client = new AiHttpClient(transport);

        await expect(client.listModels({
            baseURL: 'https://example.com/v1',
            apiKey: 'key',
            timeoutMs: 30000,
        })).resolves.toEqual(['model-a', 'model-b', 'model-c', 'model-d']);
    });

    it('surfaces non-2xx response details', async () => {
        const transport: AiHttpTransport = {
            request: jest.fn(async () => makeResponse({}, 401, 'invalid api key')),
        };
        const client = new AiHttpClient(transport);

        await expect(client.listModels({
            baseURL: 'https://example.com/v1',
            apiKey: 'bad-key',
            timeoutMs: 30000,
        })).rejects.toThrow('AI HTTP 401: invalid api key');
    });
});
