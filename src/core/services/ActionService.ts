// src/core/services/ActionService.ts
import { singleton, inject } from 'tsyringe';
import { dayjs } from '@core/utils/date';
import type { Item, ViewInstance, BlockTemplate, TemplateField } from '@/core/types/schema';
import { getEffectiveCoreBlocks } from '@/core/blocks';
import { DataStore } from '@core/services/DataStore';
import { InputService } from '@core/services/InputService';
import type { QuickInputConfig, ISettingsProvider } from '@core/services/types';
import { SettingsProviderToken } from '@core/services/types';
import { readField } from '@/core/types/schema';
import { buildPathOption, getLeafPath } from '@core/utils/pathSemantic';
import { formatTagsForField } from '@/core/utils/tagUtils';
import type { UiPort } from '@core/ports/UiPort';
import { UI_PORT_TOKEN } from '@core/ports/UiPort';

@singleton()
export class ActionService {
    constructor(
        @inject(UI_PORT_TOKEN) private ui: UiPort,
        @inject(DataStore) private dataStore: DataStore,
        @inject(SettingsProviderToken) private settingsProvider: ISettingsProvider,
        @inject(InputService) private inputService: InputService
    ) {}

    private getRuntimeBlocks(): BlockTemplate[] {
        const settings = this.settingsProvider.getSettings();
        return getEffectiveCoreBlocks(settings);
    }

    private findBlockByCoreBlock(coreBlock: string | undefined): BlockTemplate | undefined {
        const normalized = String(coreBlock || '').trim().replace(/^core\./i, '');
        if (!normalized) return undefined;
        return this.getRuntimeBlocks().find((block) =>
            String(block.coreBlockId || block.id || '').trim().replace(/^core\./i, '') === normalized
        );
    }

    private findBlockByCategoryKey(categoryKey: string | undefined): BlockTemplate | undefined {
        if (!categoryKey) return undefined;
        const blocks = this.getRuntimeBlocks();
        const exact = blocks.find((b) => b.categoryKey === categoryKey);
        if (exact) return exact;
        const segments = categoryKey.split('/');
        while (segments.length > 1) {
            segments.pop();
            const matched = blocks.find((b) => b.categoryKey === segments.join('/'));
            if (matched) return matched;
        }
        return undefined;
    }

    public getQuickInputConfigForView(viewInstance: ViewInstance, dateContext: dayjs.Dayjs, periodContext: string): QuickInputConfig | null {
        const settings = this.settingsProvider.getSettings();

        if (viewInstance.viewType === 'StatisticsView') {
            return this.getQuickInputConfigForStatisticsView(viewInstance, dateContext, periodContext);
        }

        const filters = viewInstance.filters || [];
        const coreBlockFilter = filters.find((f) => f.field === 'coreBlock' && (f.op === '=' || f.op === 'includes'));
        if (!coreBlockFilter || !coreBlockFilter.value) {
            this.ui.notice('快捷输入失败：此视图未按 "coreBlock" 进行筛选。');
            return null;
        }

        const coreBlock = String(coreBlockFilter.value);
        const targetBlock = this.findBlockByCoreBlock(coreBlock);
        if (!targetBlock) {
            this.ui.notice(`快捷输入失败：找不到核心 Block 为 "${coreBlock}" 的模板。`);
            return null;
        }

        let preselectedThemeId: string | undefined;
        const themeFilter = filters.find((f) => f.field === 'tags' && f.op === 'includes' && typeof f.value === 'string');
        if (themeFilter) {
            const themePath = themeFilter.value;
            const matchedTheme = settings.inputSettings.themes.find(t => t.path === themePath);
            if (matchedTheme) {
                preselectedThemeId = matchedTheme.id;
            }
        }

        const context: Record<string, unknown> = {
            '日期': dateContext.format('YYYY-MM-DD'),
            '周期': periodContext,
        };

        const equalityFilters = filters.filter((f) => f.op === '=');
        for (const filter of equalityFilters) {
            if (filter.field === 'coreBlock') continue;

            for (const templateField of targetBlock.fields) {
                if (filter.field === templateField.key || filter.field === templateField.label) {
                    context[templateField.key] = filter.value;
                    break;
                }
            }
        }

        return {
            blockId: targetBlock.id,
            context,
            themeId: preselectedThemeId,
        };
    }


    private buildFieldContextValue(field: TemplateField, item: Item): unknown {
        const direct = readField(item, field.key) ?? readField(item, field.label);
        const fieldName = String(field.key || field.label || '');
        const isCategoryField = fieldName.includes('分类') || fieldName.toLowerCase().includes('category');

        if (field.type === 'rating') {
            const score = item.rating ?? item.extra?.['评分'] ?? item.extra?.['rating'];
            const visual = item.pintu ?? item.extra?.['评图'] ?? item.extra?.['pintu'];
            if (field.options?.length) {
                const scoreStr = score !== undefined && score !== null ? String(score) : '';
                const matched = field.options.find((opt) =>
                    (scoreStr && String(opt.label || '') === scoreStr && (!visual || String(opt.value || '') === String(visual))) ||
                    (scoreStr && String(opt.label || '') === scoreStr) ||
                    (visual && String(opt.value || '') === String(visual))
                );
                if (matched) return { value: matched.value, label: matched.label || matched.value };
            }
            if (score !== undefined && score !== null) return { value: visual || '', label: String(score) };
        }

        if ((field.type === 'select' || field.type === 'radio') && isCategoryField) {
            const pathValue = String(item.categoryKey || direct || '');
            if (!pathValue) return direct;
            if (field.options?.length) {
                const matched = field.options.find((opt) => String(opt.value) === pathValue || String(opt.label) === getLeafPath(pathValue));
                if (matched) return { value: matched.value, label: matched.label || matched.value };
            }
            return buildPathOption(pathValue) || direct;
        }

        return direct;
    }

    public getQuickInputConfigForTaskEdit(taskId: string): QuickInputConfig | null {
        const item = this.dataStore.queryItems().find(i => i.id === taskId);
        if (!item) {
            this.ui.notice(`错误：找不到ID为 ${taskId} 的任务。`);
            return null;
        }

        const coreBlock = String(item.coreBlock || '').trim();
        const targetBlock = this.findBlockByCoreBlock(coreBlock);

        if (!targetBlock) {
            this.ui.notice(`找不到与核心 Block "${coreBlock}" 匹配的模板，无法编辑。`);
            return null;
        }

        const context: Record<string, unknown> = {};
        for (const field of targetBlock.fields) {
            const value = this.buildFieldContextValue(field, item);
            if (value !== undefined && value !== null) {
                context[field.key] = value;
            }
        }

        if (!context.title && !context['标题']) {
            context[targetBlock.fields.find(f => f.label === '标题')?.key || '标题'] = item.title;
        }
        const tagsField = targetBlock.fields.find(f => f.label === '标签' || f.key === 'tags');
        if (tagsField && !context[tagsField.key]) {
            context[tagsField.key] = formatTagsForField(item.tags);
        }

        return {
            blockId: targetBlock.id,
            context,
        };
    }

    public getQuickInputConfigForStatisticsView(
        viewInstance: ViewInstance,
        dateContext: dayjs.Dayjs,
        periodContext: string,
        categoryName?: string
    ): QuickInputConfig | null {
        const settings = this.settingsProvider.getSettings();
        const viewConfig = viewInstance.viewConfig || {};
        const categories = viewConfig.categories || [];

        if (categories.length === 0) {
            this.ui.notice('快捷输入失败：统计视图未配置分类。');
            return null;
        }

        const targetCategoryKey = categoryName || categories[0].name;
        const targetBlock = this.findBlockByCategoryKey(targetCategoryKey);

        if (!targetBlock) {
            this.ui.notice(`快捷输入失败：找不到分类为 "${targetCategoryKey}" 的 Block 模板。`);
            return null;
        }

        let preselectedThemeId: string | undefined;
        const filters = viewInstance.filters || [];
        const themeFilter = filters.find((f) => f.field === 'tags' && f.op === 'includes' && typeof f.value === 'string');
        if (themeFilter) {
            const themePath = themeFilter.value;
            const matchedTheme = settings.inputSettings.themes.find(t => t.path === themePath);
            if (matchedTheme) {
                preselectedThemeId = matchedTheme.id;
            }
        }

        const context: Record<string, unknown> = {
            '日期': dateContext.format('YYYY-MM-DD'),
            '周期': periodContext,
        };

        const equalityFilters = filters.filter((f) => f.op === '=' && f.field !== 'categoryKey');
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
            context,
            themeId: preselectedThemeId,
        };
    }

    public getQuickInputConfigForNewTimer(): QuickInputConfig | null {
        const blocks = this.getRuntimeBlocks();
        if (!blocks || blocks.length === 0) {
            this.ui.notice('没有可用的Block模板，请先在设置中创建一个。');
            return null;
        }
        const taskBlock = blocks.find((b) => String(b.coreBlockId || b.id).replace(/^core\./i, '') === 'task') || blocks[0];
        return {
            blockId: taskBlock.id,
        };
    }
}