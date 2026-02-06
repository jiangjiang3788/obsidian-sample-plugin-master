// src/features/settings/registerFeature.ts
// ---------------------------------------------------------------------------
// Feature registration (settings + dashboard)
// ---------------------------------------------------------------------------
//
// Purpose:
// - Let each feature declare its own boot metadata (id/mode/delay/boot) in one place.
// - FeatureLoader only orchestrates; it doesn't hardcode every feature's details.
//
// IMPORTANT: This module must NOT import app internals directly.
// - It may import *types* from the app public API (via @capabilities) if needed.
// - Use `import type` to avoid runtime cycles (app -> features -> app).

import type ThinkPlugin from '@main';
import type { ActionService, DataStore } from '@core/public';
import type { FeatureRegistry, UIFeatureBootContext } from '@capabilities';

import type { RendererService } from './RendererService';
import { setupDashboard, setupSettings } from './index';

export interface SettingsFeatureDeps {
    plugin: ThinkPlugin;
    dataStore: DataStore;
    rendererService: RendererService;
    actionService: ActionService;
}

export function registerSettingsFeatures(
    registry: FeatureRegistry<UIFeatureBootContext>,
    deps: SettingsFeatureDeps
): void {
    // Dashboard: blocking (needs initial data scan)
    registry.register({
        id: 'dashboard',
        description: 'Dashboard (VaultWatcher + CodeblockEmbedder)',
        bootMode: 'blocking',
        boot: async (ctx) => {
            if (ctx?.dataScanPromise) {
                await ctx.dataScanPromise;
            }

            setupDashboard({
                plugin: deps.plugin,
                dataStore: deps.dataStore,
                rendererService: deps.rendererService,
                actionService: deps.actionService,
            });
        },
    });

    // Settings: background (avoid blocking first paint)
    registry.register({
        id: 'settings',
        description: 'SettingsTab + open-settings command',
        bootMode: 'background',
        delayMs: 150,
        boot: () => {
            setupSettings({
                app: deps.plugin.app,
                plugin: deps.plugin,
                dataStore: deps.dataStore,
            });

            // Open settings command
            deps.plugin.addCommand({
                id: 'think-open-settings',
                name: '打开 Think 插件设置',
                callback: () => {
                    // Obsidian setting 面板 API 没有稳定的类型定义（不同版本可能变化）
                    // 这里保留最小的显式 any 断言，避免被迫关闭整文件类型检查。
                    (deps.plugin.app as any).setting?.open?.();
                    (deps.plugin.app as any).setting?.openTabById?.(deps.plugin.manifest.id);
                },
            });
        },
    });
}
