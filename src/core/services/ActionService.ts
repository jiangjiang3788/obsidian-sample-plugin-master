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
    // [核心修改] 构造函数现在通过 @inject 装饰器明确声明并接收所有依赖
    // 注意：对 TimerService 的依赖已在上一轮重构中移除
    constructor(
        @inject(AppToken) private app: App,
        @inject(DataStore) private dataStore: DataStore,
        @inject(AppStore) private appStore: AppStore,
        @inject(InputService) private inputService: InputService
    ) {}

    // [核心修改] init 方法已被彻底删除

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
        const targetTheme = settings.inputSettings.themes.find(t => t.path === blockName);
        const context: Record<string, any> = {
            '日期': dateContext.format('YYYY-MM-DD'),
            '周期': periodContext,
        };
        return {
            blockId: targetBlock.id,
            context: context,
            themeId: targetTheme?.id,
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