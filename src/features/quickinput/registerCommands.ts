// src/features/quickinput/registerCommands.ts
/**
 * P0-3: QuickInput 命令注册 - 通过 DI 获取 store
 * - 使用 container.resolve(STORE_TOKEN) 获取 store
 * - 使用纯函数 getZustandState(store, selector) 读取 settings
 */
import { container } from 'tsyringe';
import type ThinkPlugin from '@/main';
import { QuickInputModal } from './QuickInputModal';
import { getZustandState, STORE_TOKEN, type AppStoreInstance } from '@/app/public';

export function registerQuickInputCommands(plugin: ThinkPlugin) {
    // P0-3: 从 DI 容器获取 store
    const store = container.resolve<AppStoreInstance>(STORE_TOKEN);
    
    // P0-3: 使用纯函数版本，显式传入 store
    const settings = getZustandState(store, s => s.settings.inputSettings);

    if (!settings || !settings.blocks || settings.blocks.length === 0) {
        console.log("ThinkPlugin: No Block Templates found to register commands.");
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
