// src/core/ai/AiHttpClient.ts
// OpenAI-Compatible HTTP Client - 支持 Gemini/自建转发等

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

    /**
     * 可选：外部取消信号（用于 takeLatest / modal close / unload）
     * - 由调用方控制取消
     * - 仍会叠加 timeoutMs 的超时取消
     */
    signal?: AbortSignal;
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
        const url = req.baseURL.replace(/\/$/, '') + '/chat/completions';

        // 内部 controller：同时承载 timeout + 外部 signal 的取消
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), req.timeoutMs);

        let externalAbortHandler: (() => void) | null = null;
        if (req.signal) {
            // 外部已取消
            if (req.signal.aborted) controller.abort();

            // 外部触发取消 -> 级联到内部 controller
            externalAbortHandler = () => controller.abort();
            try {
                req.signal.addEventListener('abort', externalAbortHandler, { once: true });
            } catch {
                // 某些环境 signal 可能不支持 addEventListener
            }
        }

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${req.apiKey}`,
                },
                body: JSON.stringify({
                    model: req.model,
                    temperature: req.temperature,
                    max_tokens: req.max_tokens,
                    messages: req.messages,
                }),
                signal: controller.signal,
            });

            if (!response.ok) {
                const text = await response.text().catch(() => '');
                throw new Error(`AI HTTP ${response.status}: ${text.slice(0, 200)}`);
            }

            const json = await response.json();
            const content = json?.choices?.[0]?.message?.content;
            
            if (!content) {
                throw new Error('AI returned empty content');
            }

            return content;
        } catch (error: any) {
            if (error.name === 'AbortError') {
                // 这里既可能是 timeout，也可能是外部取消
                // 由上层决定如何对用户呈现
                throw error;
            }
            throw error;
        } finally {
            clearTimeout(timeoutId);
            if (req.signal && externalAbortHandler) {
                try {
                    req.signal.removeEventListener('abort', externalAbortHandler);
                } catch {
                    // ignore
                }
            }
        }
    }
}
