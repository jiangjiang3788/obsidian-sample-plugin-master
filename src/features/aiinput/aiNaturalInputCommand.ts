import type { PluginHost } from '@core/ports/public';
import { AiTextPromptModal, AiBatchConfirmModal, type AppStoreInstance } from '@/app/public';
import { AiNaturalLanguageRecordParser } from '@core/ai/public';
import { devError, devLog, devWarn } from '@core/utils/public';
import { CancelledError, createTakeLatest } from '@shared/utils/public';

import { startAiProgressNotice } from './aiProgressNotice';
import type { AiInputUiPort } from './aiInputRuntime';
import {
    createAiInputTraceId,
    elapsedMs,
    logAiInputStep,
    nowMs,
    readAiRuntimeConfig,
    summarizeEndpointHost,
    validateAiRuntimeConfig,
    warnAiInputSlowStep,
} from './aiInputRuntime';

export interface AiNaturalInputCommandDeps {
    plugin: PluginHost;
    store: AppStoreInstance;
    ui: AiInputUiPort;
    parser: AiNaturalLanguageRecordParser;
    takeLatest: ReturnType<typeof createTakeLatest>;
}

export function createNaturalInputCommandRunner({
    plugin,
    store,
    ui,
    parser,
    takeLatest,
}: AiNaturalInputCommandDeps): (fastMode: boolean) => Promise<void> {
    return async function runNaturalInputCommand(fastMode: boolean): Promise<void> {
        const traceId = createAiInputTraceId(fastMode ? 'aiinput-fast' : 'aiinput');
        const totalStart = nowMs();
        devLog(`[AiInput][${traceId}] 命令触发`, { fastMode });

        const { ai, blocks } = readAiRuntimeConfig(store, traceId);
        if (!validateAiRuntimeConfig(ui, traceId, ai, blocks)) {
            devWarn(`[AiInput][${traceId}] 配置校验未通过，总耗时 ${elapsedMs(totalStart)}`, { fastMode });
            return;
        }

        const openPromptStart = nowMs();
        devLog(`[AiInput][${traceId}] 准备打开输入 Modal`, { fastMode });
        const promptModal = new AiTextPromptModal(plugin.app);
        const text = await promptModal.openAndGetValue();
        logAiInputStep(traceId, '输入 Modal 关闭', openPromptStart, {
            hasText: !!text?.trim(),
            textLength: text?.length ?? 0,
            fastMode,
        });

        if (!text?.trim()) {
            devLog(`[AiInput][${traceId}] 用户取消或输入为空，总耗时 ${elapsedMs(totalStart)}`, { fastMode });
            return;
        }

        const noticeStart = nowMs();
        const loadingNotice = startAiProgressNotice(ui, {
            traceId,
            fastMode,
            mode: 'parse',
            model: ai.model,
            endpointHost: summarizeEndpointHost(ai.apiEndpoint),
        });
        logAiInputStep(traceId, '显示动态等待 notice 完成', noticeStart, { fastMode });

        try {
            const parseStart = nowMs();
            devLog(`[AiInput][${traceId}] before parser.parse`, {
                fastMode,
                inputLength: text.length,
                model: ai.model,
                endpointHost: summarizeEndpointHost(ai.apiEndpoint),
            });

            const batch = await takeLatest.run((signal) => parser.parse({ text, now: new Date(), signal, traceId, fastMode }));

            logAiInputStep(traceId, 'after parser.parse', parseStart, {
                fastMode,
                itemsCount: batch.items?.length ?? 0,
            });
            warnAiInputSlowStep(traceId, 'parser.parse 总耗时', parseStart, fastMode ? 1500 : 3000, { fastMode });

            const hideNoticeStart = nowMs();
            loadingNotice.hide();
            logAiInputStep(traceId, '关闭 loading notice 完成', hideNoticeStart, { fastMode });

            if (!batch.items?.length) {
                devWarn(`[AiInput][${traceId}] AI 返回空结果，总耗时 ${elapsedMs(totalStart)}`, { fastMode });
                ui.notice('AI 未能识别出可记录内容，请换种说法再试', 5000);
                return;
            }

            const resultNoticeStart = nowMs();
            ui.notice(`${fastMode ? 'AI 快速模式' : 'AI'} 识别出 ${batch.items.length} 条记录`, 2000);
            logAiInputStep(traceId, '显示识别数量 notice 完成', resultNoticeStart, { fastMode });

            const confirmModalStart = nowMs();
            new AiBatchConfirmModal(
                plugin.app,
                {
                    title: fastMode ? '确认记录（快速模式）' : '确认记录',
                    items: batch.items,
                }
            ).open();
            logAiInputStep(traceId, '打开批量确认 Modal 完成', confirmModalStart, {
                fastMode,
                itemsCount: batch.items.length,
            });

            devLog(`[AiInput][${traceId}] 命令完成，总耗时 ${elapsedMs(totalStart)}`, { fastMode });
        } catch (e: any) {
            const catchStart = nowMs();
            if (e instanceof CancelledError) {
                loadingNotice.hide();
                devWarn(`[AiInput][${traceId}] 请求被 takeLatest 取消，总耗时 ${elapsedMs(totalStart)}`, { fastMode });
                return;
            }
            loadingNotice.hide();
            logAiInputStep(traceId, '异常清理 loading notice 完成', catchStart, { fastMode });
            devError(`[AiInput][${traceId}] AI 解析失败，总耗时 ${elapsedMs(totalStart)}`, e);
            ui.notice(`AI 解析失败：${e?.message ?? e}`, 6000);
        }
    };
}
