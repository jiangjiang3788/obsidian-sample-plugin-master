import { requestUrl } from 'obsidian';
import type { AiHttpResponse, AiHttpTransport } from '@core/public';

function createAbortError(): Error {
    try {
        return new DOMException('The operation was aborted.', 'AbortError');
    } catch {
        const error = new Error('The operation was aborted.');
        error.name = 'AbortError';
        return error;
    }
}

function throwIfAborted(signal?: AbortSignal | null): void {
    if (signal?.aborted) throw createAbortError();
}

function raceWithAbort<T>(promise: Promise<T>, signal?: AbortSignal | null): Promise<T> {
    if (!signal) return promise;
    throwIfAborted(signal);

    return new Promise<T>((resolve, reject) => {
        let settled = false;
        const cleanup = () => {
            try {
                signal.removeEventListener('abort', onAbort);
            } catch {
                // ignore: very old polyfills may not implement removeEventListener
            }
        };
        const onAbort = () => {
            if (settled) return;
            settled = true;
            cleanup();
            reject(createAbortError());
        };

        try {
            signal.addEventListener('abort', onAbort, { once: true });
        } catch {
            // If addEventListener is not supported, the preflight abort check above is still useful.
        }

        promise.then(
            (value) => {
                if (settled) return;
                settled = true;
                cleanup();
                resolve(value);
            },
            (error) => {
                if (settled) return;
                settled = true;
                cleanup();
                reject(error);
            }
        );
    });
}

function normalizeRequestHeaders(headers: HeadersInit | undefined): Record<string, string> {
    if (!headers) return {};
    const result: Record<string, string> = {};

    if (typeof Headers !== 'undefined' && headers instanceof Headers) {
        headers.forEach((value, key) => {
            result[key] = value;
        });
        return result;
    }

    if (Array.isArray(headers)) {
        for (const [key, value] of headers) result[key] = value;
        return result;
    }

    for (const [key, value] of Object.entries(headers)) {
        result[key] = String(value);
    }
    return result;
}

function normalizeRequestBody(body: BodyInit | null | undefined): string | ArrayBuffer | undefined {
    if (body == null) return undefined;
    if (typeof body === 'string') return body;
    if (typeof ArrayBuffer !== 'undefined' && body instanceof ArrayBuffer) return body;
    if (typeof URLSearchParams !== 'undefined' && body instanceof URLSearchParams) return body.toString();
    return String(body);
}

function makeHeadersLike(headers: Record<string, string> | undefined): Headers {
    const lookup = new Map<string, string>();
    for (const [key, value] of Object.entries(headers ?? {})) {
        lookup.set(key.toLowerCase(), String(value));
    }

    return {
        get(name: string): string | null {
            return lookup.get(name.toLowerCase()) ?? null;
        },
    } as Headers;
}

/**
 * AI HTTP transport backed by Obsidian's requestUrl.
 *
 * Why this exists:
 * - requestUrl is the Obsidian-supported HTTP API and avoids desktop/mobile fetch differences.
 * - Core still depends only on AiHttpTransport, so tests and non-Obsidian adapters can inject fetch/mocks.
 * - requestUrl itself has no hard cancel primitive, so we race it against AbortSignal for caller-visible cancellation.
 */
function asAbortSignal(signal: RequestInit['signal']): AbortSignal | undefined {
    if (signal && typeof (signal as AbortSignal).aborted === 'boolean') return signal as AbortSignal;
    return undefined;
}

export class ObsidianAiHttpTransport implements AiHttpTransport {
    async request(url: string, init: RequestInit): Promise<AiHttpResponse> {
        const signal = asAbortSignal(init.signal);
        throwIfAborted(signal);

        const response = await raceWithAbort(
            requestUrl({
                url,
                method: String(init.method ?? 'GET'),
                headers: normalizeRequestHeaders(init.headers),
                body: normalizeRequestBody(init.body),
            }),
            signal
        );

        const status = response.status ?? 200;
        const text = typeof response.text === 'string' ? response.text : '';
        const headers = makeHeadersLike(response.headers);
        const statusText = typeof (response as { statusText?: unknown }).statusText === 'string'
            ? (response as { statusText: string }).statusText
            : '';

        return {
            ok: status >= 200 && status < 300,
            status,
            statusText,
            headers,
            text: async () => text,
            json: async () => {
                if (response.json != null) return response.json;
                if (!text) return null;
                return JSON.parse(text);
            },
        };
    }
}
