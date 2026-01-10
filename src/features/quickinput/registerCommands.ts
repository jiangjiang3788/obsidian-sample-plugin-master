// src/features/quickinput/registerCommands.ts
/**
 * P0-2: QuickInput 命令注册 - 使用 getZustandState 读取状态
 * - 使用 getZustandState() 读取 settings（只读）
 * - 写操作通过 useCases（从 DI 获取）
 */
import type ThinkPlugin from '@/main';
import { QuickInputModal } from './QuickInputModal';
import { getZustandState } from '@/app/store/useAppStore';

export function registerQuickInputCommands(plugin: ThinkPlugin) {
    // P0-2: 使用 getZustandState 读取 settings
    const settings = getZustandState(s => s.settings.inputSettings);

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
