import { container } from 'tsyringe';
import type ThinkPlugin from '@main';
import { z } from 'zod';

import {
    SETTINGS_PERSISTENCE_TOKEN,
    type ISettingsPersistence,
    THEME_MATCHER_TOKEN,
    devWarn,
} from '@core/public';

import { diDebug } from '@/app/diagnostics/diDiagnostics';

import { ThemeManager } from '@features/settings/ThemeManager';
import { isDisposed } from '@/app/runtime/lifecycleState';

/**
 * Step 0: 注册 app 层需要补充的 DI 绑定
 * - SettingsPersistence（封装 plugin.loadData/saveData）
 * - Theme matcher（ThemeManager）
 */
export function registerSettingsPersistence(plugin: ThinkPlugin): void {
    // 持久化前对设置做可选脱敏（AI apiKey）。
    // - 默认允许落盘（用户需求：重启后无需重新填写）
    // - 仍提供开关：aiSettings.persistApiKey=false 时强制剥离
    const persistedSettingsGuard = z
        .object({
            aiSettings: z
                .object({
                    apiKey: z.string().optional(),
                    persistApiKey: z.boolean().optional(),
                })
                .passthrough()
                .optional(),
        })
        .passthrough();

    const sanitizeForPersistence = (settings: any) => {
        // 仅用于保存，避免影响内存中的当前设置
        const cloned = JSON.parse(JSON.stringify(settings ?? {}));
        const parsed = persistedSettingsGuard.safeParse(cloned);
        const out: any = parsed.success ? parsed.data : cloned;

        if (out?.aiSettings && typeof out.aiSettings === 'object') {
            const persist = out.aiSettings.persistApiKey !== false;
            if (!persist) {
                if (out.aiSettings.apiKey) {
                    devWarn('[SettingsPersistence] persistApiKey=false，apiKey 将被剥离后保存');
                }
                out.aiSettings.apiKey = '';
            }
        }

        return out;
    };

    const settingsPersistence: ISettingsPersistence = {
        async loadData() {
            return await plugin.loadData();
        },
        async saveData(settings) {
            if (isDisposed()) return;
            await plugin.saveData(sanitizeForPersistence(settings));
        },
    };

    container.register(SETTINGS_PERSISTENCE_TOKEN, {
        useValue: settingsPersistence,
    });

    // DI diagnostics (dev only, opt-in)
    diDebug('after register SettingsPersistence, isRegistered =', container.isRegistered(SETTINGS_PERSISTENCE_TOKEN));

    // 注册 ThemeManager 并绑定到 THEME_MATCHER_TOKEN
    // 这样 core 层的 DataStore 可以通过接口依赖 ThemeManager
    container.registerSingleton(ThemeManager);
    container.register(THEME_MATCHER_TOKEN, { useToken: ThemeManager });
}