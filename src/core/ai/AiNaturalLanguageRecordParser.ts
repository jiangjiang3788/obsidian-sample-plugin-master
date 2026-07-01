// src/core/ai/AiNaturalLanguageRecordParser.ts
// 自然语言记录解析器实现 - 编排 AI prompt、HTTP 请求、JSON 解析与结果规范化

import type { INaturalLanguageRecordParser, ParseInput } from './INaturalLanguageRecordParser';
import type { NaturalRecordBatch } from '@/core/types/ai-schema';
import type { ISettingsProvider } from '@/core/services/types';
import { AiConfigCache } from './AiConfigCache';
import { AiHttpClient } from './AiHttpClient';
import { devLog } from '../utils/devLogger';
import { aiTraceId, formatMs, logParserStep, nowMs, warnSlowParserStep } from './AiParserTiming';
import { safeJsonParseBatch } from './AiParserJson';
import { compactSnapshotForFastMode, type AiParserSnapshot } from './AiParserSnapshot';
import {
    buildAiFastSystemPrompt,
    buildAiFastUserPrompt,
    buildAiSystemPrompt,
    buildAiUserPrompt,
} from './AiParserPrompts';
import { normalizeParsedBatch } from './AiParserNormalize';

export { cleanAiFieldValues, normalizeParsedBatch } from './AiParserNormalize';

/**
 * AI 自然语言记录解析器。
 *
 * V12 拆分后，这个类只保留流程编排：读取设置、拿 snapshot、构造 prompt、
 * 调用 HTTP、解析 JSON、规范化输出。字段清理、snapshot 压缩、prompt 文案和
 * JSON 兜底解析都进入同目录 helper，避免 AI 入口继续膨胀成巨型文件。
 * Domain policy marker for gates: prompt helpers still require `blockId is REQUIRED` and support
 * `goalTemplateId` as stable Template Variant id; parser re-exports `cleanAiFieldValues`
 * and `normalizeParsedBatch` for tests and downstream normalization checks.
 */
export class AiNaturalLanguageRecordParser implements INaturalLanguageRecordParser {
    constructor(
        private settingsProvider: ISettingsProvider,
        private cache: AiConfigCache,
        private http: AiHttpClient
    ) {}

    /** 解析自然语言文本。 */
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

        const snapshotStart = nowMs();
        const rawSnapshot = this.cache.getSnapshot(traceId);
        const snapshot: AiParserSnapshot = input.fastMode ? compactSnapshotForFastMode(rawSnapshot) : rawSnapshot;
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

        const customPrompt = ai.customPrompt?.trim() || '';
        const systemPromptStart = nowMs();
        const system = input.fastMode
            ? buildAiFastSystemPrompt(customPrompt)
            : buildAiSystemPrompt(snapshot, customPrompt);
        logParserStep(traceId, '构建 system prompt 完成', systemPromptStart, {
            fastMode: !!input.fastMode,
            systemChars: system.length,
            hasCustomPrompt: !!customPrompt,
        });
        warnSlowParserStep(traceId, '构建 system prompt', systemPromptStart, 50, { systemChars: system.length });

        const effectiveMaxResults = input.fastMode
            ? Math.min(ai.allowMultipleResults ? ai.maxResults : 1, 3)
            : (ai.allowMultipleResults ? ai.maxResults : 1);
        const userPromptStart = nowMs();
        const user = input.fastMode
            ? buildAiFastUserPrompt(input.text, nowIso, effectiveMaxResults, snapshot)
            : buildAiUserPrompt(input.text, nowIso, effectiveMaxResults, snapshot);
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

        const jsonParseStart = nowMs();
        const batch = safeJsonParseBatch(raw, traceId);
        logParserStep(traceId, 'safeJsonParseBatch 完成', jsonParseStart, {
            itemsCount: batch.items?.length ?? 0,
        });
        warnSlowParserStep(traceId, '解析 AI JSON', jsonParseStart, 100, { rawLength: raw.length });

        const normalizeStart = nowMs();
        normalizeParsedBatch(batch, snapshot, input.text, ai.defaultThemeId);

        if (!ai.allowMultipleResults && batch.items.length > 1) {
            batch.items = batch.items.slice(0, 1);
        }
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
}
