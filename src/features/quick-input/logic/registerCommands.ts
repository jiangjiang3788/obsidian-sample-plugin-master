// src/features/quick-input/logic/registerCommands.ts
import type { ThinkPlugin } from '../../../main'; // [修改] 导入 ThinkPlugin 类型
import { QuickInputModal } from '../ui/QuickInputModal';
import { AppStore } from '@state/AppStore';

// [修改] 函数签名现在直接接收 ThinkPlugin 实例，而不是 ThinkContext
export function registerQuickInputCommands(plugin: ThinkPlugin) {
    // [移除] 不再需要从 ctx 中解构 plugin
    // const { plugin } = ctx; 
    const settings = AppStore.instance.getSettings().inputSettings;

    if (!settings || !settings.blocks || settings.blocks.length === 0) {
        console.log("ThinkPlugin: No Block Templates found to register commands.");
        return;
    }

    const { blocks } = settings;

    // [无变化] 这里的逻辑现在可以正确工作了，因为 plugin 是一个有效的实例
    blocks.forEach(block => {
        plugin.addCommand({
            id: `think-quick-input-unified-${block.id}`,
            name: `快速录入 - ${block.name}`,
            callback: () => {
                // [修改] 从 plugin.app 获取 app 实例
                new QuickInputModal(plugin.app, block.id, undefined).open();
            },
        });
    });
}