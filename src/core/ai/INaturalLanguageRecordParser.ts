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
