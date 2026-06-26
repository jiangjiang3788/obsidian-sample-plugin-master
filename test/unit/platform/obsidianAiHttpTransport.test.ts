import { requestUrl } from 'obsidian';
import { ObsidianAiHttpTransport } from '@/platform/ObsidianAiHttpTransport';

const requestUrlMock = requestUrl as jest.MockedFunction<typeof requestUrl>;

describe('ObsidianAiHttpTransport', () => {
    beforeEach(() => {
        requestUrlMock.mockReset();
    });

    it('maps RequestInit to Obsidian requestUrl and returns a fetch-like response', async () => {
        requestUrlMock.mockResolvedValue({
            status: 200,
            headers: { 'content-type': 'application/json' },
            text: '{"ok":true}',
            json: { ok: true },
        } as any);

        const transport = new ObsidianAiHttpTransport();
        const response = await transport.request('https://example.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: 'Bearer token',
            },
            body: '{"messages":[]}',
        });

        expect(requestUrlMock).toHaveBeenCalledWith({
            url: 'https://example.com/v1/chat/completions',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: 'Bearer token',
            },
            body: '{"messages":[]}',
        });
        expect(response.ok).toBe(true);
        expect(response.status).toBe(200);
        expect(response.headers.get('content-type')).toBe('application/json');
        await expect(response.text()).resolves.toBe('{"ok":true}');
        await expect(response.json()).resolves.toEqual({ ok: true });
    });

    it('rejects immediately when the provided AbortSignal is already aborted', async () => {
        const controller = new AbortController();
        controller.abort();

        const transport = new ObsidianAiHttpTransport();

        await expect(
            transport.request('https://example.com/v1/chat/completions', {
                method: 'POST',
                signal: controller.signal,
            })
        ).rejects.toMatchObject({ name: 'AbortError' });
        expect(requestUrlMock).not.toHaveBeenCalled();
    });

    it('falls back to parsing text when requestUrl does not provide json', async () => {
        requestUrlMock.mockResolvedValue({
            status: 200,
            headers: {},
            text: '{"choices":[{"message":{"content":"pong"}}]}',
        } as any);

        const transport = new ObsidianAiHttpTransport();
        const response = await transport.request('https://example.com/v1/chat/completions', { method: 'POST' });

        await expect(response.json()).resolves.toEqual({ choices: [{ message: { content: 'pong' } }] });
    });
});
