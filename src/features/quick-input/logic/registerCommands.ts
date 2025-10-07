// src/features/quick-input/logic/registerCommands.ts
import type ThinkPlugin from '@/main';
import { QuickInputModal } from '../ui/QuickInputModal';
import { AppStore } from '@state';

export function registerQuickInputCommands(plugin: ThinkPlugin, appStore: AppStore) {
    const settings = appStore.getSettings().inputSettings;

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
                // [核心修改] 调用简化后的构造函数，不再传递 store 实例
                new QuickInputModal(plugin.app, block.id).open();
            },
        });
    });
}
