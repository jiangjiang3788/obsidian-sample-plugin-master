import type { AppStoreApi } from './index';
import {
  DataStore,
  InputService,
  ItemService,
  RecordInputKernel,
  applyRecordRefreshPlan,
  buildRecordOutputPlan,
  buildRecordPersistencePlan,
  buildSuccessResult,
  buildValidationErrorResult,
  finalizeRecordSubmitResult,
} from '@core/public';
import type {
  Item,
  PrepareCreateRecordParams,
  PrepareEditRecordParams,
  PreparedCreateRecord,
  PreparedEditRecord,
  RecordSubmitResult,
  SubmitCompleteRecordParams,
  SubmitCreateRecordParams,
  SubmitDeleteRecordParams,
  SubmitUpdateRecordParams,
  SubmitUpdateRecordTimeParams,
} from '@core/public';
import { mapSubmitError } from './recordInput/error';
import { issue, toArray } from './recordInput/issues';
import {
  getItemFilePath,
  getItemLineNumber,
  inferCreatedItemType,
  locateCreatedRecord,
  parseItemLocator,
} from './recordInput/locator';
import { buildPlanConsistencyIssues } from './recordInput/planGuard';
import { normalizeCompletionOptions, normalizeTimeUpdates } from './recordInput/time';

export interface RecordInputUseCaseDeps {
  inputService: InputService;
  itemService: ItemService;
  dataStore: DataStore;
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

      const createdRecord = locateCreatedRecord(beforeItems, scannedItems, {
        outputContent: preview.outputContent,
        normalizedFormData: normalized.normalizedFormData,
        templateId: resolved.meta.templateId ?? resolved.template.id,
        templateSourceType: resolved.meta.templateSourceType ?? 'block',
        themePath: resolved.theme?.path ?? null,
        blockCategoryKey: resolved.template.categoryKey ?? null,
        itemTypeHint: inferCreatedItemType(resolved.template.outputTemplate),
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
      return mapSubmitError('create', error, warnings);
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

    const outputPlan = buildRecordOutputPlan({
      template: resolved.template,
      formData: normalized.normalizedFormData,
      theme: resolved.theme ?? undefined,
      templateMeta: {
        templateId: resolved.meta.templateId ?? resolved.template.id,
        templateSourceType: resolved.meta.templateSourceType ?? 'block',
      },
    });
    const persistencePlan = buildRecordPersistencePlan({
      mode: 'edit',
      originalPath: getItemFilePath(params.item),
      outputPlan,
    });

    const planConsistencyIssues = buildPlanConsistencyIssues({
      expectedOutputPlan: params.expectedOutputPlan,
      expectedPersistencePlan: params.expectedPersistencePlan,
      actualOutputPlan: outputPlan,
      actualPersistencePlan: persistencePlan,
    });
    if (planConsistencyIssues.length > 0) {
      return buildValidationErrorResult('update', planConsistencyIssues, warnings);
    }

    try {
      if (persistencePlan.pathChanged && persistencePlan.writeMode === 'move_and_replace') {
        const targetPath = outputPlan.targetFilePath || '';
        const beforeTargetItems = this.getFileItemsByPath(targetPath);
        const createdPath = await this.deps.inputService.createRecordAtPlannedLocation(
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

        const scannedNewPath = await applyRecordRefreshPlan(this.deps.dataStore, {
          scanPaths: [createdPath],
          notify: false,
        });
        const afterTargetItems = scannedNewPath.get(createdPath) ?? this.getFileItemsByPath(createdPath);
        const createdRecord = locateCreatedRecord(beforeTargetItems, afterTargetItems, {
          outputContent: outputPlan.outputContent,
          normalizedFormData: normalized.normalizedFormData,
          templateId: resolved.meta.templateId ?? resolved.template.id,
          templateSourceType: resolved.meta.templateSourceType ?? 'block',
          themePath: resolved.theme?.path ?? null,
          blockCategoryKey: resolved.template.categoryKey ?? null,
          itemTypeHint: inferCreatedItemType(resolved.template.outputTemplate),
          appendMode: outputPlan.targetHeader ? 'header' : 'append',
          targetHeader: outputPlan.targetHeader ?? null,
          beforeMaxLine: beforeTargetItems.reduce((max, item) => Math.max(max, getItemLineNumber(item)), 0),
        });

        try {
          const deletedPath = await this.deps.inputService.deleteExistingRecord(params.item, {
            signal: params.signal,
            autoRefresh: false,
          });
          return finalizeRecordSubmitResult(this.deps.dataStore, buildSuccessResult('update', {
            affectedPath: createdPath,
            affectedRecordId: createdRecord?.id ?? params.item.id,
            refresh: {
              scanPaths: [createdPath, deletedPath],
              notify: true,
            },
            feedback: {
              notice: `✅ 已迁移保存：${persistencePlan.originalPath || '原位置'} → ${createdPath}`,
            },
            warnings: [
              ...warnings,
              issue(
                'record_update_moved_to_new_path',
                `路径变化已执行安全迁移：已先写入 ${createdPath}，再删除原位置 ${persistencePlan.originalPath || '未知位置'}。`,
              ),
            ],
          }));
        } catch (deleteError) {
          return finalizeRecordSubmitResult(this.deps.dataStore, {
            // CLOSEOUT-GUARD: 带警告的成功。
            // 新位置已经写入成功，不应作为普通 error 处理；UI 应提示手动清理旧记录并关闭面板，避免重复保存。
            status: 'partial_success',
            operation: 'update',
            affectedPath: createdPath,
            affectedRecordId: createdRecord?.id ?? params.item.id,
            refresh: {
              scanPaths: [createdPath, persistencePlan.originalPath || ''],
              notify: true,
            },
            feedback: {
              notice: `已写入新位置 ${createdPath}，但旧记录删除失败；请检查并手动清理 ${persistencePlan.originalPath || '原位置'}。`,
            },
            warnings,
            errors: [
              issue(
                'record_update_old_entry_delete_failed',
                `安全迁移保存：已先写入新位置 ${createdPath}，但删除原记录 ${persistencePlan.originalPath || '未知位置'} 失败。为避免数据丢失，旧记录被保留，请手动检查并清理。`,
              ),
              ...toArray(mapSubmitError('update', deleteError).errors),
            ],
          });
        }
      }

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
      return mapSubmitError('update', error, warnings);
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
      return mapSubmitError('delete', error);
    }
  }

  async submitCompleteRecord(params: SubmitCompleteRecordParams): Promise<RecordSubmitResult> {
    try {
      this.throwIfAborted(params.signal);
      const path = parseItemLocator(params.itemId).path;
      const options = normalizeCompletionOptions(params.options);
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
      return mapSubmitError('complete', error);
    }
  }

  async submitUpdateRecordTime(params: SubmitUpdateRecordTimeParams): Promise<RecordSubmitResult> {
    const normalizedUpdates = normalizeTimeUpdates(params.updates);
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
      return mapSubmitError('time_update', error);
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

  private throwIfAborted(signal?: AbortSignal): void {
    if (signal?.aborted) {
      const error = new Error('AbortError');
      (error as any).name = 'AbortError';
      throw error;
    }
  }
}

export function createRecordInputUseCase(store: AppStoreApi, deps: RecordInputUseCaseDeps): RecordInputUseCase {
  return new RecordInputUseCase(store, deps);
}
