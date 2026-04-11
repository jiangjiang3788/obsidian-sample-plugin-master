import type { AppStoreApi } from './index';
import { DataStore, InputService, ItemService, applyTaskTimePolicy } from '@core/public';
import type {
  Item,
  PrepareCreateRecordParams,
  PrepareEditRecordParams,
  PreparedCreateRecord,
  PreparedEditRecord,
  RecordSubmitIssue,
  RecordSubmitResult,
  SubmitCompleteRecordParams,
  SubmitCreateRecordParams,
  SubmitDeleteRecordParams,
  SubmitUpdateRecordParams,
  SubmitUpdateRecordTimeParams,
} from '@core/public';
import { RecordInputKernel } from '@/core/services/recordInput/RecordInputKernel';
import {
  buildCancelledResult,
  buildConflictResult,
  buildErrorResult,
  buildSuccessResult,
  buildValidationErrorResult,
} from '@/core/services/recordInput/submitResult';
import { applyRecordRefreshPlan, finalizeRecordSubmitResult } from '@/core/services/recordInput/refreshCoordinator';
import { isRecordConflictError } from '@/core/services/recordInput/mutationErrors';

export interface RecordInputUseCaseDeps {
  inputService: InputService;
  itemService: ItemService;
  dataStore: DataStore;
}

interface TimeUpdatePayload {
  time?: string;
  endTime?: string;
  duration?: number;
}

interface CreateLocatorContext {
  outputContent: string;
  normalizedFormData: Record<string, unknown>;
  templateId?: string | null;
  templateSourceType?: 'block' | 'override' | null;
  themePath?: string | null;
  blockCategoryKey?: string | null;
  itemTypeHint: 'task' | 'block' | 'unknown';
  appendMode: 'header' | 'append';
  targetHeader?: string | null;
  beforeMaxLine: number;
}

function issue(code: string, message: string, field?: string): RecordSubmitIssue {
  return { code, message, field };
}

function normalizeComparableText(value: unknown): string {
  return String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function normalizeLineText(value: unknown): string {
  return String(value ?? '')
    .replace(/\r/g, '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

function getFirstDefinedValue(record: Record<string, unknown>, keys: string[]): unknown {
  for (const key of keys) {
    if (!Object.prototype.hasOwnProperty.call(record, key)) continue;
    const value = record[key];
    if (value !== undefined && value !== null && value !== '') return value;
  }
  return undefined;
}

function parseItemLocator(itemId: string): { path: string; lineNo: number } {
  const hashIndex = itemId.lastIndexOf('#');
  if (hashIndex === -1) throw new Error(`无效的条目ID格式: ${itemId}`);
  const path = itemId.substring(0, hashIndex);
  const lineNo = Number.parseInt(itemId.substring(hashIndex + 1), 10);
  if (!path || Number.isNaN(lineNo)) {
    throw new Error(`无效的条目ID格式: ${itemId}`);
  }
  return { path, lineNo };
}

function toArray<T>(value: T[] | undefined | null): T[] {
  return Array.isArray(value) ? value : [];
}

function getItemLineNumber(item: Item): number {
  if (typeof item.file?.line === 'number') return item.file.line;
  try {
    return parseItemLocator(item.id).lineNo;
  } catch {
    return 0;
  }
}

export class RecordInputUseCase {
  constructor(
    private store: AppStoreApi,
    private deps: RecordInputUseCaseDeps,
  ) {}

  prepareCreateRecord(params: PrepareCreateRecordParams): PreparedCreateRecord {
    return this.getKernel().prepareCreate(params);
  }

  prepareEditRecord(params: PrepareEditRecordParams): PreparedEditRecord {
    return this.getKernel().prepareEdit(params);
  }

  async submitCreateRecord(params: SubmitCreateRecordParams): Promise<RecordSubmitResult> {
    const kernel = this.getKernel();
    const resolved = kernel.resolveMissingDependencies({
      blockId: params.blockId,
      themeId: params.themeId ?? null,
    });

    if (resolved.errors.length > 0 || !resolved.template || !resolved.blockId) {
      return buildValidationErrorResult('create', [
        ...resolved.errors,
        ...(!resolved.template ? [{ code: 'record_template_missing', message: 'No effective template is available for this record.' }] : []),
      ], resolved.warnings);
    }

    const normalized = kernel.normalizeRecordInput({
      template: resolved.template,
      formData: params.formData,
      context: params.context,
      mode: params.source === 'ai_batch' ? 'ai_batch' : 'create',
    });
    const validation = kernel.validateRecordInput({
      template: resolved.template,
      formData: normalized.normalizedFormData,
      mode: 'create',
    });
    const warnings = [...resolved.warnings, ...normalized.warnings, ...validation.warnings];
    if (!validation.ok) {
      return buildValidationErrorResult('create', validation.errors, warnings);
    }

    try {
      this.throwIfAborted(params.signal);
      const preview = this.deps.inputService.previewTemplateExecution(
        resolved.template,
        normalized.normalizedFormData,
        resolved.theme ?? undefined,
        {
          templateId: resolved.meta.templateId ?? resolved.template.id,
          templateSourceType: resolved.meta.templateSourceType ?? 'block',
        },
      );
      const beforeItems = this.getFileItemsByPath(preview.targetFilePath);
      const path = await this.deps.inputService.executeTemplate(
        resolved.template,
        normalized.normalizedFormData,
        resolved.theme ?? undefined,
        {
          templateId: resolved.meta.templateId ?? resolved.template.id,
          templateSourceType: resolved.meta.templateSourceType ?? 'block',
        },
        {
          signal: params.signal,
        },
      );

      const refreshPlan = {
        scanPaths: [path],
        notify: true,
      };
      const scannedByPath = await applyRecordRefreshPlan(this.deps.dataStore, refreshPlan);
      const scannedItems = scannedByPath.get(path) ?? this.getFileItemsByPath(path);

      const createdRecord = this.locateCreatedRecord(beforeItems, scannedItems, {
        outputContent: preview.outputContent,
        normalizedFormData: normalized.normalizedFormData,
        templateId: resolved.meta.templateId ?? resolved.template.id,
        templateSourceType: resolved.meta.templateSourceType ?? 'block',
        themePath: resolved.theme?.path ?? null,
        blockCategoryKey: resolved.template.categoryKey ?? null,
        itemTypeHint: this.inferCreatedItemType(resolved.template.outputTemplate),
        appendMode: preview.header ? 'header' : 'append',
        targetHeader: preview.header ?? null,
        beforeMaxLine: beforeItems.reduce((max, item) => Math.max(max, getItemLineNumber(item)), 0),
      });

      return buildSuccessResult('create', {
        affectedPath: path,
        affectedRecordId: createdRecord?.id,
        refresh: refreshPlan,
        feedback: {
          notice: '✅ 已创建',
        },
        followUp: createdRecord?.type === 'task'
          ? { startTimerForRecordId: createdRecord.id }
          : undefined,
        warnings,
      });
    } catch (error) {
      return this.mapSubmitError('create', error, warnings);
    }
  }

  async submitUpdateRecord(params: SubmitUpdateRecordParams): Promise<RecordSubmitResult> {
    const kernel = this.getKernel();
    const resolved = kernel.resolveMissingDependencies({
      blockId: params.blockId,
      themeId: params.themeId ?? null,
      item: params.item,
    });

    if (resolved.errors.length > 0 || !resolved.template || !resolved.blockId) {
      return buildValidationErrorResult('update', [
        ...resolved.errors,
        ...(!resolved.template ? [{ code: 'record_template_missing', message: 'No effective template is available for this record.' }] : []),
      ], resolved.warnings);
    }

    const normalized = kernel.normalizeRecordInput({
      template: resolved.template,
      formData: params.formData,
      mode: 'edit',
    });
    const validation = kernel.validateRecordInput({
      template: resolved.template,
      formData: normalized.normalizedFormData,
      mode: 'edit',
      item: params.item,
    });
    const warnings = [...resolved.warnings, ...normalized.warnings, ...validation.warnings];
    if (!validation.ok) {
      return buildValidationErrorResult('update', validation.errors, warnings);
    }

    try {
      const path = await this.deps.inputService.updateExistingRecord(
        params.item,
        resolved.template,
        normalized.normalizedFormData,
        resolved.theme ?? undefined,
        {
          templateId: resolved.meta.templateId ?? resolved.template.id,
          templateSourceType: resolved.meta.templateSourceType ?? 'block',
        },
        {
          signal: params.signal,
          autoRefresh: false,
        },
      );
      return finalizeRecordSubmitResult(this.deps.dataStore, buildSuccessResult('update', {
        affectedPath: path,
        affectedRecordId: params.item.id,
        refresh: {
          scanPaths: [path],
          notify: true,
        },
        feedback: {
          notice: '✅ 已保存修改',
        },
        warnings,
      }));
    } catch (error) {
      return this.mapSubmitError('update', error, warnings);
    }
  }

  async submitDeleteRecord(params: SubmitDeleteRecordParams): Promise<RecordSubmitResult> {
    try {
      this.throwIfAborted(params.signal);
      const path = await this.deps.inputService.deleteExistingRecord(params.item, {
        signal: params.signal,
        autoRefresh: false,
      });
      return finalizeRecordSubmitResult(this.deps.dataStore, buildSuccessResult('delete', {
        affectedPath: path,
        affectedRecordId: params.item.id,
        refresh: {
          scanPaths: [path],
          notify: true,
        },
        feedback: {
          notice: '✅ 已删除记录',
        },
      }));
    } catch (error) {
      return this.mapSubmitError('delete', error);
    }
  }

  async submitCompleteRecord(params: SubmitCompleteRecordParams): Promise<RecordSubmitResult> {
    try {
      this.throwIfAborted(params.signal);
      const path = parseItemLocator(params.itemId).path;
      const options = this.normalizeCompletionOptions(params.options);
      await this.deps.itemService.completeItem(params.itemId, options, { autoRefresh: false });
      return finalizeRecordSubmitResult(this.deps.dataStore, buildSuccessResult('complete', {
        affectedPath: path,
        affectedRecordId: params.itemId,
        refresh: {
          scanPaths: [path],
          notify: true,
        },
        feedback: {
          notice: options?.duration != null
            ? `任务已完成，时长 ${options.duration} 分钟已记录。`
            : '任务已完成。',
        },
      }));
    } catch (error) {
      return this.mapSubmitError('complete', error);
    }
  }

  async submitUpdateRecordTime(params: SubmitUpdateRecordTimeParams): Promise<RecordSubmitResult> {
    const normalizedUpdates = this.normalizeTimeUpdates(params.updates);
    if ('error' in normalizedUpdates) {
      return buildValidationErrorResult('time_update', [normalizedUpdates.error]);
    }

    try {
      this.throwIfAborted(params.signal);
      const path = parseItemLocator(params.itemId).path;
      await this.deps.itemService.updateItemTime(params.itemId, normalizedUpdates, { autoRefresh: false });
      return finalizeRecordSubmitResult(this.deps.dataStore, buildSuccessResult('time_update', {
        affectedPath: path,
        affectedRecordId: params.itemId,
        refresh: {
          scanPaths: [path],
          notify: true,
        },
        feedback: {
          notice: normalizedUpdates.duration != null
            ? `任务时长已更新为 ${normalizedUpdates.duration} 分钟。`
            : '任务时间已更新。',
        },
      }));
    } catch (error) {
      return this.mapSubmitError('time_update', error);
    }
  }

  private getKernel(): RecordInputKernel {
    return new RecordInputKernel(this.store.getState().settings.inputSettings);
  }

  private getFileItemsByPath(path: string): Item[] {
    return this.deps.dataStore.queryItems().filter((item) => {
      if (item.file?.path) return item.file.path === path;
      try {
        return parseItemLocator(item.id).path === path;
      } catch {
        return false;
      }
    });
  }

  private buildItemSignature(item: Item): string {
    return JSON.stringify([
      item.type,
      item.title || '',
      item.content || '',
      item.templateId || '',
      item.templateSourceType || '',
      item.theme || '',
      item.categoryKey || '',
      item.header || '',
      item.date || '',
      item.startTime || '',
      item.endTime || '',
      item.duration ?? '',
    ]);
  }

  private locateCreatedRecord(beforeItems: Item[], afterItems: Item[], context: CreateLocatorContext): Item | undefined {
    const beforeSignatureCount = new Map<string, number>();
    for (const item of beforeItems) {
      const signature = this.buildItemSignature(item);
      beforeSignatureCount.set(signature, (beforeSignatureCount.get(signature) || 0) + 1);
    }

    const extraCandidates: Item[] = [];
    for (const item of afterItems) {
      const signature = this.buildItemSignature(item);
      const remaining = beforeSignatureCount.get(signature) || 0;
      if (remaining > 0) {
        beforeSignatureCount.set(signature, remaining - 1);
        continue;
      }
      extraCandidates.push(item);
    }

    const candidates = extraCandidates.length > 0 ? extraCandidates : afterItems;
    if (!candidates.length) return undefined;

    const scored = candidates
      .map((item) => ({ item, score: this.scoreCreatedRecordCandidate(item, context, extraCandidates.length === 0) }))
      .filter((entry) => entry.score > 0 || extraCandidates.length > 0)
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return getItemLineNumber(b.item) - getItemLineNumber(a.item);
      });

    return scored[0]?.item;
  }

  private scoreCreatedRecordCandidate(item: Item, context: CreateLocatorContext, isFallbackSearch: boolean): number {
    let score = 0;
    const normalizedOutput = normalizeLineText(context.outputContent);
    const normalizedItemContent = normalizeLineText(item.content);
    const normalizedItemTitle = normalizeComparableText(item.title);

    if (context.templateId && item.templateId === context.templateId) score += 30;
    if (context.templateSourceType && item.templateSourceType === context.templateSourceType) score += 8;
    if (context.themePath && item.theme === context.themePath) score += 6;
    if (context.blockCategoryKey && item.categoryKey === context.blockCategoryKey) score += 6;
    if (context.itemTypeHint !== 'unknown' && item.type === context.itemTypeHint) score += 10;

    if (context.appendMode === 'header' && context.targetHeader) {
      if (item.header === context.targetHeader) score += 16;
      else score -= 4;
    }

    const lineNo = getItemLineNumber(item);
    if (context.appendMode === 'append') {
      if (lineNo > context.beforeMaxLine) score += 12;
      else if (context.beforeMaxLine > 0) score -= 3;
    }

    if (normalizedOutput) {
      if (normalizedItemContent === normalizedOutput) score += 44;
      else if (normalizedItemContent && normalizedOutput.includes(normalizedItemContent)) score += 18;
      else if (normalizedItemContent && normalizedItemContent.includes(normalizedOutput)) score += 12;
    }

    const titleHint = getFirstDefinedValue(context.normalizedFormData, ['标题', 'title', '内容', 'content', '名称', 'name']);
    const normalizedTitleHint = normalizeComparableText(titleHint);
    if (normalizedTitleHint) {
      if (normalizedItemTitle === normalizedTitleHint) score += 20;
      else if (normalizedItemTitle && (normalizedItemTitle.includes(normalizedTitleHint) || normalizedTitleHint.includes(normalizedItemTitle))) score += 10;
      const normalizedContentHint = normalizeComparableText(item.content);
      if (normalizedContentHint && normalizedContentHint === normalizedTitleHint) score += 12;
      else if (normalizedContentHint && normalizedContentHint.includes(normalizedTitleHint)) score += 6;
    }

    const startHint = getFirstDefinedValue(context.normalizedFormData, ['时间', 'time', 'start']);
    if (startHint && String(item.startTime || '') === String(startHint)) score += 4;
    const endHint = getFirstDefinedValue(context.normalizedFormData, ['结束', 'end', 'endTime']);
    if (endHint && String(item.endTime || '') === String(endHint)) score += 4;
    const durationHint = getFirstDefinedValue(context.normalizedFormData, ['时长', 'duration']);
    if (durationHint !== undefined && Number(item.duration) === Number(durationHint)) score += 4;

    if (context.itemTypeHint === 'task' && /^\s*-\s*\[[ xX]?\]/.test(item.content || '')) {
      score += 4;
    }

    if (isFallbackSearch && score < 16) {
      return 0;
    }
    return score;
  }

  private inferCreatedItemType(outputTemplate: string | undefined): 'task' | 'block' | 'unknown' {
    const text = String(outputTemplate || '').trim();
    if (!text) return 'unknown';
    if (/^\s*-\s*\[[ xX]?\]/m.test(text)) return 'task';
    if (/<!--\s*start\s*-->/i.test(text) || /<!--\s*end\s*-->/i.test(text)) return 'block';
    return 'unknown';
  }

  private normalizeCompletionOptions(options?: SubmitCompleteRecordParams['options']): SubmitCompleteRecordParams['options'] | undefined {
    if (!options) return undefined;

    const normalized = {
      duration: typeof options.duration === 'number' ? options.duration : undefined,
      startTime: options.startTime ?? undefined,
      endTime: options.endTime ?? undefined,
    };

    if (normalized.duration == null && !normalized.startTime && !normalized.endTime) {
      return undefined;
    }

    if (normalized.duration != null) {
      const normalizedTriple = applyTaskTimePolicy({
        startTime: normalized.startTime,
        endTime: normalized.endTime,
        duration: normalized.duration,
        mode: 'finalize',
        direction: 'forward',
      });

      return {
        duration: normalizedTriple.duration ?? normalized.duration,
        startTime: normalizedTriple.startTime,
        endTime: normalizedTriple.endTime ?? normalized.endTime,
      };
    }

    return normalized;
  }

  private normalizeTimeUpdates(
    updates: SubmitUpdateRecordTimeParams['updates'],
  ): TimeUpdatePayload | { error: RecordSubmitIssue } {
    const time = updates.time ?? updates.start ?? undefined;
    const endTime = updates.endTime ?? updates.end ?? undefined;

    let duration: number | undefined;
    if (updates.duration !== undefined && updates.duration !== null && updates.duration !== '') {
      const numericDuration = Number(updates.duration);
      if (Number.isNaN(numericDuration)) {
        return { error: issue('record_time_duration_invalid', '任务时长必须是数字。', 'duration') };
      }
      duration = numericDuration;
    }

    if (time === undefined && endTime === undefined && duration === undefined) {
      return { error: issue('record_time_update_empty', '至少需要提供一个时间更新字段。') };
    }

    if (duration !== undefined) {
      const normalized = applyTaskTimePolicy({
        startTime: time,
        endTime,
        duration,
        mode: 'finalize',
        direction: 'forward',
      });

      return {
        time: normalized.startTime ?? time,
        endTime: normalized.endTime ?? endTime,
        duration: normalized.duration ?? duration,
      };
    }

    return {
      time,
      endTime,
      duration,
    };
  }

  private throwIfAborted(signal?: AbortSignal): void {
    if (signal?.aborted) {
      const error = new Error('AbortError');
      (error as any).name = 'AbortError';
      throw error;
    }
  }

  private mapSubmitError(
    operation: 'create' | 'update' | 'delete' | 'complete' | 'time_update',
    error: unknown,
    warnings: RecordSubmitResult['warnings'] = [],
  ): RecordSubmitResult {
    const name = (error as any)?.name;
    const message = error instanceof Error ? error.message : String(error);

    if (name === 'AbortError' || name === 'CancelledError') {
      return buildCancelledResult(operation, toArray(warnings));
    }

    if (isRecordConflictError(error)) {
      return buildConflictResult(operation, error.message, toArray(warnings), error.conflictCode);
    }

    const errorCode = typeof (error as any)?.conflictCode === 'string'
      ? (error as any).conflictCode
      : (typeof (error as any)?.code === 'string' ? (error as any).code : undefined);
    if (errorCode && /^record_/.test(errorCode)) {
      return buildConflictResult(operation, message, toArray(warnings), errorCode);
    }

    if (/Unable to locate|无法定位原始记录|找不到文件|找不到条目文件|无效的条目ID格式|无效的条目行号|原始任务位置已变化|原始块位置已变化|原始块边界已损坏|条目已不存在/.test(message)) {
      return buildConflictResult(operation, message, toArray(warnings));
    }

    return buildErrorResult(operation, message || 'Unknown record submit error.', toArray(warnings));
  }
}

export function createRecordInputUseCase(store: AppStoreApi, deps: RecordInputUseCaseDeps): RecordInputUseCase {
  return new RecordInputUseCase(store, deps);
}
