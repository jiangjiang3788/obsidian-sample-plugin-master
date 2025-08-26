// src/core/services/ActionService.ts
import { App, Notice } from 'obsidian';
import { AppStore } from '@state/AppStore';
import { QuickInputModal } from '@features/quick-input/ui/QuickInputModal';
import { dayjs } from '@core/utils/date';
import type { ViewInstance } from '@core/domain/schema';

/**
 * ActionService 负责处理用户触发的、需要与UI（如模态框、通知）交互的动作。
 * 它将这部分逻辑从 AppStore 中解耦出来。
 */
export class ActionService {
    private app: App;
    private appStore: AppStore;

    constructor(app: App) {
        this.app = app;
        this.appStore = AppStore.instance;
    }

    /**
     * 根据视图配置，触发最合适的快捷输入模态框
     * @param viewInstance 用户点击了哪个视图的 "+" 按钮
     * @param dateContext 视图当前的日期上下文
     * @param periodContext 视图当前的周期上下文 (年/季/月/周/日)
     */
    public openQuickInputForView(viewInstance: ViewInstance, dateContext: dayjs.Dayjs, periodContext: string) {
        const settings = this.appStore.getSettings();
        const dataSource = settings.dataSources.find(ds => ds.id === viewInstance.dataSourceId);

        if (!dataSource) {
            new Notice('快捷输入失败：找不到对应的数据源。');
            return;
        }

        // 查找数据源中基于 'categoryKey' 的过滤规则，以此确定要创建哪种类型的 Block
        const categoryFilter = dataSource.filters.find(f => f.field === 'categoryKey' && (f.op === '=' || f.op === 'includes'));
        if (!categoryFilter || !categoryFilter.value) {
            new Notice('快捷输入失败：此视图的数据源未按 "categoryKey" 进行筛选。');
            return;
        }

        const blockName = categoryFilter.value as string; // 例如: "打卡" 或 "工作/项目A"
        const targetBlock = settings.inputSettings.blocks.find(b => b.name === blockName);

        if (!targetBlock) {
            new Notice(`快捷输入失败：找不到名为 "${blockName}" 的Block模板。`);
            return;
        }

        // 尝试根据 blockName (来自categoryKey) 查找匹配的主题
        const targetTheme = settings.inputSettings.themes.find(t => t.path === blockName);

        // 构建预填写的上下文信息对象
        const context: Record<string, any> = {
            '日期': dateContext.format('YYYY-MM-DD'),
            '周期': periodContext,
        };

        // 使用找到的 Block ID, 上下文, 和 主题 ID 来打开模态框
        new QuickInputModal(this.app, targetBlock.id, context, targetTheme?.id).open();
    }
}