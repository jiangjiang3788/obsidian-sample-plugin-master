// src/features/quick-input/logic/registerCommands.ts
import type { ThinkPlugin } from '../../../main';
import { QuickInputModal } from '../ui/QuickInputModal';
import { AppStore } from '@state/AppStore';

// [修改] 确认函数签名是直接接收 plugin 和 appStore 两个实例
export function registerQuickInputCommands(plugin: ThinkPlugin, appStore: AppStore) {
    // [修改] 从传入的 appStore 参数获取设置，彻底告别 AppStore.instance
    const settings = appStore.getSettings().inputSettings;

    if (!settings || !settings.blocks || settings.blocks.length === 0) {
        console.log("ThinkPlugin: No Block Templates found to register commands.");
        return;
    }

    const { blocks } = settings;

    // 这里的逻辑现在可以正确工作了，因为 plugin 是一个有效的实例
    blocks.forEach(block => {
        plugin.addCommand({
            id: `think-quick-input-unified-${block.id}`,
            name: `快速录入 - ${block.name}`,
            callback: () => {
                // QuickInputModal 的调用逻辑无需修改
                // 注意：这里我们假设 QuickInputModal 内部也不再依赖单例
                // 如果它内部也报错，我们同样需要将 appStore 和 dataStore 实例传给它
                new QuickInputModal(plugin.app, block.id, undefined, undefined, undefined, plugin.dataStore, plugin.appStore).open();
            },
        });
    });
}