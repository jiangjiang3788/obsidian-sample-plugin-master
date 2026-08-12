// src/features/aiinput/registerCommands.ts
/**
 * AI 自然语言快速记录命令注册。
 *
 * 这个文件只保留命令 wiring：
 * - 从 app/public 获取 store/ui 服务
 * - 初始化 AI parser/http/cache
 * - 注册命令与 unload dispose
 *
 * 具体运行逻辑下沉到 aiNaturalInputCommand / aiSpeedTestCommand，避免命令注册文件继续膨胀。
 */

import type { PluginHost } from '@core/ports/public';
import { createServices } from '@/app/public';
import { AiConfigCache, AiHttpClient, AiNaturalLanguageRecordParser } from '@core/ai/public';
import { createTakeLatest } from '@shared/utils/public';

import { createNaturalInputCommandRunner } from './aiNaturalInputCommand';
import { createAiSpeedTestCommand } from './aiSpeedTestCommand';
import { createZustandSettingsProvider } from './aiInputRuntime';

/**
 * 注册 AI 输入相关命令。
 */
export function registerAiInputCommands(plugin: PluginHost): void {
    // Phase 4.3: 只能通过 app/public 获取 store（禁止 container 下沉）
    const { zustandStore: store, uiPort: ui } = createServices();

    // AI 解析服务依赖 settings provider；feature 层不直接读取 repository/container。
    const settingsProvider = createZustandSettingsProvider(store);
    const cache = new AiConfigCache(settingsProvider);
    const http = new AiHttpClient();
    const parser = new AiNaturalLanguageRecordParser(settingsProvider, cache, http);

    // 同一命令被重复触发时，自动取消上一次请求。
    const naturalInputTakeLatest = createTakeLatest('ai-natural-input');
    const speedTestTakeLatest = createTakeLatest('ai-speed-test');

    plugin.register(() => naturalInputTakeLatest.dispose());
    plugin.register(() => speedTestTakeLatest.dispose());

    const runNaturalInputCommand = createNaturalInputCommandRunner({
        plugin,
        store,
        ui,
        parser,
        takeLatest: naturalInputTakeLatest,
    });

    const runSpeedTestCommand = createAiSpeedTestCommand({
        store,
        ui,
        http,
        takeLatest: speedTestTakeLatest,
    });

    plugin.addCommand({
        id: 'think-ai-natural-input',
        name: 'AI: 自然语言快速记录',
        callback: () => runNaturalInputCommand(false),
    });

    plugin.addCommand({
        id: 'think-ai-natural-input-fast',
        name: 'AI: 自然语言快速记录（快速模式）',
        callback: () => runNaturalInputCommand(true),
    });

    plugin.addCommand({
        id: 'think-ai-speed-test',
        name: 'AI: 接口测速',
        callback: runSpeedTestCommand,
    });
}
