// src/core/services/ActionService.ts
import { singleton, inject } from 'tsyringe';
import { App, Notice } from 'obsidian';
import { AppStore } from '@/app/AppStore';
import { dayjs } from '@core/utils/date';
import type { Item, ViewInstance } from '@/core/types/schema';
import { DataStore } from '@core/services/DataStore';
import { InputService } from '@core/services/InputService';
import type { QuickInputConfig } from '@core/services/types';
import { AppToken } from '@core/services/types';
import { readField } from '@/core/types/schema';

@singleton()
export class ActionService {
    constructor(
        @inject(AppToken) private app: App,
        @inject(DataStore) private dataStore: DataStore,
        @inject(AppStore) private appStore: AppStore,
        @inject(InputService) private inputService: InputService
    ) {}

    public getQuickInputConfigForView(viewInstance: ViewInstance, dateContext: dayjs.Dayjs, periodContext: string): QuickInputConfig | null {
        const settings = this.appStore.getSettings();
        
        // 检查是否是统计视图，如果是则使用特殊处理
        if (viewInstance.viewType === 'StatisticsView') {
            return this.getQuickInputConfigForStatisticsView(viewInstance, dateContext, periodContext);
        }
        
        // 从视图实例的筛选条件中查找 categoryKey
        const filters = viewInstance.filters || [];
        const categoryFilter = filters.find((f: any) => f.field === 'categoryKey' && (f.op === '=' || f.op === 'includes'));
        if (!categoryFilter || !categoryFilter.value) {
            new Notice('快捷输入失败：此视图未按 "categoryKey" 进行筛选。');
            return null;
        }
        const blockName = categoryFilter.value as string;
        let targetBlock = settings.inputSettings.blocks.find(b => b.name === blockName);
        
        // 特殊处理：如果是任务相关的 categoryKey，尝试匹配包含"任务"的模板
        if (!targetBlock && (blockName === '完成任务' || blockName === '未完成任务')) {
            targetBlock = settings.inputSettings.blocks.find(b => b.name.includes('任务'));
        }
        
        if (!targetBlock) {
            if (blockName === '完成任务' || blockName === '未完成任务') {
                new Notice(`快捷输入失败：找不到名称包含"任务"的Block模板。请在设置中创建一个任务类型的模板。`);
            } else {
                new Notice(`快捷输入失败：找不到名为 "${blockName}" 的Block模板。`);
            }
            return null;
        }
        
        let preselectedThemeId: string | undefined;
        const themeFilter = filters.find((f: any) => f.field === 'tags' && f.op === 'includes' && typeof f.value === 'string');
        if (themeFilter) {
            const themePath = themeFilter.value;
            const matchedTheme = settings.inputSettings.themes.find(t => t.path === themePath);
            if (matchedTheme) {
                preselectedThemeId = matchedTheme.id;
            }
        }
        
        const context: Record<string, any> = {
            '日期': dateContext.format('YYYY-MM-DD'),
            '周期': periodContext,
        };
        
        const equalityFilters = filters.filter((f: any) => f.op === '=');
        for (const filter of equalityFilters) {
            if (filter.field === 'categoryKey') continue;

            for (const templateField of targetBlock.fields) {
                if (filter.field === templateField.key || filter.field === templateField.label) {
                    context[templateField.key] = filter.value;
                    break; 
                }
            }
        }
        
        return {
            blockId: targetBlock.id,
            context: context,
            themeId: preselectedThemeId,
        };
    }

    /**
     * [核心修复]
     * 重写了此方法，使用 `readField` 工具函数来准确地从任务 Item 中读取所有字段的值。
     * 这确保了在编辑任务时，所有信息都能被正确地预填充到表单中。
     */
    public getQuickInputConfigForTaskEdit(taskId: string): QuickInputConfig | null {
        const item = this.dataStore.queryItems().find(i => i.id === taskId);
        if (!item) {
            new Notice(`错误：找不到ID为 ${taskId} 的任务。`);
            return null;
        }

        const settings = this.appStore.getSettings();
        const baseCategory = (item.categoryKey || '').split('/')[0];
        const targetBlock = settings.inputSettings.blocks.find(b => b.name === baseCategory);

        if (!targetBlock) {
            new Notice(`找不到与分类 "${baseCategory}" 匹配的Block模板，无法编辑。`);
            return null;
        }

        const context: Record<string, any> = {};
        for (const field of targetBlock.fields) {
            const value = readField(item, field.key) ?? readField(item, field.label);
            if (value !== undefined && value !== null) {
                context[field.key] = value;
            }
        }

        // 特殊处理：确保 `title` 和 `tags` 被正确填充
        if (!context.title && !context['标题']) {
            context[targetBlock.fields.find(f => f.label === '标题')?.key || '标题'] = item.title;
        }
        const tagsField = targetBlock.fields.find(f => f.label === '标签' || f.key === 'tags');
        if (tagsField && !context[tagsField.key]) {
            context[tagsField.key] = item.tags.join(', ');
        }
        
        return {
            blockId: targetBlock.id,
            context: context
        };
    }

    /**
     * 为统计视图获取快捷输入配置
     * 统计视图的分类信息存储在 viewConfig.categories 中，而不是数据源筛选条件里
     */
    public getQuickInputConfigForStatisticsView(
        viewInstance: ViewInstance, 
        dateContext: dayjs.Dayjs, 
        periodContext: string,
        categoryName?: string
    ): QuickInputConfig | null {
        const settings = this.appStore.getSettings();
        const viewConfig = viewInstance.viewConfig || {};
        const categories = viewConfig.categories || [];
        
        if (categories.length === 0) {
            new Notice('快捷输入失败：统计视图未配置分类。');
            return null;
        }
        
        // 如果指定了分类名称，使用它；否则使用第一个分类
        const targetCategoryName = categoryName || categories[0].name;
        let targetBlock = settings.inputSettings.blocks.find(b => b.name === targetCategoryName);
        
        // 特殊处理：如果是任务相关的 categoryKey，尝试匹配包含"任务"的模板
        if (!targetBlock && (targetCategoryName === '完成任务' || targetCategoryName === '未完成任务')) {
            targetBlock = settings.inputSettings.blocks.find(b => b.name.includes('任务'));
        }
        
        if (!targetBlock) {
            if (targetCategoryName === '完成任务' || targetCategoryName === '未完成任务') {
                new Notice(`快捷输入失败：找不到名称包含"任务"的Block模板。请在设置中创建一个任务类型的模板。`);
            } else {
                new Notice(`快捷输入失败：找不到名为 "${targetCategoryName}" 的Block模板。`);
            }
            return null;
        }
        
        // 检查主题筛选
        let preselectedThemeId: string | undefined;
        const filters = viewInstance.filters || [];
        const themeFilter = filters.find((f: any) => f.field === 'tags' && f.op === 'includes' && typeof f.value === 'string');
        if (themeFilter) {
            const themePath = themeFilter.value;
            const matchedTheme = settings.inputSettings.themes.find(t => t.path === themePath);
            if (matchedTheme) {
                preselectedThemeId = matchedTheme.id;
            }
        }
        
        const context: Record<string, any> = {
            '日期': dateContext.format('YYYY-MM-DD'),
            '周期': periodContext,
        };
        
        // 从视图实例的其他筛选条件中提取上下文
        const equalityFilters = filters.filter((f: any) => f.op === '=' && f.field !== 'categoryKey');
        for (const filter of equalityFilters) {
            for (const templateField of targetBlock.fields) {
                if (filter.field === templateField.key || filter.field === templateField.label) {
                    context[templateField.key] = filter.value;
                    break;
                }
            }
        }
        
        return {
            blockId: targetBlock.id,
            context: context,
            themeId: preselectedThemeId,
        };
    }

    public getQuickInputConfigForNewTimer(): QuickInputConfig | null {
        const blocks = this.appStore.getSettings().inputSettings.blocks;
        if (!blocks || blocks.length === 0) {
            new Notice('没有可用的Block模板，请先在设置中创建一个。');
            return null;
        }
        const defaultBlockId = blocks[0].id;
        return {
            blockId: defaultBlockId,
        };
    }
}
