import type { AiChatService, ChatSessionStore, RetrievalService } from '@core/ai/public';
import type { NaturalRecordBatch, NaturalRecordCommand } from '@core/types/public';

// ============== AI 服务接口（用于依赖注入） ==============

export interface AiServices {
    chatService: AiChatService;
    retrievalService: RetrievalService;
    sessionStore: ChatSessionStore;
    captureNaturalRecords?: (input: { text: string; signal?: AbortSignal }) => Promise<NaturalRecordBatch>;
    openNaturalRecordBatchConfirm?: (input: { title: string; items: NaturalRecordCommand[]; traceId?: string }) => void;
}
