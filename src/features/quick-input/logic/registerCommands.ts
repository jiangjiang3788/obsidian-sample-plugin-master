// src/features/quick-input/logic/registerCommands.ts
import type { ThinkContext } from '../../../main';
import { QuickInputModal } from '../ui/QuickInputModal';
import { AppStore } from '@state/AppStore';

export function registerQuickInputCommands(ctx: ThinkContext) {
    const { plugin } = ctx;
    const settings = AppStore.instance.getSettings().inputSettings;

    if (!settings || !settings.blocks || settings.blocks.length === 0) {
        console.log("ThinkPlugin: No Block Templates found to register commands.");
        return;
    }

    const { blocks } = settings;

    // [核心修改] 只遍历 blocks，为每个 block 创建一个命令
    blocks.forEach(block => {
        plugin.addCommand({
            id: `think-quick-input-unified-${block.id}`,
            name: `快速录入 - ${block.name}`,
            callback: () => {
                // 打开模态框，但不传递 themeId，让模态框内部处理主题选择
                new QuickInputModal(ctx.app, block.id, undefined).open();
            },
        });
    });
}