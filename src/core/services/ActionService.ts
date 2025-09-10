// src/core/services/ActionService.ts
import { singleton, inject } from 'tsyringe';
import { App, Notice } from 'obsidian';
import { AppStore } from '@state/AppStore';
import { dayjs } from '@core/utils/date';
import type { Item, ViewInstance } from '@core/domain/schema';
import { DataStore } from './dataStore';
import { InputService } from './inputService';
import type { QuickInputConfig } from './types';
import { AppToken } from './types';

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
        const dataSource = settings.dataSources.find(ds => ds.id === viewInstance.dataSourceId);
        if (!dataSource) {
            new Notice('快捷输入失败：找不到对应的数据源。');
            return null;
        }
        const categoryFilter = dataSource.filters.find(f => f.field === 'categoryKey' && (f.op === '=' || f.op === 'includes'));
        if (!categoryFilter || !categoryFilter.value) {
            new Notice('快捷输入失败：此视图的数据源未按 "categoryKey" 进行筛选。');
            return null;
        }
        const blockName = categoryFilter.value as string;
        const targetBlock = settings.inputSettings.blocks.find(b => b.name === blockName);
        if (!targetBlock) {
            new Notice(`快捷输入失败：找不到名为 "${blockName}" 的Block模板。`);
            return null;
        }

        // [核心修改开始]
        
        // 1. 优先从 `tags includes` 规则中预设主题
        let preselectedThemeId: string | undefined;
        const themeFilter = dataSource.filters.find(f => f.field === 'tags' && f.op === 'includes' && typeof f.value === 'string');
        if (themeFilter) {
            const themePath = themeFilter.value;
            const matchedTheme = settings.inputSettings.themes.find(t => t.path === themePath);
            if (matchedTheme) {
                preselectedThemeId = matchedTheme.id;
            }
        }
        
        // 2. 从 `=` 规则中预填充表单字段
        const context: Record<string, any> = {
            '日期': dateContext.format('YYYY-MM-DD'),
            '周期': periodContext,
        };
        
        const equalityFilters = dataSource.filters.filter(f => f.op === '=');
        for (const filter of equalityFilters) {
            // 跳过我们已经用于确定模板的 categoryKey 过滤器
            if (filter.field === 'categoryKey') continue;

            // 遍历目标 Block 的所有字段，进行中英文名(key/label)双重匹配
            for (const templateField of targetBlock.fields) {
                if (filter.field === templateField.key || filter.field === templateField.label) {
                    // 匹配成功后，统一使用 templateField.key 作为 context 的键
                    context[templateField.key] = filter.value;
                    // 找到后就跳出内层循环，避免重复赋值
                    break; 
                }
            }
        }
        // [核心修改结束]
        
        return {
            blockId: targetBlock.id,
            // [修改] 传递增强后的 context 和预选的 themeId
            context: context,
            themeId: preselectedThemeId,
        };
    }
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
            if (field.key in item) {
                context[field.key] = (item as any)[field.key];
            } else if (field.label in item) {
                context[field.label] = (item as any)[field.label];
            } else if (item.extra && field.key in item.extra) {
                context[field.key] = item.extra[field.key];
            }
        }
        if (!context.title && !context.标题) context['标题'] = item.title;
        if (!context.tags && !context.标签) context['标签'] = item.tags.join(', ');
        return {
            blockId: targetBlock.id,
            context: context
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