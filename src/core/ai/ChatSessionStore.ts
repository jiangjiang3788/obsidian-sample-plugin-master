// src/core/ai/ChatSessionStore.ts
/**
 * ChatSessionStore - AI 聊天会话存储
 * Role: Store (状态管理 + 持久化)
 * 
 * Do:
 * - 管理 AI 聊天会话数据（会话列表、消息）
 * - 使用 zod 校验数据结构
 * - 通过 localStorage 持久化（MVP 方案，可扩展到 IPluginStorage）
 * 
 * Don't:
 * - 处理 AI 请求逻辑（那是 AiChatService 的职责）
 * - 渲染 UI
 */

import { z } from 'zod';

// ============== Zod Schemas ==============

/** 消息内容类型 */
export const MessageContentTypeSchema = z.enum(['markdown', 'plain', 'html']);
export type MessageContentType = z.infer<typeof MessageContentTypeSchema>;

/** 聊天消息 schema */
export const ChatMessageSchema = z.object({
    id: z.string(),
    role: z.enum(['user', 'assistant', 'system']),
    content: z.string(),
    /**
     * 内容类型
     * - markdown: Markdown 格式（默认，AI 回复）
     * - plain: 纯文本（用户输入）
     * - html: HTML（暂不支持，视为 plain）
     * 
     * 历史数据兼容：如果该字段缺失，按 role 推断：
     * - assistant/system -> markdown
     * - user -> plain
     */
    contentType: MessageContentTypeSchema.optional(),
    created: z.number(),
    meta: z.object({
        referencedItemIds: z.array(z.string()).optional(),
        model: z.string().optional(),
        retrievalCount: z.number().optional(),
    }).optional(),
});

/** 会话过滤器 schema */
export const SessionFiltersSchema = z.object({
    themePaths: z.array(z.string()).optional(),
    types: z.array(z.enum(['task', 'block'])).optional(),
    blockTemplateIds: z.array(z.string()).optional(),
});

/** 聊天会话 schema */
export const ChatSessionSchema = z.object({
    id: z.string(),
    title: z.string(),
    created: z.number(),
    modified: z.number(),
    filters: SessionFiltersSchema.optional(),
    messages: z.array(ChatMessageSchema),
});

/** 存储根 schema */
export const ChatStoreDataSchema = z.object({
    version: z.literal(1),
    sessions: z.array(ChatSessionSchema),
});

// ============== Types ==============

export type ChatMessage = z.infer<typeof ChatMessageSchema>;
export type SessionFilters = z.infer<typeof SessionFiltersSchema>;
export type ChatSession = z.infer<typeof ChatSessionSchema>;
export type ChatStoreData = z.infer<typeof ChatStoreDataSchema>;

// ============== Constants ==============

const STORAGE_KEY = 'think-ai-chat-sessions';
const MAX_SESSIONS = 50; // 最多保留的会话数

// ============== Helper ==============

function generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

// ============== ChatSessionStore ==============

export class ChatSessionStore {
    private data: ChatStoreData;
    private listeners: Set<() => void> = new Set();

    constructor() {
        this.data = this.loadFromStorage();
    }

    // ============== 持久化 ==============

    private loadFromStorage(): ChatStoreData {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) {
                return { version: 1, sessions: [] };
            }
            const parsed = JSON.parse(raw);
            const result = ChatStoreDataSchema.safeParse(parsed);
            if (result.success) {
                return result.data;
            }
            console.warn('ChatSessionStore: 数据校验失败，重置为空', result.error);
            return { version: 1, sessions: [] };
        } catch (e) {
            console.warn('ChatSessionStore: 加载存储失败', e);
            return { version: 1, sessions: [] };
        }
    }

    private saveToStorage(): void {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
        } catch (e) {
            console.error('ChatSessionStore: 保存失败', e);
        }
    }

    private notify(): void {
        this.listeners.forEach(fn => {
            try { fn(); } catch (e) { console.error('ChatSessionStore: 通知失败', e); }
        });
    }

    // ============== 订阅 ==============

    subscribe(listener: () => void): () => void {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    // ============== 会话 API ==============

    /** 获取所有会话（按修改时间倒序） */
    listSessions(): ChatSession[] {
        return [...this.data.sessions].sort((a, b) => b.modified - a.modified);
    }

    /** 获取最近 N 个会话 */
    getRecentSessions(limit: number = 10): ChatSession[] {
        return this.listSessions().slice(0, limit);
    }

    /** 根据 ID 获取会话 */
    getSession(id: string): ChatSession | undefined {
        return this.data.sessions.find(s => s.id === id);
    }

    /** 创建新会话 */
    createSession(title?: string, filters?: SessionFilters): ChatSession {
        const now = Date.now();
        const session: ChatSession = {
            id: generateId(),
            title: title || `对话 ${new Date().toLocaleString('zh-CN')}`,
            created: now,
            modified: now,
            filters,
            messages: [],
        };
        
        this.data.sessions.unshift(session);
        
        // 限制会话数量
        if (this.data.sessions.length > MAX_SESSIONS) {
            this.data.sessions = this.data.sessions.slice(0, MAX_SESSIONS);
        }
        
        this.saveToStorage();
        this.notify();
        return session;
    }

    /** 添加消息到会话 */
    appendMessage(
        sessionId: string,
        role: ChatMessage['role'],
        content: string,
        meta?: ChatMessage['meta'],
        contentType?: MessageContentType
    ): ChatMessage | null {
        const session = this.data.sessions.find(s => s.id === sessionId);
        if (!session) {
            console.warn('ChatSessionStore: 会话不存在', sessionId);
            return null;
        }

        // 根据 role 设置默认 contentType
        // user -> plain, assistant/system -> markdown
        const resolvedContentType = contentType ?? (role === 'user' ? 'plain' : 'markdown');

        const message: ChatMessage = {
            id: generateId(),
            role,
            content,
            contentType: resolvedContentType,
            created: Date.now(),
            meta,
        };

        session.messages.push(message);
        session.modified = Date.now();

        // 自动更新标题（如果是第一条用户消息）
        if (role === 'user' && session.messages.filter(m => m.role === 'user').length === 1) {
            session.title = content.slice(0, 30) + (content.length > 30 ? '...' : '');
        }

        this.saveToStorage();
        this.notify();
        return message;
    }

    /** 更新会话 */
    updateSession(id: string, updates: Partial<Pick<ChatSession, 'title' | 'filters'>>): boolean {
        const session = this.data.sessions.find(s => s.id === id);
        if (!session) return false;

        if (updates.title !== undefined) session.title = updates.title;
        if (updates.filters !== undefined) session.filters = updates.filters;
        session.modified = Date.now();

        this.saveToStorage();
        this.notify();
        return true;
    }

    /** 删除会话 */
    deleteSession(id: string): boolean {
        const idx = this.data.sessions.findIndex(s => s.id === id);
        if (idx === -1) return false;

        this.data.sessions.splice(idx, 1);
        this.saveToStorage();
        this.notify();
        return true;
    }

    /** 清空所有会话 */
    clearAllSessions(): void {
        this.data.sessions = [];
        this.saveToStorage();
        this.notify();
    }

    /** 获取会话消息 */
    getMessages(sessionId: string): ChatMessage[] {
        const session = this.getSession(sessionId);
        return session?.messages ?? [];
    }
}

// 单例导出
let _instance: ChatSessionStore | null = null;

export function getChatSessionStore(): ChatSessionStore {
    if (!_instance) {
        _instance = new ChatSessionStore();
    }
    return _instance;
}
