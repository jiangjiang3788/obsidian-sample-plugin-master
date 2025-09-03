// src/core/services/ActionService.ts
import { App, Notice } from 'obsidian';
import { AppStore } from '@state/AppStore';
import { QuickInputModal, QuickInputSaveData } from '@features/quick-input/ui/QuickInputModal';
import { dayjs } from '@core/utils/date';
import type { Item, ViewInstance } from '@core/domain/schema';
import { DataStore } from './dataStore';
import { TimerService } from './TimerService';
import { InputService } from './inputService';
import type { QuickInputConfig } from './types'; // [新增] 导入新的配置类型

export class ActionService {
    private app: App;
    private appStore: AppStore;
    private dataStore: DataStore;
    private inputService: InputService;

    constructor(app: App, dataStore: DataStore, appStore: AppStore, inputService: InputService) {
        this.app = app;
        this.dataStore = dataStore;
        this.appStore = appStore;
        this.inputService = inputService;
    }

    // [修改] 方法重命名，并且不再创建Modal，而是返回配置对象或null
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
        
        // [修改] 返回配置对象，而不是打开Modal
        return {
            blockId: targetBlock.id,
            context: context,
            themeId: targetTheme?.id,
        };
    }

    // [修改] 方法重命名，并返回配置对象或null
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

        // [修改] 返回配置对象
        return {
            blockId: targetBlock.id,
            context: context
        };
    }

    // [修改] 这个方法现在也只返回配置，并且需要一个 onSave 回调来处理后续逻辑
    public getQuickInputConfigForNewTimer(onSave: (data: QuickInputSaveData) => void): { config: QuickInputConfig, onSave: (data: QuickInputSaveData) => void } | null {
        const blocks = this.appStore.getSettings().inputSettings.blocks;
        if (!blocks || blocks.length === 0) {
            new Notice('没有可用的Block模板，请先在设置中创建一个。');
            return null;
        }

        const defaultBlockId = blocks[0].id;
        
        return {
            config: {
                blockId: defaultBlockId,
            },
            onSave: onSave, // 将 onSave 回调也一并返回
        };
    }
}