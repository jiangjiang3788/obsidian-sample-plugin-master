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

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), req.timeoutMs);

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
                throw new Error(`AI request timeout after ${req.timeoutMs}ms`);
            }
            throw error;
        } finally {
            clearTimeout(timeoutId);
        }
    }
}
