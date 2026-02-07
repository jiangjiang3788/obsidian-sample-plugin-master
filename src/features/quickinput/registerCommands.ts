// src/features/quickinput/registerCommands.ts
/**
 * P0-3: QuickInput 命令注册 - 通过 app/public 获取 store
 * - 禁止在 features 层直接 import tsyringe container
 * - 使用 createServices() 作为唯一入口拿到 zustandStore
 * - 使用纯函数 getZustandState(store, selector) 读取 settings
 */
import type ThinkPlugin from '@/main';
import { QuickInputModal } from './QuickInputModal';
import { createServices, getZustandState } from '@/app/public';
import { devWarn } from '@core/public';

export function registerQuickInputCommands(plugin: ThinkPlugin) {
    // Phase 4.3: 只能通过 app/public 获取 store（禁止 container 下沉）
    const { zustandStore: store } = createServices();
    
    // P0-3: 使用纯函数版本，显式传入 store
    const settings = getZustandState(store, s => s.settings.inputSettings);

    if (!settings || !settings.blocks || settings.blocks.length === 0) {
        devWarn('ThinkPlugin: No Block Templates found to register commands.');
        return;
    }

    const { blocks } = settings;

    blocks.forEach((block: { id: string; name: string }) => {
        plugin.addCommand({
            id: `think-quick-input-unified-${block.id}`,
            name: `快速录入 - ${block.name}`,
            callback: () => {
                // 调用简化后的构造函数，不再传递 store 实例
                new QuickInputModal(plugin.app, block.id).open();
            },
        });
    });
}
