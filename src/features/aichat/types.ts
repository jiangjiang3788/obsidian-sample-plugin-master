import type { AiChatService, ChatSessionStore, RetrievalService } from '@core/public';

// ============== AI 服务接口（用于依赖注入） ==============

export interface AiServices {
    chatService: AiChatService;
    retrievalService: RetrievalService;
    sessionStore: ChatSessionStore;
}
