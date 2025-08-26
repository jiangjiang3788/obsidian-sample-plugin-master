// src/core/services/ActionService.ts
import { App, Notice } from 'obsidian';
import { AppStore } from '@state/AppStore';
import { QuickInputModal } from '@features/quick-input/ui/QuickInputModal';
import { dayjs } from '@core/utils/date';
import type { Item, ViewInstance } from '@core/domain/schema';
import { DataStore } from './dataStore';

/**
 * ActionService 负责处理用户触发的、需要与UI（如模态框、通知）交互的动作。
 */
export class ActionService {
    private app: App;
    private appStore: AppStore;
    // [新增] DataStore 实例，用于查询任务信息
    private dataStore: DataStore;

    constructor(app: App) {
        this.app = app;
        this.appStore = AppStore.instance;
        this.dataStore = DataStore.instance;
    }

    /**
     * 根据视图配置，触发最合适的快捷输入模态框
     */
    public openQuickInputForView(viewInstance: ViewInstance, dateContext: dayjs.Dayjs, periodContext: string) {
        // ... 此函数无变化 ...
        const settings = this.appStore.getSettings();
        const dataSource = settings.dataSources.find(ds => ds.id === viewInstance.dataSourceId);

        if (!dataSource) {
            new Notice('快捷输入失败：找不到对应的数据源。');
            return;
        }

        const categoryFilter = dataSource.filters.find(f => f.field === 'categoryKey' && (f.op === '=' || f.op === 'includes'));
        if (!categoryFilter || !categoryFilter.value) {
            new Notice('快捷输入失败：此视图的数据源未按 "categoryKey" 进行筛选。');
            return;
        }

        const blockName = categoryFilter.value as string;
        const targetBlock = settings.inputSettings.blocks.find(b => b.name === blockName);

        if (!targetBlock) {
            new Notice(`快捷输入失败：找不到名为 "${blockName}" 的Block模板。`);
            return;
        }

        const targetTheme = settings.inputSettings.themes.find(t => t.path === blockName);

        const context: Record<string, any> = {
            '日期': dateContext.format('YYYY-MM-DD'),
            '周期': periodContext,
        };

        new QuickInputModal(this.app, targetBlock.id, context, targetTheme?.id).open();
    }

    /**
     * [新增] 打开快速输入面板来编辑一个已存在的任务。
     * @param taskId - 要编辑的任务的ID
     */
    public editTaskInQuickInput(taskId: string): void {
        const item = this.dataStore.queryItems().find(i => i.id === taskId);
        if (!item) {
            new Notice(`错误：找不到ID为 ${taskId} 的任务。`);
            return;
        }

        const settings = this.appStore.getSettings();
        // 策略：根据任务的 categoryKey 找到对应的 Block 模板。
        // 例如，如果 categoryKey 是 "任务/open"，我们就寻找名为 "任务" 的模板。
        const baseCategory = (item.categoryKey || '').split('/')[0];
        const targetBlock = settings.inputSettings.blocks.find(b => b.name === baseCategory);

        if (!targetBlock) {
            new Notice(`找不到与分类 "${baseCategory}" 匹配的Block模板，无法编辑。`);
            return;
        }

        // 构建预填充的上下文对象，将 Item 的属性映射到模板字段上
        const context: Record<string, any> = {};
        for (const field of targetBlock.fields) {
            // 这是一个简化的映射逻辑，您可以根据需要扩展
            // 尝试按字段的 key (如 "title") 或 label (如 "标题") 进行匹配
            if (field.key in item) {
                context[field.key] = (item as any)[field.key];
            } else if (field.label in item) {
                context[field.label] = (item as any)[field.label];
            } else if (item.extra && field.key in item.extra) {
                context[field.key] = item.extra[field.key];
            }
        }
        
        // 特殊处理 title 和 tags，因为它们很常用
        if (!context.title && !context.标题) context['标题'] = item.title;
        if (!context.tags && !context.标签) context['标签'] = item.tags.join(', ');


        // 注意：编辑功能暂不自动关联主题，未来可以扩展
        new QuickInputModal(this.app, targetBlock.id, context).open();
    }
}