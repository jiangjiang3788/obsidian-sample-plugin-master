// src/core/ai/AiNaturalLanguageRecordParser.ts
// 自然语言记录解析器实现 - 核心 Prompt + JSON 解析

import type { INaturalLanguageRecordParser, ParseInput } from './INaturalLanguageRecordParser';
import type { NaturalRecordBatch } from '@/core/types/ai-schema';
import type { ISettingsProvider } from '@/core/services/types';
import { AiConfigCache } from './AiConfigCache';
import { AiHttpClient } from './AiHttpClient';

/**
 * 安全解析 JSON 批次
 * 尝试直接解析，失败则截取第一个 { 到最后一个 } 再解析
 */
function safeJsonParseBatch(raw: string): NaturalRecordBatch {
    // 先尝试直接解析
    try {
        return JSON.parse(raw);
    } catch {
        // 尝试提取 JSON 部分
        const start = raw.indexOf('{');
        const end = raw.lastIndexOf('}');
        
        if (start >= 0 && end > start) {
            const sliced = raw.slice(start, end + 1);
            try {
                return JSON.parse(sliced);
            } catch {
                // 继续尝试
            }
        }

        // 尝试提取数组形式
        const arrayStart = raw.indexOf('[');
        const arrayEnd = raw.lastIndexOf(']');
        
        if (arrayStart >= 0 && arrayEnd > arrayStart) {
            const sliced = raw.slice(arrayStart, arrayEnd + 1);
            try {
                const items = JSON.parse(sliced);
                return { items };
            } catch {
                // 继续
            }
        }

        throw new Error('AI output is not valid JSON. Raw output: ' + raw.slice(0, 200));
    }
}

/**
 * AI 自然语言记录解析器
 */
export class AiNaturalLanguageRecordParser implements INaturalLanguageRecordParser {
    constructor(
        private settingsProvider: ISettingsProvider,
        private cache: AiConfigCache,
        private http: AiHttpClient
    ) {}

    /**
     * 解析自然语言文本
     */
    async parse(input: ParseInput): Promise<NaturalRecordBatch> {
        const settings = this.settingsProvider.getSettings();
        const ai = settings.aiSettings;

        if (!ai?.enabled) {
            throw new Error('AI is disabled');
        }

        // 获取配置快照
        const snapshot = this.cache.getSnapshot();
        const nowIso = input.now.toISOString();

        // 获取自定义提示词
        const customPrompt = ai.customPrompt?.trim() || '';

        // 构建系统提示
        const system = this.buildSystemPrompt(snapshot, customPrompt);

        // 构建用户提示
        const user = this.buildUserPrompt(input.text, nowIso, ai.allowMultipleResults ? ai.maxResults : 1, snapshot);

        // 调用 AI
        const raw = await this.http.chatCompletion({
            baseURL: ai.apiEndpoint,
            apiKey: ai.apiKey,
            model: ai.model,
            temperature: ai.temperature,
            max_tokens: ai.maxTokens,
            timeoutMs: ai.requestTimeoutMs ?? 30000,
            messages: [
                { role: 'system', content: system },
                { role: 'user', content: user },
            ],
        });

        // 解析结果
        const batch = safeJsonParseBatch(raw);

        // 确保 items 存在
        if (!batch.items) {
            batch.items = [];
        }

        // 兜底：若不允许多结果，截断为 1
        if (!ai.allowMultipleResults && batch.items.length > 1) {
            batch.items = batch.items.slice(0, 1);
        }

        // 兜底：maxResults
        if (ai.maxResults && batch.items.length > ai.maxResults) {
            batch.items = batch.items.slice(0, ai.maxResults);
        }

        // 为每个 item 添加 rawText，并应用默认主题
        const defaultThemeId = ai.defaultThemeId;
        batch.items.forEach(item => {
            if (!item.rawText) {
                item.rawText = input.text;
            }
            // 如果 AI 没有返回 themeId，使用默认主题
            if (!item.target.themeId && defaultThemeId) {
                item.target.themeId = defaultThemeId;
            }
        });

        return batch;
    }

    /**
     * 构建系统提示 - 增强主题选择指导，支持自定义提示词
     */
    private buildSystemPrompt(snapshot: any, customPrompt: string): string {
        // 提取主题列表用于示例
        const themeExamples = snapshot.themes?.slice(0, 5).map((t: any) => t.path).join(', ') || '';
        
        // 提取 Block 列表用于示例
        const blockExamples = snapshot.blocks?.slice(0, 5).map((b: any) => `${b.id}(${b.name})`).join(', ') || '';
        
        const basePrompt = [
            'You are a parser that converts natural language into Think plugin record commands.',
            'Return ONLY valid JSON. No markdown code blocks. No explanations. No extra text.',
            '',
            '=== OUTPUT SCHEMA ===',
            '{ "items": NaturalRecordCommand[] }',
            '',
            'NaturalRecordCommand structure:',
            '{',
            '  "rawText": "original input text",',
            '  "target": {',
            '    "blockId": "block-id-from-snapshot",',
            '    "themeId": "theme-path-from-snapshot"  // REQUIRED! Must be a valid theme path',
            '  },',
            '  "fieldValues": { "fieldKey": "value" },',
            '  "meta": { "confidence": 0.9, "reason": "explanation" }',
            '}',
            '',
            '=== AVAILABLE BLOCKS ===',
            `Block IDs: ${blockExamples}${snapshot.blocks?.length > 5 ? '...' : ''}`,
            '',
            '=== AVAILABLE THEMES ===',
            `Theme paths: ${themeExamples}${snapshot.themes?.length > 5 ? '...' : ''}`,
        ];

        // 如果有自定义提示词，优先使用
        if (customPrompt) {
            basePrompt.push(
                '',
                '=== USER CUSTOM RULES (HIGHEST PRIORITY) ===',
                'The following are user-defined rules. Follow these rules STRICTLY:',
                '',
                customPrompt,
                '',
                '=== END OF CUSTOM RULES ===',
                ''
            );
        }

        // 添加默认规则
        basePrompt.push(
            '',
            '=== DEFAULT RULES (use when custom rules do not apply) ===',
            '',
            'THEME SELECTION:',
            '1. themeId is REQUIRED - you MUST always provide a theme',
            '2. themeId must be the FULL PATH from snapshot.themes[].path',
            '3. Theme matching strategy:',
            '   - Look for keywords in user input that match theme path segments',
            '   - Example: "英语" in input → find theme with "英语" in path → use full path like "学习/英语"',
            '   - If no clear match, use the FIRST theme in the list as default',
            '4. NEVER leave themeId empty or undefined',
            '',
            'BLOCK SELECTION:',
            '1. blockId must be from snapshot.blocks[].id',
            '2. Choose block based on user intent and block name',
            '3. Common patterns:',
            '   - "任务"/"要做"/"计划" → task block',
            '   - "想法"/"灵感"/"闪念" → idea/flash block',
            '   - "学习"/"学了"/"记录" → study/record block',
            '   - "心情"/"开心"/"难过" → mood/check-in block',
            '4. If unsure, use the first block',
            '',
            'FIELD VALUES:',
            '1. Keys MUST be from snapshot.blocks[].fields[].key',
            '2. Date format: YYYY-MM-DD',
            '3. Time format: HH:mm',
            '4. Select/radio: use option.value when possible',
            '5. Rating: use numeric value (1-5)',
            '6. Use current date/time if not specified in input',
            '',
            '=== EXAMPLE ===',
            'If user says "记录今天学了30分钟英语" and themes include "学习/英语":',
            '{',
            '  "items": [{',
            '    "rawText": "记录今天学了30分钟英语",',
            '    "target": { "blockId": "study-record", "themeId": "学习/英语" },',
            '    "fieldValues": { "duration": 30, "date": "2024-01-15" },',
            '    "meta": { "confidence": 0.95 }',
            '  }]',
            '}',
        );

        return basePrompt.join('\n');
    }

    /**
     * 构建用户提示
     */
    private buildUserPrompt(text: string, nowIso: string, maxResults: number, snapshot: any): string {
        return [
            `Current time: ${nowIso}`,
            `Max results: ${maxResults}`,
            '',
            '=== AVAILABLE THEMES (you MUST choose one) ===',
            JSON.stringify(snapshot.themes, null, 2),
            '',
            '=== AVAILABLE BLOCKS ===',
            JSON.stringify(snapshot.blocks, null, 2),
            '',
            '=== USER INPUT ===',
            text,
            '',
            'Return JSON with themeId filled:',
        ].join('\n');
    }
}
