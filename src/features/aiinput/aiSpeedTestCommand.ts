import { AiHttpClient, devError, devLog, devWarn } from '@core/public';
import { CancelledError, createTakeLatest } from '@shared/public';
import type { AppStoreInstance } from '@/app/public';

import { startAiProgressNotice } from './aiProgressNotice';
import type { AiInputUiPort } from './aiInputRuntime';
import {
    createAiInputTraceId,
    elapsedMs,
    nowMs,
    readAiRuntimeConfig,
    summarizeEndpointHost,
    validateAiRuntimeConfig,
} from './aiInputRuntime';

export interface AiSpeedTestCommandDeps {
    store: AppStoreInstance;
    ui: AiInputUiPort;
    http: AiHttpClient;
    takeLatest: ReturnType<typeof createTakeLatest>;
}

export function createAiSpeedTestCommand({
    store,
    ui,
    http,
    takeLatest,
}: AiSpeedTestCommandDeps): () => Promise<void> {
    return async function runAiSpeedTestCommand(): Promise<void> {
        const traceId = createAiInputTraceId('ai-speed');
        const totalStart = nowMs();
        devLog(`[AiInput][${traceId}][SpeedTest] 命令触发`);

        const { ai, blocks } = readAiRuntimeConfig(store, traceId);
        if (!validateAiRuntimeConfig(ui, traceId, ai, blocks)) {
            devWarn(`[AiInput][${traceId}][SpeedTest] 配置校验未通过，总耗时 ${elapsedMs(totalStart)}`);
            return;
        }

        const notice = startAiProgressNotice(ui, {
            traceId,
            mode: 'speed-test',
            model: ai.model,
            endpointHost: summarizeEndpointHost(ai.apiEndpoint),
        });
        try {
            const testStart = nowMs();
            const content = await takeLatest.run((signal) => http.chatCompletion({
                baseURL: ai.apiEndpoint,
                apiKey: ai.apiKey,
                model: ai.model,
                temperature: 0,
                max_tokens: 64,
                timeoutMs: Math.min(ai.requestTimeoutMs ?? 30000, 30000),
                signal,
                traceId,
                messages: [
                    { role: 'system', content: 'You are a latency test endpoint. Return JSON only.' },
                    { role: 'user', content: 'Return exactly: {"ok":true}' },
                ],
            }));
            const duration = nowMs() - testStart;
            notice.hide();
            devLog(`[AiInput][${traceId}][SpeedTest] 测速完成 (${duration.toFixed(2)}ms)`, {
                contentPreview: content.slice(0, 120),
                endpointHost: summarizeEndpointHost(ai.apiEndpoint),
                model: ai.model,
            });
            if (duration >= 3000) {
                devWarn(`[AiInput][${traceId}][SpeedTest] 接口首包偏慢 (${duration.toFixed(2)}ms)`, {
                    endpointHost: summarizeEndpointHost(ai.apiEndpoint),
                    model: ai.model,
                });
            }
            ui.notice(`AI 接口测速完成：${duration.toFixed(0)}ms。${duration >= 10000 ? '接口首包偏慢，建议换模型/接口或使用快速模式。' : '接口状态还可以。'}`, 6000);
        } catch (e: any) {
            notice.hide();
            if (e instanceof CancelledError) {
                devWarn(`[AiInput][${traceId}][SpeedTest] 测速被取消，总耗时 ${elapsedMs(totalStart)}`);
                return;
            }
            devError(`[AiInput][${traceId}][SpeedTest] 测速失败，总耗时 ${elapsedMs(totalStart)}`, e);
            ui.notice(`AI 接口测速失败：${e?.message ?? e}`, 6000);
        }
    };
}
