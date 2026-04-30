// src/core/ai/AiNaturalLanguageRecordParser.ts
// 自然语言记录解析器实现 - 核心 Prompt + JSON 解析

import type { INaturalLanguageRecordParser, ParseInput } from './INaturalLanguageRecordParser';
import type { NaturalRecordBatch } from '@/core/types/ai-schema';
import type { ISettingsProvider } from '@/core/services/types';
import { AiConfigCache } from './AiConfigCache';
import { AiHttpClient } from './AiHttpClient';
import { devLog, devWarn } from '../utils/devLogger';

function nowMs(): number {
    try {
        return performance.now();
    } catch {
        return Date.now();
    }
}

function durationMs(start: number): number {
    return nowMs() - start;
}

function formatMs(start: number): string {
    return `${durationMs(start).toFixed(2)}ms`;
}

function aiTraceId(input?: ParseInput): string {
    return input?.traceId || `ai-parser-${Date.now().toString(36)}`;
}

function logParserStep(traceId: string, step: string, startedAt: number, extra?: Record<string, unknown>): void {
    devLog(`[AiInput][${traceId}][Parser] ${step} (${formatMs(startedAt)})`, extra ?? '');
}

function warnSlowParserStep(traceId: string, step: string, startedAt: number, thresholdMs: number, extra?: Record<string, unknown>): void {
    const duration = durationMs(startedAt);
    if (duration >= thresholdMs) {
        devWarn(`[AiInput][${traceId}][Parser] 慢步骤: ${step} (${duration.toFixed(2)}ms, threshold=${thresholdMs}ms)`, extra ?? '');
    }
}

function compactSnapshotForFastMode(snapshot: any): any {
    return {
        blocks: (snapshot.blocks ?? []).map((block: any) => ({
            id: block.id,
            name: block.name,
            categoryKey: block.categoryKey,
            fields: (block.fields ?? []).map((field: any) => ({
                key: field.key,
                label: field.label,
                type: field.type,
            })),
        })),
        themes: (snapshot.themes ?? []).map((theme: any) => ({
            path: theme.path,
        })),
    };
}

/**
 * 安全解析 JSON 批次
 * 尝试直接解析，失败则截取第一个 { 到最后一个 } 再解析
 */
function safeJsonParseBatch(raw: string, traceId?: string): NaturalRecordBatch {
    const parseStart = nowMs();

    // 先尝试直接解析
    try {
        const parsed = JSON.parse(raw);
        if (traceId) logParserStep(traceId, 'JSON 直接解析完成', parseStart, { rawLength: raw.length });
        return parsed;
    } catch {
        if (traceId) devWarn(`[AiInput][${traceId}][Parser] JSON 直接解析失败，尝试截取对象/数组`, { rawLength: raw.length });

        // 尝试提取 JSON 部分
        const objectSliceStart = nowMs();
        const start = raw.indexOf('{');
        const end = raw.lastIndexOf('}');
        if (traceId) logParserStep(traceId, '查找 JSON 对象边界完成', objectSliceStart, { start, end });
        
        if (start >= 0 && end > start) {
            const sliced = raw.slice(start, end + 1);
            const objectParseStart = nowMs();
            try {
                const parsed = JSON.parse(sliced);
                if (traceId) logParserStep(traceId, '截取对象 JSON 解析完成', objectParseStart, { slicedLength: sliced.length });
                return parsed;
            } catch {
                if (traceId) devWarn(`[AiInput][${traceId}][Parser] 截取对象 JSON 解析失败`, { slicedLength: sliced.length });
                // 继续尝试
            }
        }

        // 尝试提取数组形式
        const arraySliceStart = nowMs();
        const arrayStart = raw.indexOf('[');
        const arrayEnd = raw.lastIndexOf(']');
        if (traceId) logParserStep(traceId, '查找 JSON 数组边界完成', arraySliceStart, { arrayStart, arrayEnd });
        
        if (arrayStart >= 0 && arrayEnd > arrayStart) {
            const sliced = raw.slice(arrayStart, arrayEnd + 1);
            const arrayParseStart = nowMs();
            try {
                const items = JSON.parse(sliced);
                if (traceId) logParserStep(traceId, '截取数组 JSON 解析完成', arrayParseStart, { slicedLength: sliced.length });
                return { items };
            } catch {
                if (traceId) devWarn(`[AiInput][${traceId}][Parser] 截取数组 JSON 解析失败`, { slicedLength: sliced.length });
                // 继续
            }
        }

        if (traceId) warnSlowParserStep(traceId, 'JSON 解析失败路径总耗时', parseStart, 50, { rawLength: raw.length });
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
        const traceId = aiTraceId(input);
        const totalStart = nowMs();
        devLog(`[AiInput][${traceId}][Parser] parse entered`, {
            inputLength: input.text.length,
            now: input.now.toISOString(),
            hasSignal: !!input.signal,
            signalAborted: !!input.signal?.aborted,
            fastMode: !!input.fastMode,
        });

        const settingsStart = nowMs();
        const settings = this.settingsProvider.getSettings();
        const ai = settings.aiSettings;
        logParserStep(traceId, '读取 settings 完成', settingsStart, {
            aiEnabled: !!ai?.enabled,
            model: ai?.model ?? '(missing)',
            timeoutMs: ai?.requestTimeoutMs ?? 30000,
        });

        if (!ai?.enabled) {
            throw new Error('AI is disabled');
        }

        // 获取配置快照
        const snapshotStart = nowMs();
        const rawSnapshot = this.cache.getSnapshot(traceId);
        const snapshot = input.fastMode ? compactSnapshotForFastMode(rawSnapshot) : rawSnapshot;
        logParserStep(traceId, '获取 AI 配置 snapshot 完成', snapshotStart, {
            fastMode: !!input.fastMode,
            blocksCount: snapshot.blocks?.length ?? 0,
            themesCount: snapshot.themes?.length ?? 0,
            compacted: input.fastMode ? true : false,
        });
        warnSlowParserStep(traceId, '获取 AI 配置 snapshot', snapshotStart, 50);

        const nowIsoStart = nowMs();
        const nowIso = input.now.toISOString();
        logParserStep(traceId, '格式化当前时间完成', nowIsoStart);

        // 获取自定义提示词
        const customPrompt = ai.customPrompt?.trim() || '';

        // 构建系统提示
        const systemPromptStart = nowMs();
        const system = input.fastMode ? this.buildFastSystemPrompt(customPrompt) : this.buildSystemPrompt(snapshot, customPrompt);
        logParserStep(traceId, '构建 system prompt 完成', systemPromptStart, {
            fastMode: !!input.fastMode,
            systemChars: system.length,
            hasCustomPrompt: !!customPrompt,
        });
        warnSlowParserStep(traceId, '构建 system prompt', systemPromptStart, 50, { systemChars: system.length });

        // 构建用户提示
        const effectiveMaxResults = input.fastMode ? Math.min(ai.allowMultipleResults ? ai.maxResults : 1, 3) : (ai.allowMultipleResults ? ai.maxResults : 1);
        const userPromptStart = nowMs();
        const user = input.fastMode
            ? this.buildFastUserPrompt(input.text, nowIso, effectiveMaxResults, snapshot)
            : this.buildUserPrompt(input.text, nowIso, effectiveMaxResults, snapshot);
        logParserStep(traceId, '构建 user prompt 完成', userPromptStart, {
            fastMode: !!input.fastMode,
            userChars: user.length,
            blocksJsonChars: JSON.stringify(snapshot.blocks).length,
            themesJsonChars: JSON.stringify(snapshot.themes).length,
            maxResults: effectiveMaxResults,
        });
        warnSlowParserStep(traceId, '构建 user prompt', userPromptStart, 100, { userChars: user.length });

        // 调用 AI
        const httpStart = nowMs();
        const effectiveMaxTokens = input.fastMode ? Math.min(ai.maxTokens ?? 4096, 1024) : ai.maxTokens;
        const effectiveTemperature = input.fastMode ? Math.min(ai.temperature ?? 0.7, 0.3) : ai.temperature;
        devLog(`[AiInput][${traceId}][Parser] before AiHttpClient.chatCompletion`, {
            fastMode: !!input.fastMode,
            model: ai.model,
            temperature: effectiveTemperature,
            maxTokens: effectiveMaxTokens,
            timeoutMs: ai.requestTimeoutMs ?? 30000,
            messageCount: 2,
            requestChars: system.length + user.length,
        });
        const raw = await this.http.chatCompletion({
            baseURL: ai.apiEndpoint,
            apiKey: ai.apiKey,
            model: ai.model,
            temperature: effectiveTemperature,
            max_tokens: effectiveMaxTokens,
            timeoutMs: ai.requestTimeoutMs ?? 30000,
            signal: input.signal,
            traceId,
            messages: [
                { role: 'system', content: system },
                { role: 'user', content: user },
            ],
        });
        logParserStep(traceId, 'AiHttpClient.chatCompletion 返回', httpStart, {
            rawLength: raw.length,
        });
        warnSlowParserStep(traceId, 'AI HTTP 请求', httpStart, 3000, { rawLength: raw.length });

        // 解析结果
        const jsonParseStart = nowMs();
        const batch = safeJsonParseBatch(raw, traceId);
        logParserStep(traceId, 'safeJsonParseBatch 完成', jsonParseStart, {
            itemsCount: batch.items?.length ?? 0,
        });
        warnSlowParserStep(traceId, '解析 AI JSON', jsonParseStart, 100, { rawLength: raw.length });

        const normalizeStart = nowMs();
        // 确保 items 存在
        if (!batch.items) {
            batch.items = [];
        }

        // 兜底：若不允许多结果，截断为 1
        if (!ai.allowMultipleResults && batch.items.length > 1) {
            batch.items = batch.items.slice(0, 1);
        }

        // 兜底：maxResults / fastMode 上限
        if (effectiveMaxResults && batch.items.length > effectiveMaxResults) {
            batch.items = batch.items.slice(0, effectiveMaxResults);
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
            if (!item.target.categoryKey && snapshot.blocks?.[0]?.categoryKey) {
                item.target.categoryKey = snapshot.blocks[0].categoryKey;
            }
        });
        logParserStep(traceId, '结果兜底/规范化完成', normalizeStart, {
            itemsCount: batch.items.length,
            defaultThemeIdApplied: !!defaultThemeId,
        });

        devLog(`[AiInput][${traceId}][Parser] parse completed (${formatMs(totalStart)})`, {
            itemsCount: batch.items.length,
            rawLength: raw.length,
            fastMode: !!input.fastMode,
            systemChars: system.length,
            userChars: user.length,
            maxResults: effectiveMaxResults,
        });
        warnSlowParserStep(traceId, 'parser.parse 总耗时', totalStart, 3000, {
            itemsCount: batch.items.length,
            requestChars: system.length + user.length,
            fastMode: !!input.fastMode,
        });

        return batch;
    }

    /**
     * 构建系统提示 - 增强主题选择指导，支持自定义提示词
     */
    private buildSystemPrompt(snapshot: any, customPrompt: string): string {
        // 提取主题列表用于示例
        const themeExamples = (snapshot.themes ?? []).slice(0, 5).map((t: any) => t.path).join(', ') || '';
        
        // 提取 Block 列表用于示例
        const blockExamples = (snapshot.blocks ?? []).slice(0, 5).map((b: any) => `${b.id}(${b.name})`).join(', ') || '';
        
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
            '    "categoryKey": "category-from-snapshot",',
            '    "blockId": "optional-block-id-from-snapshot",',
            '    "themeId": "theme-path-from-snapshot"',
            '  },',
            '  "fieldValues": { "fieldKey": "value" },',
            '  "meta": { "confidence": 0.9, "reason": "explanation" }',
            '}',
            '',
            '=== AVAILABLE BLOCKS ===',
            `Blocks: ${blockExamples}${snapshot.blocks?.length > 5 ? '...' : ''}`,
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
            'CATEGORY AND BLOCK SELECTION:',
            '1. categoryKey is REQUIRED and must come from snapshot.blocks[].categoryKey',
            '2. Prefer choosing categoryKey first; blockId is OPTIONAL',
            '3. Only return blockId when you are sure which specific template to use',
            '4. Common patterns:',
            '   - "任务"/"要做"/"待办" → categoryKey = "任务"',
            '   - "计划" → categoryKey = "计划"',
            '   - "总结"/"复盘" → categoryKey = "总结"',
            '   - "打卡"/"记录状态" → categoryKey = "打卡"',
            '   - "闪念"/"想法"/"灵感" → categoryKey = "闪念"',
            '   - If the field values imply a subcategory (such as 闪念/感受, 闪念/思考), put that exact value into fieldValues and still keep categoryKey = "闪念"',
            '5. Do not invent a new categoryKey that does not exist in snapshot.blocks[].categoryKey',
            '',
            'FIELD VALUES:',
            '1. Keys MUST be from snapshot.blocks[].fields[].key',
            '2. Date format: YYYY-MM-DD',
            '3. Time format: HH:mm',
            '4. Select/radio/rating: return the exact option.value or option.label from snapshot; the app will map it back to the configured option object',
            '5. Rating: use numeric value (1-5)',
            '6. Use current date/time if not specified in input',
            '',
            '=== EXAMPLE ===',
            'If user says "记录今天的一个闪念，我有点累" and themes include "健康/心情":',
            '{',
            '  "items": [{',
            '    "rawText": "记录今天的一个闪念，我有点累",',
            '    "target": { "categoryKey": "闪念", "themeId": "健康/心情" },',
            '    "fieldValues": { "思考分类": "闪念/感受", "日期": "2024-01-15", "内容": "我有点累" },',
            '    "meta": { "confidence": 0.95 }',
            '  }]',
            '}', 
        );

        return basePrompt.join('\n');
    }

    /**
     * 快速模式系统提示：压缩规则，降低首包等待前的模型上下文负担。
     */
    private buildFastSystemPrompt(customPrompt: string): string {
        const lines = [
            'You convert user text into Think plugin record commands.',
            'Return ONLY valid JSON. No markdown. No explanations.',
            'Schema: {"items":[{"rawText":"...","target":{"categoryKey":"...","blockId":"optional","themeId":"..."},"fieldValues":{},"meta":{"confidence":0.9}}]}',
            'Use only categoryKey/themeId/fields provided by user prompt.',
            'If uncertain, choose the first plausible theme and category.',
            'Dates: YYYY-MM-DD. Times: HH:mm. Use current time if needed.',
        ];

        if (customPrompt) {
            lines.push('', 'User custom rules, highest priority:', customPrompt);
        }

        return lines.join('\n');
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
            'Return JSON with target.categoryKey and target.themeId filled:',
        ].join('\n');
    }

    /**
     * 快速模式用户提示：只保留必要字段，减少请求体积和模型推理负担。
     */
    private buildFastUserPrompt(text: string, nowIso: string, maxResults: number, snapshot: any): string {
        const themePaths = (snapshot.themes ?? []).map((theme: any) => theme.path).filter(Boolean);
        const compactBlocks = (snapshot.blocks ?? []).map((block: any) => ({
            id: block.id,
            name: block.name,
            categoryKey: block.categoryKey,
            fields: (block.fields ?? []).map((field: any) => field.key || field.label).filter(Boolean),
        }));

        return [
            `Current time: ${nowIso}`,
            `Max results: ${maxResults}`,
            'Fast mode: prefer the simplest correct parse. Return compact JSON only.',
            '',
            'Themes:',
            themePaths.join(' | '),
            '',
            'Blocks:',
            JSON.stringify(compactBlocks),
            '',
            'User input:',
            text,
            '',
            'Return JSON: {"items":[{"rawText":"...","target":{"categoryKey":"...","themeId":"..."},"fieldValues":{},"meta":{"confidence":0.9}}]}',
        ].join('\n');
    }
}
