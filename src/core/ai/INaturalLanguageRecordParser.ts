// src/core/ai/INaturalLanguageRecordParser.ts
// 自然语言记录解析器接口

import type { NaturalRecordBatch } from '@/core/types/ai-schema';

/**
 * 解析输入参数
 */
export interface ParseInput {
    /** 用户输入的自然语言文本 */
    text: string;
    /** 当前时间 */
    now: Date;
    /** 可选：用于取消请求（modal 关闭 / unload / takeLatest） */
    signal?: AbortSignal;
    /** 可选：调试链路 ID，用于把 command/parser/http 的耗时日志串起来 */
    traceId?: string;
    /** 可选：快速模式，减少 prompt 体积和 maxTokens，优先降低 AI 首包等待时间 */
    fastMode?: boolean;
}

/**
 * 自然语言记录解析器接口
 */
export interface INaturalLanguageRecordParser {
    /**
     * 解析自然语言文本，返回结构化的记录命令
     * 
     * @param input 解析输入
     * @returns 解析结果批次
     */
    parse(input: ParseInput): Promise<NaturalRecordBatch>;
}
