// src/core/ai/index.ts
// AI 模块导出

export { AiConfigCache } from './AiConfigCache';
export { AiHttpClient } from './AiHttpClient';
export { AiNaturalLanguageRecordParser } from './AiNaturalLanguageRecordParser';
export { buildAiConfigSnapshot } from './AiConfigSnapshot';

// [新增] AI Chat 相关导出
export { ChatSessionStore, getChatSessionStore } from './ChatSessionStore';
export { RetrievalService, getRetrievalService } from './RetrievalService';
export { AiChatService, getAiChatService } from './AiChatService';

export type { AiConfigSnapshot, AiBlockConfig, AiThemeConfig, AiBlockConfigField } from './AiConfigSnapshot';
export type { INaturalLanguageRecordParser, ParseInput } from './INaturalLanguageRecordParser';
export type { OpenAIChatMessage, ChatCompletionRequest } from './AiHttpClient';

// [新增] AI Chat 类型导出
export type { ChatSession, ChatMessage, SessionFilters } from './ChatSessionStore';
export type { RetrievalFilters, RetrievalResult, RetrievalSearchResult } from './RetrievalService';
export type { ChatRequest, ChatResponse } from './AiChatService';
