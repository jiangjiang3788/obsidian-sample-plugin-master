// src/core/ai/AiChatService.ts
/**
 * AiChatService - AI 聊天服务
 * Role: Service (AI 请求逻辑)
 * 
 * Do:
 * - 使用 AiHttpClient 发送聊天请求
 * - 组织 prompt（system + context + user）
 * - 读取 aiSettings 配置
 * 
 * Don't:
 * - 管理会话状态（那是 ChatSessionStore 的职责）
 * - 管理检索索引（那是 RetrievalService 的职责）
 */

import { AiHttpClient, OpenAIChatMessage } from './AiHttpClient';
import { getRetrievalService, RetrievalFilters } from './RetrievalService';
import type { AiSettings } from '@/core/types/ai-schema';
import { DEFAULT_AI_SETTINGS } from '@/core/types/ai-schema';
import type { Item } from '@/core/types/schema';
import { appStore } from '@/app/storeRegistry';
import { dayjs } from '@core/utils/date';

// ============== Types ==============

export interface ChatRequest {
    /** 用户消息 */
    userMessage: string;
    /** 历史消息（可选，用于多轮对话） */
    history?: OpenAIChatMessage[];
    /** 是否启用上下文检索 */
    enableRetrieval?: boolean;
    /** 检索过滤条件 */
    retrievalFilters?: RetrievalFilters;
    /** 检索结果数量 */
    retrievalLimit?: number;
}

export interface ChatResponse {
    /** AI 回复内容 */
    content: string;
    /** 引用的 Item ID 列表 */
    referencedItemIds: string[];
    /** 使用的模型 */
    model: string;
    /** 检索到的上下文数量 */
    retrievalCount: number;
}

// ============== Constants ==============

const SYSTEM_PROMPT = `你是一个个人工作记录助手，帮助用户查询和分析他们的工作记录、任务和笔记。

你的职责：
1. 根据用户的问题，从提供的上下文中找到相关信息并回答
2. 回答时要简洁明了，使用中文
3. 如果引用了某条记录，请提及其标题、日期或主题
4. 如果上下文中没有相关信息，诚实地说明
5. 可以对记录进行分析、统计或总结

输出格式要求（重要）：
- 默认使用 Markdown 格式输出
- 不要输出任何 HTML 标签
- 代码块使用 \`\`\`language 格式
- 列表使用 - 或 1. 2. 格式
- 强调使用 **粗体** 或 *斜体*
- 引用使用 > 格式
- 禁止在代码块之外使用任何 HTML 标签

注意：
- 回答基于用户提供的个人记录数据
- 保持专业、友好的语气
- 不要编造不存在的信息`;

const MAX_CONTEXT_LENGTH = 3000; // 上下文最大字符数

// ============== AiChatService ==============

export class AiChatService {
    private httpClient: AiHttpClient;

    constructor() {
        this.httpClient = new AiHttpClient();
    }

    // ============== 获取配置 ==============

    private getAiSettings(): AiSettings {
        if (!appStore) {
            console.warn('AiChatService: AppStore 未初始化，使用默认配置');
            return DEFAULT_AI_SETTINGS;
        }
        return appStore.getSettings().aiSettings ?? DEFAULT_AI_SETTINGS;
    }

    // ============== 构建上下文 ==============

    /**
     * 从检索结果构建上下文字符串
     */
    private buildContextFromItems(items: Item[]): string {
        if (!items || items.length === 0) {
            return '';
        }

        const contextParts: string[] = [];
        let totalLength = 0;

        for (const item of items) {
            // 格式化单条记录
            const date = item.dateMs ? dayjs(item.dateMs).format('YYYY-MM-DD') : '未知日期';
            const theme = item.theme || '无主题';
            const title = item.title || '无标题';
            const content = (item.content || '').slice(0, 200); // 限制单条内容长度
            const type = item.type === 'task' ? '任务' : '记录';

            const entry = `- [${type}] ${date} | ${theme} | ${title}${content ? ': ' + content : ''}`;
            
            // 检查长度限制
            if (totalLength + entry.length > MAX_CONTEXT_LENGTH) {
                break;
            }

            contextParts.push(entry);
            totalLength += entry.length;
        }

        return contextParts.join('\n');
    }

    // ============== 发送请求 ==============

    /**
     * 发送聊天请求
     */
    async chat(request: ChatRequest): Promise<ChatResponse> {
        const settings = this.getAiSettings();

        if (!settings.enabled) {
            throw new Error('AI 功能未启用，请在设置中开启');
        }

        if (!settings.apiEndpoint || !settings.apiKey || !settings.model) {
            throw new Error('AI 配置不完整，请检查 API 设置');
        }

        // 构建消息列表
        const messages: OpenAIChatMessage[] = [];
        
        // 1. System prompt
        messages.push({
            role: 'system',
            content: SYSTEM_PROMPT,
        });

        // 2. 上下文（如果启用检索）
        let referencedItemIds: string[] = [];
        let retrievalCount = 0;

        if (request.enableRetrieval) {
            const retrievalService = getRetrievalService();
            
            // 处理过滤条件：将 blockTemplateIds 映射为 blockTemplateNames
            const filters = { ...request.retrievalFilters };
            if (filters.blockTemplateIds && filters.blockTemplateIds.length > 0 && appStore) {
                const blocks = appStore.getSettings().inputSettings?.blocks ?? [];
                const blockTemplateNames: string[] = [];
                for (const id of filters.blockTemplateIds) {
                    const block = blocks.find((b: any) => b.id === id);
                    if (block && block.name) {
                        blockTemplateNames.push(block.name);
                    }
                }
                if (blockTemplateNames.length > 0) {
                    filters.blockTemplateNames = blockTemplateNames;
                }
                // 删除 blockTemplateIds，使用 blockTemplateNames 进行过滤
                delete filters.blockTemplateIds;
            }

            const searchResult = retrievalService.search(request.userMessage, {
                ...filters,
                limit: request.retrievalLimit ?? 10,
            });

            if (searchResult.items.length > 0) {
                const contextStr = this.buildContextFromItems(searchResult.items);
                referencedItemIds = searchResult.items.map(item => item.id);
                retrievalCount = searchResult.items.length;

                messages.push({
                    role: 'system',
                    content: `以下是与用户问题相关的个人记录（共 ${retrievalCount} 条）：\n\n${contextStr}\n\n请基于这些记录回答用户的问题。`,
                });

                console.log(`AiChatService: 检索到 ${retrievalCount} 条相关记录`);
            }
        }

        // 3. 历史消息
        if (request.history && request.history.length > 0) {
            // 只保留最近的几轮对话，避免超出 token 限制
            const recentHistory = request.history.slice(-10);
            messages.push(...recentHistory);
        }

        // 4. 用户消息
        messages.push({
            role: 'user',
            content: request.userMessage,
        });

        // 发送请求
        try {
            const content = await this.httpClient.chatCompletion({
                baseURL: settings.apiEndpoint,
                apiKey: settings.apiKey,
                model: settings.model,
                temperature: settings.temperature,
                max_tokens: settings.maxTokens,
                messages,
                timeoutMs: settings.requestTimeoutMs,
            });

            return {
                content,
                referencedItemIds,
                model: settings.model,
                retrievalCount,
            };
        } catch (e: any) {
            console.error('AiChatService: 请求失败', e);
            throw new Error(`AI 请求失败: ${e.message || e}`);
        }
    }

    /**
     * 简单问答（不带上下文检索）
     */
    async simpleChat(message: string): Promise<string> {
        const response = await this.chat({
            userMessage: message,
            enableRetrieval: false,
        });
        return response.content;
    }

    /**
     * 带检索的问答
     */
    async chatWithRetrieval(
        message: string,
        filters?: RetrievalFilters,
        history?: OpenAIChatMessage[]
    ): Promise<ChatResponse> {
        return this.chat({
            userMessage: message,
            enableRetrieval: true,
            retrievalFilters: filters,
            history,
        });
    }
}

// ============== 单例导出 ==============

let _instance: AiChatService | null = null;

export function getAiChatService(): AiChatService {
    if (!_instance) {
        _instance = new AiChatService();
    }
    return _instance;
}
