// src/features/aiinput/registerCommands.ts
/**
 * P0-3: AI 自然语言快速记录命令注册 - 通过 app/public 获取 store
 * - 禁止在 features 层直接 import tsyringe container
 * - 使用 createServices() 作为唯一入口拿到 zustandStore
 * - 使用纯函数 getZustandState(store, selector) 读取 settings
 */

import type ThinkPlugin from '@/main';
import { AiTextPromptModal, AiBatchConfirmModal } from '@/app/public';
import { AiConfigCache, AiHttpClient, AiNaturalLanguageRecordParser, devError, devLog, devWarn } from '@core/public';
import { createServices, getZustandState, type AppStoreInstance } from '@/app/public';
import type { ISettingsProvider } from '@core/public';
import { createTakeLatest, CancelledError } from '@shared/public';

/**
 * 创建一个基于 zustand store 的 SettingsProvider
 * P0-3: 使用纯函数版本，显式传入 store
 */
function createZustandSettingsProvider(store: AppStoreInstance): ISettingsProvider {
    return {
        getSettings: () => getZustandState(store, s => s.settings)
    };
}

function nowMs(): number {
    try {
        return performance.now();
    } catch {
        return Date.now();
    }
}

function elapsedMs(start: number): string {
    return `${(nowMs() - start).toFixed(2)}ms`;
}

function createAiInputTraceId(prefix = 'aiinput'): string {
    return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function logAiInputStep(traceId: string, step: string, startedAt: number, extra?: Record<string, unknown>): void {
    devLog(`[AiInput][${traceId}] ${step} (${elapsedMs(startedAt)})`, extra ?? '');
}

function warnAiInputSlowStep(traceId: string, step: string, startedAt: number, thresholdMs: number, extra?: Record<string, unknown>): void {
    const duration = nowMs() - startedAt;
    if (duration >= thresholdMs) {
        devWarn(`[AiInput][${traceId}] 慢步骤: ${step} (${duration.toFixed(2)}ms, threshold=${thresholdMs}ms)`, extra ?? '');
    }
}

function summarizeEndpointHost(endpoint: string | undefined): string {
    try {
        return endpoint ? new URL(endpoint).host : '(missing)';
    } catch {
        return '(invalid-url)';
    }
}

type AiProgressMode = 'parse' | 'speed-test';

function buildAiWaitingMessage(options: {
    fastMode?: boolean;
    mode: AiProgressMode;
    seconds: number;
    model: string;
    endpointHost: string;
}): string {
    const prefix = options.mode === 'speed-test'
        ? 'AI 接口测速中'
        : options.fastMode
            ? 'AI 快速解析中'
            : 'AI 正在解析';

    const estimate = options.mode === 'speed-test'
        ? '通常 3-12 秒；超过 10 秒说明接口首包偏慢'
        : options.fastMode
            ? '预计 10-25 秒；接口慢时会更久'
            : '预计 15-50 秒；当前主要等待接口首包';

    let line = '正在连接模型服务...';
    if (options.seconds >= 45) {
        line = '已经很久了，基本可以判断是接口/模型排队偏慢。';
    } else if (options.seconds >= 30) {
        line = '还在等服务端首包，插件本地还没有开始解析响应。';
    } else if (options.seconds >= 20) {
        line = '模型可能在排队或代理转发较慢，再坚持一下。';
    } else if (options.seconds >= 12) {
        line = '接口首包偏慢，但请求还活着。';
    } else if (options.seconds >= 6) {
        line = '正在等待服务端首包，这一步通常最耗时。';
    }

    return `${prefix} ${options.seconds}s\n${line}\n${estimate}\n${options.model} @ ${options.endpointHost}`;
}

function startAiProgressNotice(ui: { notice: (message: string, timeout?: number) => any }, options: {
    traceId: string;
    fastMode?: boolean;
    mode: AiProgressMode;
    model: string;
    endpointHost: string;
}) {
    const startedAt = nowMs();
    let lastSecond = -1;
    const handle = ui.notice(buildAiWaitingMessage({
        fastMode: options.fastMode,
        mode: options.mode,
        seconds: 0,
        model: options.model,
        endpointHost: options.endpointHost,
    }), 0);

    const update = () => {
        const seconds = Math.floor((nowMs() - startedAt) / 1000);
        if (seconds === lastSecond) return;
        lastSecond = seconds;

        const message = buildAiWaitingMessage({
            fastMode: options.fastMode,
            mode: options.mode,
            seconds,
            model: options.model,
            endpointHost: options.endpointHost,
        });
        try {
            handle?.setMessage?.(message);
        } catch {
            // no-op
        }

        if (seconds > 0 && seconds % 10 === 0) {
            devWarn(`[AiInput][${options.traceId}] 等待 AI 接口中：${seconds}s`, {
                mode: options.mode,
                fastMode: !!options.fastMode,
                model: options.model,
                endpointHost: options.endpointHost,
            });
        }
    };

    update();
    const timer = window.setInterval(update, 1000);

    return {
        hide(): void {
            window.clearInterval(timer);
            handle?.hide?.();
        },
        elapsedSeconds(): number {
            return Math.floor((nowMs() - startedAt) / 1000);
        },
    };
}

function readAiRuntimeConfig(store: AppStoreInstance, traceId: string) {
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

function validateAiRuntimeConfig(ui: { notice: (message: string, timeout?: number) => any }, traceId: string, ai: any, blocks: unknown[]): boolean {
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

/**
 * 注册 AI 输入相关命令
 * P0-3: 从 app/public 获取 store
 */
export function registerAiInputCommands(plugin: ThinkPlugin) {
    // Phase 4.3: 只能通过 app/public 获取 store（禁止 container 下沉）
    const { zustandStore: store, uiPort: ui } = createServices();
    
    // P0-3: 创建基于 zustand 的 settings provider（传入 store）
    const settingsProvider = createZustandSettingsProvider(store);
    
    // 创建 AI 相关服务实例
    const cache = new AiConfigCache(settingsProvider);
    const http = new AiHttpClient();
    const parser = new AiNaturalLanguageRecordParser(settingsProvider, cache, http);

    // B-Ext: 同一命令被重复触发时，自动取消上一次解析请求
    const takeLatest = createTakeLatest('ai-natural-input');
    const speedTestTakeLatest = createTakeLatest('ai-speed-test');
    // 确保插件卸载时取消潜在的未完成请求
    plugin.register(() => takeLatest.dispose());
    plugin.register(() => speedTestTakeLatest.dispose());

    async function runNaturalInputCommand(fastMode: boolean): Promise<void> {
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
    }

    // 注册命令：AI 自然语言快速记录
    plugin.addCommand({
        id: 'think-ai-natural-input',
        name: 'AI: 自然语言快速记录',
        callback: () => runNaturalInputCommand(false),
    });

    // 注册命令：AI 自然语言快速记录（快速模式）
    plugin.addCommand({
        id: 'think-ai-natural-input-fast',
        name: 'AI: 自然语言快速记录（快速模式）',
        callback: () => runNaturalInputCommand(true),
    });

    // 注册命令：AI 接口测速
    plugin.addCommand({
        id: 'think-ai-speed-test',
        name: 'AI: 接口测速',
        callback: async () => {
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
                const content = await speedTestTakeLatest.run((signal) => http.chatCompletion({
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
        },
    });
}
