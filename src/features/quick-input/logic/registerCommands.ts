// src/features/quick-input/logic/registerCommands.ts
import type { ThinkContext } from '../../../main';
import { QuickInputModal } from '../ui/QuickInputModal';
import { AppStore } from '@state/AppStore';

export function registerQuickInputCommands(ctx: ThinkContext) {
    const { plugin } = ctx;
    const appStore = AppStore.instance;
    const settings = appStore.getSettings().inputSettings;

    if (!settings || !settings.blocks || settings.blocks.length === 0) {
        console.log("ThinkPlugin: No Block Templates found to register commands.");
        return;
    }

    const { blocks, themes, overrides } = settings;

    // 1. 注册基础 Block 命令 (默认命令)
    blocks.forEach(block => {
        plugin.addCommand({
            id: `think-quick-input-base-${block.id}`,
            name: `快速录入 - ${block.name} (默认)`,
            callback: () => {
                new QuickInputModal(ctx.app, block.id, undefined).open();
            },
        });
    });

    // 2. 注册所有 (主题 x Block) 的组合命令
    themes.forEach(theme => {
        blocks.forEach(block => {
            // 检查是否存在对此组合的禁用覆写
            const override = overrides.find(o => o.themeId === theme.id && o.blockId === block.id);
            if (override && override.status === 'disabled') {
                // 如果被禁用了，则不为此组合创建命令
                return;
            }

            plugin.addCommand({
                id: `think-quick-input-theme-${theme.id}-${block.id}`,
                name: `快速录入 - ${theme.path} / ${block.name}`,
                callback: () => {
                    new QuickInputModal(ctx.app, block.id, theme.id).open();
                },
            });
        });
    });
}