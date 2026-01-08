// src/features/quickinput/registerCommands.ts
/**
 * S7.1: QuickInput 命令注册 - 移除 AppStore 依赖
 * - 使用 zustand getAppStoreInstance() 获取 settings
 * - 禁止使用 AppStore
 */
import type ThinkPlugin from '@/main';
import { QuickInputModal } from './QuickInputModal';
import { getAppStoreInstance } from '@/app/store/useAppStore';

export function registerQuickInputCommands(plugin: ThinkPlugin) {
    // S7.1: 使用 zustand store 获取 settings
    const store = getAppStoreInstance();
    const settings = store.getState().settings.inputSettings;

    if (!settings || !settings.blocks || settings.blocks.length === 0) {
        console.log("ThinkPlugin: No Block Templates found to register commands.");
        return;
    }

    const { blocks } = settings;

    blocks.forEach(block => {
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
