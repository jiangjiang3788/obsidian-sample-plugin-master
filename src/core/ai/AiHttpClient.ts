// src/core/ai/AiHttpClient.ts
// OpenAI-Compatible HTTP Client - 支持 Gemini/自建转发等

import { devLog, devWarn } from '../utils/devLogger';

/**
 * OpenAI 聊天消息格式
 */
export type OpenAIChatMessage = {
    role: 'system' | 'user' | 'assistant';
    content: string;
};

/**
 * 聊天完成请求参数
 */
export interface ChatCompletionRequest {
    /** API 端点 baseURL，例如 https://xxx/v1 */
    baseURL: string;
    /** API 密钥 */
    apiKey: string;
    /** 模型名称 */
    model: string;
    /** 温度参数 */
    temperature: number;
    /** 最大 token 数 */
    max_tokens: number;
    /** 消息列表 */
    messages: OpenAIChatMessage[];
    /** 超时时间（毫秒） */
    timeoutMs: number;

    /** 可选：调试链路 ID，用于串联 features/aiinput → parser → http */
    traceId?: string;

    /**
     * 可选：外部取消信号（用于 takeLatest / modal close / unload）
     * - 由调用方控制取消
     * - 仍会叠加 timeoutMs 的超时取消
     */
    signal?: AbortSignal;
}

function nowMs(): number {
    try {
        return performance.now();
    } catch {
        return Date.now();
    }
}

function elapsedMs(start: number): string {
    return `${(nowMs() - start).toFixed(2)}ms`;
}

function summarizeUrl(baseURL: string): string {
    try {
        const url = new URL(baseURL);
        return `${url.protocol}//${url.host}`;
    } catch {
        return '(invalid-url)';
    }
}

function getBodySize(body: string): number {
    try {
        return new Blob([body]).size;
    } catch {
        return body.length;
    }
}

/**
 * AI HTTP 客户端
 * 实现 OpenAI-Compatible API 调用
 */
export class AiHttpClient {
    /**
     * 发送聊天完成请求
     * 
     * @param req 请求参数
     * @returns AI 返回的内容字符串
     */
    async chatCompletion(req: ChatCompletionRequest): Promise<string> {
        const traceId = req.traceId || `ai-http-${Date.now().toString(36)}`;
        const totalStart = nowMs();
        const url = req.baseURL.replace(/\/$/, '') + '/chat/completions';

        const payloadBuildStart = nowMs();
        const requestBody = JSON.stringify({
            model: req.model,
            temperature: req.temperature,
            max_tokens: req.max_tokens,
            messages: req.messages,
        });
        devLog(`[AiInput][${traceId}][HTTP] 请求体构建完成 (${elapsedMs(payloadBuildStart)})`, {
            endpoint: summarizeUrl(req.baseURL),
            model: req.model,
            messageCount: req.messages.length,
            requestChars: requestBody.length,
            requestBytes: getBodySize(requestBody),
            timeoutMs: req.timeoutMs,
            maxTokens: req.max_tokens,
            temperature: req.temperature,
        });

        // 内部 controller：同时承载 timeout + 外部 signal 的取消
        const controllerStart = nowMs();
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), req.timeoutMs);
        devLog(`[AiInput][${traceId}][HTTP] AbortController/timeout 建立完成 (${elapsedMs(controllerStart)})`);

        let externalAbortHandler: (() => void) | null = null;
        if (req.signal) {
            const signalStart = nowMs();
            // 外部已取消
            if (req.signal.aborted) controller.abort();

            // 外部触发取消 -> 级联到内部 controller
            externalAbortHandler = () => {
                devWarn(`[AiInput][${traceId}][HTTP] 收到外部取消信号 (${elapsedMs(totalStart)})`);
                controller.abort();
            };
            try {
                req.signal.addEventListener('abort', externalAbortHandler, { once: true });
            } catch {
                // 某些环境 signal 可能不支持 addEventListener
            }
            devLog(`[AiInput][${traceId}][HTTP] 外部取消信号绑定完成 (${elapsedMs(signalStart)})`, {
                externalAlreadyAborted: req.signal.aborted,
            });
        }

        try {
            const fetchStart = nowMs();
            devLog(`[AiInput][${traceId}][HTTP] before fetch`, {
                endpoint: summarizeUrl(req.baseURL),
                path: '/chat/completions',
            });
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${req.apiKey}`,
                },
                body: requestBody,
                signal: controller.signal,
            });
            devLog(`[AiInput][${traceId}][HTTP] fetch 返回响应头 (${elapsedMs(fetchStart)})`, {
                ok: response.ok,
                status: response.status,
                statusText: response.statusText,
                contentType: response.headers?.get?.('content-type') ?? '(unknown)',
            });
            if (nowMs() - fetchStart >= 3000) {
                devWarn(`[AiInput][${traceId}][HTTP] 慢步骤: fetch 等待响应头 (${elapsedMs(fetchStart)})`, {
                    endpoint: summarizeUrl(req.baseURL),
                    status: response.status,
                });
            }

            if (!response.ok) {
                const errorBodyStart = nowMs();
                const text = await response.text().catch(() => '');
                devWarn(`[AiInput][${traceId}][HTTP] 读取错误响应体完成 (${elapsedMs(errorBodyStart)})`, {
                    status: response.status,
                    bodyChars: text.length,
                    bodyPreview: text.slice(0, 200),
                });
                throw new Error(`AI HTTP ${response.status}: ${text.slice(0, 200)}`);
            }

            const responseJsonStart = nowMs();
            const json = await response.json();
            devLog(`[AiInput][${traceId}][HTTP] response.json 完成 (${elapsedMs(responseJsonStart)})`, {
                hasChoices: Array.isArray(json?.choices),
                choicesCount: json?.choices?.length ?? 0,
                usage: json?.usage ?? undefined,
            });
            if (nowMs() - responseJsonStart >= 500) {
                devWarn(`[AiInput][${traceId}][HTTP] 慢步骤: response.json (${elapsedMs(responseJsonStart)})`);
            }

            const extractStart = nowMs();
            const content = json?.choices?.[0]?.message?.content;
            devLog(`[AiInput][${traceId}][HTTP] 提取 message.content 完成 (${elapsedMs(extractStart)})`, {
                contentChars: typeof content === 'string' ? content.length : 0,
            });
            
            if (!content) {
                throw new Error('AI returned empty content');
            }

            devLog(`[AiInput][${traceId}][HTTP] chatCompletion 完成，总耗时 ${elapsedMs(totalStart)}`, {
                contentChars: content.length,
            });
            return content;
        } catch (error: any) {
            if (error.name === 'AbortError') {
                devWarn(`[AiInput][${traceId}][HTTP] 请求被取消/超时，总耗时 ${elapsedMs(totalStart)}`, {
                    timeoutMs: req.timeoutMs,
                    externalAborted: !!req.signal?.aborted,
                    internalAborted: controller.signal.aborted,
                });
                // 这里既可能是 timeout，也可能是外部取消
                // 由上层决定如何对用户呈现
                throw error;
            }
            devWarn(`[AiInput][${traceId}][HTTP] 请求失败，总耗时 ${elapsedMs(totalStart)}`, {
                message: error?.message ?? String(error),
                name: error?.name,
            });
            throw error;
        } finally {
            const cleanupStart = nowMs();
            clearTimeout(timeoutId);
            if (req.signal && externalAbortHandler) {
                try {
                    req.signal.removeEventListener('abort', externalAbortHandler);
                } catch {
                    // ignore
                }
            }
            devLog(`[AiInput][${traceId}][HTTP] 清理 timeout/signal 完成 (${elapsedMs(cleanupStart)})`);
        }
    }
}
