import { container } from 'tsyringe';
import type ThinkPlugin from '@main';
import { z } from 'zod';

import {
    SETTINGS_PERSISTENCE_TOKEN,
    type ISettingsPersistence,
    THEME_MATCHER_TOKEN,
    devLog,
    devWarn,
} from '@core/public';

import { ThemeManager } from '@features/settings/ThemeManager';

/**
 * Step 0: 注册 app 层需要补充的 DI 绑定
 * - SettingsPersistence（封装 plugin.loadData/saveData）
 * - Theme matcher（ThemeManager）
 */
export function registerSettingsPersistence(plugin: ThinkPlugin): void {
    // 安全：持久化前对设置做脱敏（目前仅对 AI apiKey 进行剥离）
    // 目标：机制保证（而不是“人肉记得别存 apiKey”）
    const persistedSettingsGuard = z
        .object({
            aiSettings: z
                .object({
                    apiKey: z.string().optional(),
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
            if (out.aiSettings.apiKey) {
                devWarn('[SettingsPersistence] apiKey 检测到将被写入磁盘，已强制剥离');
            }
            // 永不落盘 apiKey
            out.aiSettings.apiKey = '';
        }

        return out;
    };

    const settingsPersistence: ISettingsPersistence = {
        async loadData() {
            return await plugin.loadData();
        },
        async saveData(settings) {
            await plugin.saveData(sanitizeForPersistence(settings));
        },
    };

    container.register(SETTINGS_PERSISTENCE_TOKEN, {
        useValue: settingsPersistence,
    });

    // DI DEBUG: prove token is registered in THIS container instance
    devLog(
        '[DI DEBUG] after register SettingsPersistence, isRegistered =',
        container.isRegistered(SETTINGS_PERSISTENCE_TOKEN)
    );

    // 注册 ThemeManager 并绑定到 THEME_MATCHER_TOKEN
    // 这样 core 层的 DataStore 可以通过接口依赖 ThemeManager
    container.registerSingleton(ThemeManager);
    container.register(THEME_MATCHER_TOKEN, { useToken: ThemeManager });
}
