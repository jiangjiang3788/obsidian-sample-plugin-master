import { devLog, devWarn } from '@core/public';
import type { AiSettings, ISettingsProvider, ThinkSettings } from '@core/public';
import { getZustandState, type AppStoreInstance } from '@/app/public';

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

export function nowMs(): number {
    try {
        return performance.now();
    } catch {
        return Date.now();
    }
}

export function elapsedMs(start: number): string {
    return `${(nowMs() - start).toFixed(2)}ms`;
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

export function readAiRuntimeConfig(store: AppStoreInstance, traceId: string): { settings: ThinkSettings; ai: AiSettings | undefined; blocks: unknown[] } {
    const readSettingsStart = nowMs();
    const settings = getZustandState(store, s => s.settings);
    const ai = settings.aiSettings;
    const blocks = settings.inputSettings?.blocks ?? [];
    logAiInputStep(traceId, '读取 settings 完成', readSettingsStart, {
        aiEnabled: !!ai?.enabled,
        hasEndpoint: !!ai?.apiEndpoint,
        endpointHost: summarizeEndpointHost(ai?.apiEndpoint),
        hasApiKey: !!ai?.apiKey,
        model: ai?.model ?? '(missing)',
        blocksCount: blocks.length,
        allowMultipleResults: !!ai?.allowMultipleResults,
        maxResults: ai?.maxResults,
        timeoutMs: ai?.requestTimeoutMs ?? 30000,
    });
    return { settings, ai, blocks };
}

export function validateAiRuntimeConfig(
    ui: AiInputUiPort,
    traceId: string,
    ai: AiSettings | undefined,
    blocks: unknown[]
): ai is AiSettings {
    if (!ai?.enabled) {
        devWarn(`[AiInput][${traceId}] 中止: AI 未启用`);
        ui.notice('AI 快速记录未启用，请在设置中开启', 4000);
        return false;
    }

    if (!ai.apiEndpoint || !ai.apiKey || !ai.model) {
        devWarn(`[AiInput][${traceId}] 中止: AI 配置不完整`, {
            hasEndpoint: !!ai.apiEndpoint,
            hasApiKey: !!ai.apiKey,
            hasModel: !!ai.model,
        });
        ui.notice('AI 配置不完整，请在设置中配置 API 端点、密钥和模型', 5000);
        return false;
    }

    if (blocks.length === 0) {
        devWarn(`[AiInput][${traceId}] 中止: 没有可用 Block`);
        ui.notice('没有可用的 Block 模板，请先在"快速输入"设置中创建', 5000);
        return false;
    }

    return true;
}
