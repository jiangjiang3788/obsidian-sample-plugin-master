// src/core/services/ActionService.ts
import { singleton, inject } from 'tsyringe';
import { dayjs } from '@core/utils/date';
import type { RecordViewItem } from '@/core/records/RecordEntity';
import type { ViewInstance } from '@/core/view/ViewConfig';
import type { RecordCaptureTemplate, TemplateField } from '@/core/recordInput/CaptureTemplate';
import { getRecordTypePresentation, getTemplateRecordTypes } from '@/core/recordTypes/public';
import { DataStore } from '@core/services/DataStore';
import { InputService } from '@core/services/InputService';
import type { QuickInputConfig, ISettingsProvider } from '@core/services/types';
import { SettingsProviderToken } from '@core/services/types';
import { readField } from '@/core/fields/ViewFieldCatalog';
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

    private getRuntimeRecordTypes(): RecordCaptureTemplate[] {
        return getTemplateRecordTypes();
    }

    private findRecordTypeTemplate(recordType: string | undefined): RecordCaptureTemplate | undefined {
        const normalized = String(recordType || '').trim().replace(/^core\./i, '');
        if (!normalized) return undefined;
        return this.getRuntimeRecordTypes().find((recordType) =>
            String(recordType.recordTypeId || recordType.id || '').trim().replace(/^core\./i, '') === normalized
        );
    }


    public getQuickInputConfigForView(viewInstance: ViewInstance, dateContext: dayjs.Dayjs, periodContext: string): QuickInputConfig | null {

        if (viewInstance.viewType === 'StatisticsView') {
            return this.getQuickInputConfigForStatisticsView(viewInstance, dateContext, periodContext);
        }

        const filters = viewInstance.filters || [];
        const recordTypeFilter = filters.find((f) => f.field === 'recordType' && (f.op === '=' || f.op === 'includes'));
        if (!recordTypeFilter || !recordTypeFilter.value) {
            this.ui.notice('快捷输入失败：此视图未按“记录类型”进行筛选。');
            return null;
        }

        const recordType = String(recordTypeFilter.value);
        const targetRecordType = this.findRecordTypeTemplate(recordType);
        if (!targetRecordType) {
            this.ui.notice(`快捷输入失败：找不到记录类型为“${getRecordTypePresentation(recordType).label}”的模板。`);
            return null;
        }

        const context: Record<string, unknown> = {
            '日期': dateContext.format('YYYY-MM-DD'),
            '周期': periodContext,
        };

        const equalityFilters = filters.filter((f) => f.op === '=');
        for (const filter of equalityFilters) {
            if (filter.field === 'recordType') continue;

            for (const templateField of targetRecordType.fields) {
                if (filter.field === templateField.key || filter.field === templateField.label) {
                    context[templateField.key] = filter.value;
                    break;
                }
            }
        }

        return {
            recordTypeId: targetRecordType.id,
            context,
        };
    }


    private buildFieldContextValue(field: TemplateField, item: RecordViewItem): unknown {
        const direct = readField(item, field.key) ?? readField(item, field.label);
        if (field.type === 'rating') {
            const score = item.rating ?? item.extra?.['评分'] ?? item.extra?.['rating'];
            const visual = item.image ?? item.extra?.['图片'] ?? item.extra?.image;
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


        return direct;
    }

    public getQuickInputConfigForTaskEdit(taskId: string): QuickInputConfig | null {
        const item = this.dataStore.queryItems().find(i => i.id === taskId);
        if (!item) {
            this.ui.notice(`错误：找不到标识为 ${taskId} 的任务。`);
            return null;
        }

        const recordType = String(item.recordType || '').trim();
        const targetRecordType = this.findRecordTypeTemplate(recordType);

        if (!targetRecordType) {
            this.ui.notice(`找不到与记录类型“${getRecordTypePresentation(recordType).label}”匹配的模板，无法编辑。`);
            return null;
        }

        const context: Record<string, unknown> = {};
        for (const field of targetRecordType.fields) {
            const value = this.buildFieldContextValue(field, item);
            if (value !== undefined && value !== null) {
                context[field.key] = value;
            }
        }

        if (!context.title && !context['标题']) {
            context[targetRecordType.fields.find(f => f.label === '标题')?.key || '标题'] = item.title;
        }
        const tagsField = targetRecordType.fields.find(f => f.label === '标签' || f.key === 'tags');
        if (tagsField && !context[tagsField.key]) {
            context[tagsField.key] = formatTagsForField(item.tags);
        }

        return {
            recordTypeId: targetRecordType.id,
            context,
        };
    }

    public getQuickInputConfigForStatisticsView(
        _viewInstance: ViewInstance,
        _dateContext: dayjs.Dayjs,
        _periodContext: string,
        _goalPath?: string
    ): QuickInputConfig | null {
        // Statistics is Goal-centric and a Goal does not imply a Record Type.
        // Callers must provide an explicit Record Type when they expose create UI.
        this.ui.notice('快捷输入失败：统计视图需要明确记录类型。');
        return null;
    }

    public getQuickInputConfigForNewTimer(): QuickInputConfig | null {
        const recordTypes = this.getRuntimeRecordTypes();
        const taskRecordType = recordTypes.find((recordType) => String(recordType.recordTypeId || recordType.id).replace(/^core\./i, '') === 'task');
        if (!taskRecordType) {
            this.ui.notice('快捷输入失败：任务记录类型未注册。');
            return null;
        }
        return {
            recordTypeId: taskRecordType.id,
        };
    }
}