import { devLog, devWarn, elapsedMs, nowMs } from '@core/utils/public';
import type { AiSettings, ThinkSettings } from '@core/types/public';
import type { ISettingsProvider } from '@core/services/public';
import { getZustandState, type AppStoreInstance } from '@/app/public';

import { getTemplateRecordTypes } from '@core/recordTypes/public';
import { AiConfigCache, AiHttpClient, AiNaturalLanguageRecordParser } from '@core/ai/public';
export interface AiInputUiPort {
    notice: (message: string, timeout?: number) => { setMessage?: (message: string) => void; hide?: () => void } | void;
}

/**
 * 创建一个基于 zustand store 的 SettingsProvider。
 *
 * AI parser/cache 只需要读取 settings，不应该知道 zustand 的具体形状。
 */
export function createZustandSettingsProvider(store: AppStoreInstance): ISettingsProvider {
    return {
        getSettings: () => getZustandState(store, s => s.settings)
    };
}

export { elapsedMs, nowMs };


export function createAiNaturalRecordParserFromStore(store: AppStoreInstance): AiNaturalLanguageRecordParser {
    const settingsProvider = createZustandSettingsProvider(store);
    const cache = new AiConfigCache(settingsProvider);
    const http = new AiHttpClient();
    return new AiNaturalLanguageRecordParser(settingsProvider, cache, http);
}


export function createAiInputTraceId(prefix = 'aiinput'): string {
    return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export function logAiInputStep(traceId: string, step: string, startedAt: number, extra?: Record<string, unknown>): void {
    devLog(`[AiInput][${traceId}] ${step} (${elapsedMs(startedAt)})`, extra ?? '');
}

export function warnAiInputSlowStep(traceId: string, step: string, startedAt: number, thresholdMs: number, extra?: Record<string, unknown>): void {
    const duration = nowMs() - startedAt;
    if (duration >= thresholdMs) {
        devWarn(`[AiInput][${traceId}] 慢步骤: ${step} (${duration.toFixed(2)}ms, threshold=${thresholdMs}ms)`, extra ?? '');
    }
}

export function summarizeEndpointHost(endpoint: string | undefined): string {
    try {
        return endpoint ? new URL(endpoint).host : '(missing)';
    } catch {
        return '(invalid-url)';
    }
}

export function readAiRuntimeConfig(store: AppStoreInstance, traceId: string): { settings: ThinkSettings; ai: AiSettings | undefined; recordTypes: unknown[] } {
    const readSettingsStart = nowMs();
    const settings = getZustandState(store, s => s.settings);
    const ai = settings.aiSettings;
    const recordTypes = [...getTemplateRecordTypes()];
    logAiInputStep(traceId, '读取 settings 完成', readSettingsStart, {
        aiEnabled: !!ai?.enabled,
        hasEndpoint: !!ai?.apiEndpoint,
        endpointHost: summarizeEndpointHost(ai?.apiEndpoint),
        hasApiKey: !!ai?.apiKey,
        model: ai?.model ?? '(missing)',
        recordTypesCount: recordTypes.length,
        allowMultipleResults: !!ai?.allowMultipleResults,
        maxResults: ai?.maxResults,
        timeoutMs: ai?.requestTimeoutMs ?? 30000,
    });
    return { settings, ai, recordTypes };
}

export function validateAiRuntimeConfig(
    ui: AiInputUiPort,
    traceId: string,
    ai: AiSettings | undefined,
    recordTypes: unknown[]
): ai is AiSettings {
    if (!ai?.enabled) {
        devWarn(`[AiInput][${traceId}] 中止: AI 未启用`);
        ui.notice('智能快速记录未启用，请在设置中开启', 4000);
        return false;
    }

    if (!ai.apiEndpoint || !ai.apiKey || !ai.model) {
        devWarn(`[AiInput][${traceId}] 中止: AI 配置不完整`, {
            hasEndpoint: !!ai.apiEndpoint,
            hasApiKey: !!ai.apiKey,
            hasModel: !!ai.model,
        });
        ui.notice('智能助手配置不完整，请在设置中配置接口地址、密钥和模型', 5000);
        return false;
    }

    if (recordTypes.length === 0) {
        devWarn(`[AiInput][${traceId}] 中止: 没有可用 Record Type`);
        ui.notice('没有可用的记录类型模板，请先在“快速输入”设置中创建', 5000);
        return false;
    }

    return true;
}
