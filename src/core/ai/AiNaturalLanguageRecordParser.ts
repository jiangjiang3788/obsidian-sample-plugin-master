// src/core/ai/AiNaturalLanguageRecordParser.ts
// 自然语言记录解析器实现 - 核心 Prompt + JSON 解析

import type { INaturalLanguageRecordParser, ParseInput } from './INaturalLanguageRecordParser';
import type { NaturalRecordBatch } from '@/core/types/ai-schema';
import { isSystemRecordContextField } from '@/core/goal';
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


function ensureCommandTarget(item: any): Record<string, any> {
    if (!item.target || typeof item.target !== 'object') item.target = {};
    return item.target;
}

export function cleanAiFieldValues(values: any): Record<string, any> {
    const result: Record<string, any> = {};
    if (!values || typeof values !== 'object') return result;
    for (const [key, value] of Object.entries(values)) {
        if (isSystemRecordContextField(key)) continue;
        result[key] = value;
    }
    return result;
}

function findBlockByTarget(snapshot: any, target: Record<string, any>): any | null {
    const blocks = snapshot.blocks ?? [];
    const blockId = String(target.blockId || '').trim();
    const categoryKey = String(target.categoryKey || '').trim();
    return blocks.find((block: any) => block.id === blockId)
        || blocks.find((block: any) => block.categoryKey === categoryKey || block.name === categoryKey)
        || null;
}

function findGoalByTarget(snapshot: any, target: Record<string, any>): any | null {
    const goals = snapshot.goals ?? [];
    const goalPath = String(target.goalPath || '').trim();
    const goalId = String(target.goalId || '').trim();
    return goals.find((goal: any) => goal.id === goalId)
        || goals.find((goal: any) => goal.path === goalPath || goal.title === goalPath)
        || null;
}

function findPresetByTarget(snapshot: any, target: Record<string, any>): any | null {
    const presets = snapshot.goalPresets ?? [];
    const explicitId = String(target.goalTemplateId || target.templateId || '').trim();
    const variantId = String(target.templateVariantId || target.goalTemplateVariantId || '').trim();
    const goalPath = String(target.goalPath || '').trim();
    const goalId = String(target.goalId || '').trim();
    const blockId = String(target.blockId || '').trim();
    const categoryKey = String(target.categoryKey || '').trim();
    if (explicitId) {
        const exact = presets.find((preset: any) => preset.id === explicitId || preset.goalTemplateId === explicitId);
        if (exact) return exact;
    }
    const candidates = presets.filter((preset: any) => {
        const goalMatches = !goalPath && !goalId ? true : preset.goalPath === goalPath || preset.goalId === goalId;
        const blockMatches = !blockId && !categoryKey ? true : preset.blockId === blockId || preset.categoryKey === categoryKey;
        return goalMatches && blockMatches;
    });
    if (variantId) {
        const exactVariant = candidates.find((preset: any) => preset.variantId === variantId || preset.id === variantId || preset.goalTemplateId === variantId);
        if (exactVariant) return exactVariant;
    }
    return candidates.find((preset: any) => preset.isDefault) || candidates[0] || null;
}

export function normalizeParsedBatch(batch: NaturalRecordBatch, snapshot: any, rawText: string, defaultThemeId?: string): NaturalRecordBatch {
    if (!batch.items) batch.items = [];
    batch.items.forEach((item: any) => {
        if (!item.rawText) item.rawText = rawText;
        const target = ensureCommandTarget(item);
        item.fieldValues = cleanAiFieldValues(item.fieldValues);

        const preset = findPresetByTarget(snapshot, target);
        if (preset) {
            target.goalTemplateId = preset.goalTemplateId || preset.id;
            target.templateVariantId = preset.variantId;
            target.goalId = preset.goalId;
            target.goalPath = preset.goalPath;
            target.blockId = preset.blockId;
            target.categoryKey = preset.categoryKey;
            if (!target.themeId && preset.themePath) target.themeId = preset.themePath;
        }

        const block = findBlockByTarget(snapshot, target);
        if (block) {
            target.blockId = target.blockId || block.id;
            target.categoryKey = target.categoryKey || block.categoryKey;
        } else if (!target.categoryKey && snapshot.blocks?.[0]?.categoryKey) {
            target.categoryKey = snapshot.blocks[0].categoryKey;
            target.blockId = snapshot.blocks[0].id;
        }

        const goal = findGoalByTarget(snapshot, target);
        if (goal) {
            target.goalId = target.goalId || goal.id;
            target.goalPath = target.goalPath || goal.path;
            if (!target.themeId && goal.themePath) target.themeId = goal.themePath;
        }

        if (!target.themeId && defaultThemeId) target.themeId = defaultThemeId;
    });
    return batch;
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
        goals: (snapshot.goals ?? []).map((goal: any) => ({
            path: goal.path,
        })),
        goalPresets: (snapshot.goalPresets ?? []).map((preset: any) => ({
            goalPath: preset.goalPath,
            blockId: preset.blockId,
            categoryKey: preset.categoryKey,
            variantId: preset.variantId,
            goalTemplateId: preset.goalTemplateId || preset.id,
            name: preset.name,
            themePath: preset.themePath,
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
            goalsCount: snapshot.goals?.length ?? 0,
            goalPresetsCount: snapshot.goalPresets?.length ?? 0,
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
            goalsJsonChars: JSON.stringify(snapshot.goals || []).length,
            goalPresetsJsonChars: JSON.stringify(snapshot.goalPresets || []).length,
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
        normalizeParsedBatch(batch, snapshot, input.text, ai.defaultThemeId);

        // 兜底：若不允许多结果，截断为 1
        if (!ai.allowMultipleResults && batch.items.length > 1) {
            batch.items = batch.items.slice(0, 1);
        }

        // 兜底：maxResults / fastMode 上限
        if (effectiveMaxResults && batch.items.length > effectiveMaxResults) {
            batch.items = batch.items.slice(0, effectiveMaxResults);
        }

        logParserStep(traceId, '结果兜底/规范化完成', normalizeStart, {
            itemsCount: batch.items.length,
            defaultThemeIdApplied: !!ai.defaultThemeId,
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
        const goalExamples = (snapshot.goals ?? []).slice(0, 6).map((g: any) => g.path).join(', ') || '';
        const presetExamples = (snapshot.goalPresets ?? []).slice(0, 8).map((p: any) => `${p.goalPath} × ${p.blockId || p.categoryKey} → ${p.name}${p.themePath ? `(${p.themePath})` : ''}`).join('；') || '';
        
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
            '    "blockId": "core-block-id-from-snapshot",',
            '    "categoryKey": "optional-legacy-category-label-from-snapshot",',
            '    "goalPath": "goal-path-from-snapshot",',
            '    "templateVariantId": "preset-variant-from-snapshot",',
            '    "themeId": "theme-path-from-selected-preset"',
            '  },',
            '  "fieldValues": { "fieldKey": "value" },',
            '  "meta": { "confidence": 0.9, "reason": "explanation" }',
            '}',
            '',
            '=== AVAILABLE BLOCKS ===',
            `Blocks: ${blockExamples}${snapshot.blocks?.length > 5 ? '...' : ''}`,
            '',
            '=== AVAILABLE GOALS ===',
            `Goal paths: ${goalExamples}${snapshot.goals?.length > 6 ? '...' : ''}`,
            '',
            '=== AVAILABLE GOAL PRESETS ===',
            `Goal presets: ${presetExamples}${snapshot.goalPresets?.length > 8 ? '...' : ''}`,
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
            'GOAL / PRESET SELECTION:',
            '1. goalPath is REQUIRED when snapshot.goals is not empty. Use a FULL goal path from snapshot.goals[].path.',
            '2. Choose blockId first, then choose the best preset from snapshot.goalPresets with the same goalPath and blockId. categoryKey is only a legacy helper.',
            '3. If a preset clearly matches user words, return target.goalTemplateId = preset.goalTemplateId/id and target.templateVariantId = preset.variantId.',
            '4. If several presets match, prefer preset.isDefault or the closest themePath/name match.',
            '5. themeId should come from the selected preset themePath or selected goal themePath. Theme is only a form default/stat dimension, not the main template selector.',
            '6. Never output legacy templateSourceType values such as deprecated template source values.',
            '',
            'BLOCK SELECTION:',
            '1. blockId is REQUIRED and must come from snapshot.blocks[].id or snapshot.goalPresets[].blockId, e.g. core.task/core.habit/core.plan.',
            '2. categoryKey is optional legacy display text. Return it only when it helps compatibility, and it must come from snapshot.blocks[].categoryKey.',
            '3. Common patterns:',
            '   - "任务"/"要做"/"待办" → blockId = "core.task"',
            '   - "计划" → blockId = "core.plan"',
            '   - "总结"/"复盘" → blockId = "core.review"',
            '   - "打卡"/"记录状态" → blockId = "core.habit"',
            '   - "闪念"/"想法"/"灵感" → blockId = "core.thought"',
            '4. Do not invent blockId or categoryKey that does not exist in the snapshot.',
            '',
            'FIELD VALUES:',
            '1. Keys MUST be from the selected preset.fields[].key when preset is selected; otherwise use snapshot.blocks[].fields[].key',
            '2. Date format: YYYY-MM-DD',
            '3. Time format: HH:mm',
            '4. Select/radio/rating: return the exact option.value or option.label from snapshot; the app will map it back to the configured option object',
            '5. Rating: use numeric value (1-5)',
            '6. Use current date/time if not specified in input',
            '7. Do NOT put system context fields into fieldValues: goalId, goalPath, themePath, templateId, templateSourceType, templateVariantId, 周期, 周期ID, 周期粒度. Put goal/preset/theme information under target only.',
            '8. For 计划/总结, do not invent 周期 fields. The app derives period from the selected preset periodPolicy and 日期.',
            '',
            '=== EXAMPLE ===',
            'If user says "记录今天运动 30 分钟" and goal/preset include "#强健身体 × core.habit → 运动打卡(健康/运动)":',
            '{',
            '  "items": [{',
            '    "rawText": "记录今天运动 30 分钟",',
            '    "target": { "blockId": "core.habit", "categoryKey": "打卡", "goalPath": "#强健身体", "goalTemplateId": "goal-template.goal.health.core.habit.running", "templateVariantId": "running", "themeId": "健康/运动" },',
            '    "fieldValues": { "日期": "2024-01-15", "内容": "运动 30 分钟" },',
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
            'Schema: {"items":[{"rawText":"...","target":{"blockId":"core.task","categoryKey":"optional legacy label","goalPath":"...","goalTemplateId":"optional","templateVariantId":"optional","themeId":"..."},"fieldValues":{},"meta":{"confidence":0.9}}]}',
            'Use only goalPath/blockId/categoryKey/goalTemplateId/templateVariantId/themeId/fields provided by user prompt.',
            'If uncertain, choose the first plausible goal, preset/theme, and blockId.',
            'Dates: YYYY-MM-DD. Times: HH:mm. Never put goal/theme/template/period system fields into fieldValues.',
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
            '=== AVAILABLE GOALS (choose one when possible) ===',
            JSON.stringify(snapshot.goals || [], null, 2),
            '',
            '=== AVAILABLE GOAL PRESETS (prefer matching goalPath + Block) ===',
            JSON.stringify(snapshot.goalPresets || [], null, 2),
            '',
            '=== AVAILABLE THEMES (use preset themePath or choose one) ===',
            JSON.stringify(snapshot.themes, null, 2),
            '',
            '=== AVAILABLE BLOCKS ===',
            JSON.stringify(snapshot.blocks, null, 2),
            '',
            '=== USER INPUT ===',
            text,
            '',
            'Return JSON with target.goalPath, target.blockId, optional target.categoryKey, target.goalTemplateId/templateVariantId when possible, and target.themeId filled. Put only user-editable fields in fieldValues:',
        ].join('\n');
    }

    /**
     * 快速模式用户提示：只保留必要字段，减少请求体积和模型推理负担。
     */
    private buildFastUserPrompt(text: string, nowIso: string, maxResults: number, snapshot: any): string {
        const themePaths = (snapshot.themes ?? []).map((theme: any) => theme.path).filter(Boolean);
        const goalPaths = (snapshot.goals ?? []).map((goal: any) => goal.path).filter(Boolean);
        const compactPresets = (snapshot.goalPresets ?? []).map((preset: any) => ({
            goalPath: preset.goalPath,
            blockId: preset.blockId,
            categoryKey: preset.categoryKey,
            variantId: preset.variantId,
            goalTemplateId: preset.goalTemplateId || preset.id,
            name: preset.name,
            themePath: preset.themePath,
        }));
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
            'Goals:',
            goalPaths.join(' | '),
            '',
            'Goal presets:',
            JSON.stringify(compactPresets),
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
            'Return JSON: {"items":[{"rawText":"...","target":{"goalPath":"...","blockId":"...","categoryKey":"optional","goalTemplateId":"optional","templateVariantId":"optional","themeId":"..."},"fieldValues":{},"meta":{"confidence":0.9}}]}',
        ].join('\n');
    }
}
