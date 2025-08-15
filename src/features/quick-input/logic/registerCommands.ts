// src/features/quick-input/logic/registerCommands.ts
// [修改] 导入 ThinkContext 类型
import type { ThinkContext } from '../../../main';
import { QuickInputModal } from '../ui/QuickInputModal';
import { AppStore } from '@state/AppStore';

// [修改] 函数参数从 plugin 改回 ctx (ThinkContext)
export function registerQuickInputCommands(ctx: ThinkContext) {

    // [修改] 从 ctx 对象中解构出 plugin 实例
    const { plugin } = ctx;

    const appStore = AppStore.instance;
    
    const settings = appStore.getSettings().inputSettings;
    if (!settings || !settings.templates) {
        console.log("ThinkPlugin: No input templates found to register commands.");
        return;
    }

    settings.templates.forEach(template => {
        const [themePart, typePart] = template.name.split('#type:');
        const themeName = themePart.replace('theme:', '');
        const typeName = typePart;
        
        const commandName = themeName === 'Base' 
            ? `快速录入 - ${typeName} (默认)`
            : `快速录入 - ${themeName} / ${typeName}`;

        // 现在 plugin 变量是正确的 Plugin 实例，可以安全调用 .addCommand
        plugin.addCommand({
            id: `think-quick-input-${template.id}`,
            name: commandName,
            callback: () => {
                // 注意：QuickInputModal 的构造函数需要的是 app 实例，可以从 ctx 中获取
                new QuickInputModal(ctx.app, template.id).open();
            },
        });
    });
}