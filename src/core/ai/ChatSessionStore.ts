// src/core/ai/ChatSessionStore.ts
/**
 * ChatSessionStore - AI 聊天会话存储
 * Role: Store (状态管理 + 持久化)
 * 
 * Do:
 * - 管理 AI 聊天会话数据（会话列表、消息）
 * - 使用 zod 校验数据结构
 * - 通过 IPluginStorage 持久化到 Vault 文件
 * 
 * Don't:
 * - 处理 AI 请求逻辑（那是 AiChatService 的职责）
 * - 渲染 UI
 */

import { z } from 'zod';
import { SerialTaskQueue } from '@/core/storage/SerialTaskQueue';
import { singleton, inject } from 'tsyringe';
import { STORAGE_TOKEN, THINK_STORAGE_PATHS, type IPluginStorage } from '@/core/services/StorageService';
import { generateId } from '../utils/id';
import { devLog, devWarn, devError } from '../utils/devLogger';

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
    goalPaths: z.array(z.string()).optional(),
    recordTypes: z.array(z.string()).optional(),
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

const LEGACY_STORAGE_KEY = 'think-ai-chat-sessions';
const DEFAULT_FILE_PATH = THINK_STORAGE_PATHS.chatSessions;
const CORRUPT_SUFFIX = '.corrupt.json';
const MAX_SESSIONS = 50; // 最多保留的会话数

// ============== ChatSessionStore ==============

@singleton()
export class ChatSessionStore {
    private data: ChatStoreData = { version: 1, sessions: [] };
    private listeners: Set<() => void> = new Set();
    private initialized: boolean = false;
    private initPromise: Promise<void> | null = null;
    private disposed: boolean = false;
    private readonly mutationQueue = new SerialTaskQueue();

    constructor(
        @inject(STORAGE_TOKEN) private storage: IPluginStorage,
        private filePath: string = DEFAULT_FILE_PATH
    ) {}

    // ============== 初始化 ==============

    /**
     * 初始化 Store（加载数据 + 迁移）
     * 必须在使用前调用
     */
    async initialize(): Promise<void> {
        if (this.disposed) return;
        if (this.initialized) return;
        if (this.initPromise) return this.initPromise;

        const operation = this._doInitialize().then(() => { this.initialized = true; });
        this.initPromise = operation;
        try { await operation; } finally { this.initPromise = null; }
    }

    private async _doInitialize(): Promise<void> {
        // 1. 尝试从新文件加载
        const fileData = await this.loadFromFile();
        
        if (fileData) {
            this.data = fileData;
            devLog(`ChatSessionStore: 从文件加载 ${this.data.sessions.length} 个会话`);
            return;
        }

        // 2. 如果新文件不存在，尝试从 localStorage 迁移
        const legacyData = this.loadFromLocalStorage();
        if (legacyData && legacyData.sessions.length > 0) {
            devLog(`ChatSessionStore: 从 localStorage 迁移 ${legacyData.sessions.length} 个会话`);
            await this.storage.writeJSON(this.filePath, legacyData);
            this.data = legacyData;
            
            // 清理 localStorage
            try {
                localStorage.removeItem(LEGACY_STORAGE_KEY);
                devLog('ChatSessionStore: localStorage 数据已清理');
            } catch (e) {
                devWarn('ChatSessionStore: 清理 localStorage 失败', e);
            }
            return;
        }

        // 3. 都没有，使用空数据
        this.data = { version: 1, sessions: [] };
    }

    // ============== 持久化 ==============

    private async loadFromFile(): Promise<ChatStoreData | null> {
        if (this.disposed) return null;
        try {
            const raw = await this.storage.readJSON<unknown>(this.filePath);
            if (raw === null) return null;

            const result = ChatStoreDataSchema.safeParse(raw);
            if (result.success) {
                return result.data;
            }

            // 校验失败，备份损坏数据
            devWarn('ChatSessionStore: 文件数据校验失败，备份损坏文件', result.error);
            await this.backupCorruptData(raw);
            throw new Error('聊天记录结构无效，已阻止空数据覆盖原文件。');
        } catch (e) {
            devWarn('ChatSessionStore: 加载文件失败', e);
            throw e;
        }
    }

    private loadFromLocalStorage(): ChatStoreData | null {
        try {
            const raw = localStorage.getItem(LEGACY_STORAGE_KEY);
            if (!raw) return null;

            const parsed = JSON.parse(raw);
            const result = ChatStoreDataSchema.safeParse(parsed);
            if (result.success) {
                return result.data;
            }

            devWarn('ChatSessionStore: localStorage 数据校验失败', result.error);
            return null;
        } catch (e) {
            devWarn('ChatSessionStore: 解析 localStorage 失败', e);
            return null;
        }
    }

    private async backupCorruptData(data: unknown): Promise<void> {
        if (this.disposed) return;
        try {
            const corruptPath = this.filePath.replace('.json', CORRUPT_SUFFIX);
            await this.storage.writeJSON(corruptPath, data);
            devLog(`ChatSessionStore: 损坏数据已备份到 ${corruptPath}`);
        } catch (e) {
            devError('ChatSessionStore: 备份损坏数据失败', e);
        }
    }

    private notify(): void {
        if (this.disposed) return;
        this.listeners.forEach(fn => {
            try { fn(); } catch (e) { devError('ChatSessionStore: 通知失败', e); }
        });
    }

    // ============== 订阅 ==============

    subscribe(listener: () => void): () => void {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    /**
     * 生命周期收口：卸载时停止一切写盘/通知
     * - 让 unload/reload 后不会再写文件
     */
    dispose(): void {
        this.disposed = true;
        this.listeners.clear();
        this.initPromise = null;
    }

    // ============== 会话 API ==============

    /** 获取所有会话（按修改时间倒序） */
    listSessions(): ChatSession[] {
        return [...this.data.sessions].sort((a, b) => b.modified - a.modified);
    }

    /** 获取最近 N 个会话 */
    getRecentSessions(limit: number = 100): ChatSession[] {
        return this.listSessions().slice(0, limit);
    }

    /** 根据 ID 获取会话 */
    getSession(id: string): ChatSession | undefined {
        return this.data.sessions.find(s => s.id === id);
    }

    /** Commit mutations in one queue. A rejected write leaves the published data unchanged. */
    private commit<T>(mutate: (draft: ChatStoreData) => T): Promise<T> {
        return this.mutationQueue.run(async () => {
            if (this.disposed) throw new Error('ChatSessionStore: 已释放，禁止写入');
            await this.initialize();
            if (this.disposed) throw new Error('ChatSessionStore: 已释放，禁止写入');
            const draft = JSON.parse(JSON.stringify(this.data)) as ChatStoreData;
            const result = mutate(draft);
            await this.storage.writeJSON(this.filePath, draft);
            if (this.disposed) return result;
            this.data = draft;
            this.notify();
            return result;
        });
    }

    async createSession(title?: string, filters?: SessionFilters): Promise<ChatSession> {
        return this.commit((draft) => {
            const now = Date.now();
            const session: ChatSession = { id: generateId(), title: title || `对话 ${new Date().toLocaleString('zh-CN')}`,
                created: now, modified: now, filters, messages: [] };
            draft.sessions.unshift(session);
            if (draft.sessions.length > MAX_SESSIONS) draft.sessions = draft.sessions.slice(0, MAX_SESSIONS);
            return session;
        });
    }

    async appendMessage(sessionId: string, role: ChatMessage['role'], content: string,
        meta?: ChatMessage['meta'], contentType?: MessageContentType): Promise<ChatMessage | null> {
        return this.commit((draft) => {
            const session = draft.sessions.find((entry) => entry.id === sessionId);
            if (!session) return null;
            const message: ChatMessage = { id: generateId(), role, content,
                contentType: contentType ?? (role === 'user' ? 'plain' : 'markdown'), created: Date.now(), meta };
            session.messages.push(message);
            session.modified = Date.now();
            if (role === 'user' && session.messages.filter((entry) => entry.role === 'user').length === 1) {
                session.title = content.slice(0, 30) + (content.length > 30 ? '...' : '');
            }
            return message;
        });
    }

    async updateSession(id: string, updates: Partial<Pick<ChatSession, 'title' | 'filters'>>): Promise<boolean> {
        return this.commit((draft) => {
            const session = draft.sessions.find((entry) => entry.id === id);
            if (!session) return false;
            if (updates.title !== undefined) session.title = updates.title;
            if (updates.filters !== undefined) session.filters = updates.filters;
            session.modified = Date.now();
            return true;
        });
    }

    async deleteSession(id: string): Promise<boolean> {
        return this.commit((draft) => {
            const index = draft.sessions.findIndex((entry) => entry.id === id);
            if (index < 0) return false;
            draft.sessions.splice(index, 1);
            return true;
        });
    }

    async clearAllSessions(): Promise<void> {
        await this.commit((draft) => { draft.sessions = []; });
    }

    /** 获取会话消息 */
    getMessages(sessionId: string): ChatMessage[] {
        const session = this.getSession(sessionId);
        return session?.messages ?? [];
    }
}