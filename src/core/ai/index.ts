// src/core/ai/index.ts
// AI 模块导出

export { AiConfigCache } from './AiConfigCache';
export { AiHttpClient } from './AiHttpClient';
export { AiNaturalLanguageRecordParser } from './AiNaturalLanguageRecordParser';
export { buildAiConfigSnapshot } from './AiConfigSnapshot';

export type { AiConfigSnapshot, AiBlockConfig, AiThemeConfig, AiBlockConfigField } from './AiConfigSnapshot';
export type { INaturalLanguageRecordParser, ParseInput } from './INaturalLanguageRecordParser';
export type { OpenAIChatMessage, ChatCompletionRequest } from './AiHttpClient';
