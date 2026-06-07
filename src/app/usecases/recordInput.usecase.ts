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
  locateCreatedRecord,
  parseItemLocator,
} from './recordInput/locator';
import { buildPlanConsistencyIssues } from './recordInput/planGuard';
import { buildRefreshPlan, getFileItemsByPath, tryParseItemPath } from './recordInput/paths';
import { submitFinalizedRecordMutation, throwIfAborted } from './recordInput/submitPipeline';
import { buildCreatedRecordLocatorContext, getTemplateExecutionMeta, prepareTemplateSubmit } from './recordInput/templateSubmit';
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
    const prepared = prepareTemplateSubmit({
      kernel: this.getKernel(),
      operation: 'create',
      blockId: params.blockId,
      themeId: params.themeId ?? null,
      formData: params.formData,
      context: params.context,
      normalizeMode: params.source === 'ai_batch' ? 'ai_batch' : 'create',
      validateMode: 'create',
    });
    if (!prepared.ok) return prepared.result;

    const { resolved, normalized, warnings } = prepared.submit;

    try {
      throwIfAborted(params.signal);
      const templateMeta = getTemplateExecutionMeta(resolved, resolved.template);
      const preview = this.deps.inputService.previewTemplateExecution(
        resolved.template,
        normalized.normalizedFormData,
        resolved.theme ?? undefined,
        templateMeta,
      );
      const beforeItems = getFileItemsByPath(this.deps.dataStore, preview.targetFilePath);
      const path = await this.deps.inputService.executeTemplate(
        resolved.template,
        normalized.normalizedFormData,
        resolved.theme ?? undefined,
        templateMeta,
        {
          signal: params.signal,
        },
      );

      const refreshPlan = buildRefreshPlan([path]);
      const scannedByPath = await applyRecordRefreshPlan(this.deps.dataStore, refreshPlan);
      const scannedItems = scannedByPath.get(path) ?? getFileItemsByPath(this.deps.dataStore, path);
      const createdRecord = locateCreatedRecord(beforeItems, scannedItems, buildCreatedRecordLocatorContext({
        template: resolved.template,
        theme: resolved.theme,
        meta: templateMeta,
        outputContent: preview.outputContent,
        normalizedFormData: normalized.normalizedFormData,
        appendMode: preview.header ? 'header' : 'append',
        targetHeader: preview.header ?? null,
        beforeItems,
      }));

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
    const prepared = prepareTemplateSubmit({
      kernel: this.getKernel(),
      operation: 'update',
      blockId: params.blockId,
      themeId: params.themeId ?? null,
      item: params.item,
      formData: params.formData,
      normalizeMode: 'edit',
      validateMode: 'edit',
    });
    if (!prepared.ok) return prepared.result;

    const { resolved, normalized, warnings } = prepared.submit;
    const templateMeta = getTemplateExecutionMeta(resolved, resolved.template);
    const outputPlan = buildRecordOutputPlan({
      template: resolved.template,
      formData: normalized.normalizedFormData,
      theme: resolved.theme ?? undefined,
      templateMeta,
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
        const beforeTargetItems = getFileItemsByPath(this.deps.dataStore, targetPath);
        const createdPath = await this.deps.inputService.createRecordAtPlannedLocation(
          resolved.template,
          normalized.normalizedFormData,
          resolved.theme ?? undefined,
          templateMeta,
          {
            signal: params.signal,
            autoRefresh: false,
          },
        );

        const scannedNewPath = await applyRecordRefreshPlan(this.deps.dataStore, buildRefreshPlan([createdPath], false));
        const afterTargetItems = scannedNewPath.get(createdPath) ?? getFileItemsByPath(this.deps.dataStore, createdPath);
        const createdRecord = locateCreatedRecord(beforeTargetItems, afterTargetItems, buildCreatedRecordLocatorContext({
          template: resolved.template,
          theme: resolved.theme,
          meta: templateMeta,
          outputContent: outputPlan.outputContent,
          normalizedFormData: normalized.normalizedFormData,
          appendMode: outputPlan.targetHeader ? 'header' : 'append',
          targetHeader: outputPlan.targetHeader ?? null,
          beforeItems: beforeTargetItems,
        }));

        try {
          const deletedPath = await this.deps.inputService.deleteExistingRecord(params.item, {
            signal: params.signal,
            autoRefresh: false,
          });
          return finalizeRecordSubmitResult(this.deps.dataStore, buildSuccessResult('update', {
            affectedPath: createdPath,
            affectedRecordId: createdRecord?.id ?? params.item.id,
            refresh: buildRefreshPlan([createdPath, deletedPath]),
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
            refresh: buildRefreshPlan([createdPath, persistencePlan.originalPath]),
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
        templateMeta,
        {
          signal: params.signal,
          autoRefresh: false,
        },
      );
      return finalizeRecordSubmitResult(this.deps.dataStore, buildSuccessResult('update', {
        affectedPath: path,
        affectedRecordId: params.item.id,
        refresh: buildRefreshPlan([path]),
        feedback: {
          notice: '✅ 已保存修改',
        },
        warnings,
      }));
    } catch (error) {
      return finalizeRecordSubmitResult(this.deps.dataStore, mapSubmitError('update', error, warnings, {
        refreshPaths: [getItemFilePath(params.item)],
      }));
    }
  }

  async submitDeleteRecord(params: SubmitDeleteRecordParams): Promise<RecordSubmitResult> {
    return submitFinalizedRecordMutation({
      dataStore: this.deps.dataStore,
      operation: 'delete',
      signal: params.signal,
      refreshPathsOnError: [getItemFilePath(params.item)],
      run: async () => {
        const path = await this.deps.inputService.deleteExistingRecord(params.item, {
          signal: params.signal,
          autoRefresh: false,
        });
        return buildSuccessResult('delete', {
          affectedPath: path,
          affectedRecordId: params.item.id,
          refresh: buildRefreshPlan([path]),
          feedback: {
            notice: '✅ 已删除记录',
          },
        });
      },
    });
  }

  async submitCompleteRecord(params: SubmitCompleteRecordParams): Promise<RecordSubmitResult> {
    return submitFinalizedRecordMutation({
      dataStore: this.deps.dataStore,
      operation: 'complete',
      signal: params.signal,
      refreshPathsOnError: () => [tryParseItemPath(params.itemId)],
      run: async () => {
        const path = parseItemLocator(params.itemId).path;
        const options = normalizeCompletionOptions(params.options);
        await this.deps.itemService.completeItem(params.itemId, options, { autoRefresh: false });
        return buildSuccessResult('complete', {
          affectedPath: path,
          affectedRecordId: params.itemId,
          refresh: buildRefreshPlan([path]),
          feedback: {
            notice: options?.duration != null
              ? `任务已完成，时长 ${options.duration} 分钟已记录。`
              : '任务已完成。',
          },
        });
      },
    });
  }

  async submitUpdateRecordTime(params: SubmitUpdateRecordTimeParams): Promise<RecordSubmitResult> {
    const normalizedUpdates = normalizeTimeUpdates(params.updates);
    if ('error' in normalizedUpdates) {
      return buildValidationErrorResult('time_update', [normalizedUpdates.error]);
    }

    return submitFinalizedRecordMutation({
      dataStore: this.deps.dataStore,
      operation: 'time_update',
      signal: params.signal,
      refreshPathsOnError: () => [tryParseItemPath(params.itemId)],
      run: async () => {
        const path = parseItemLocator(params.itemId).path;
        await this.deps.itemService.updateItemTime(params.itemId, normalizedUpdates, { autoRefresh: false });
        return buildSuccessResult('time_update', {
          affectedPath: path,
          affectedRecordId: params.itemId,
          refresh: buildRefreshPlan([path]),
          feedback: {
            notice: normalizedUpdates.duration != null
              ? `任务时长已更新为 ${normalizedUpdates.duration} 分钟。`
              : '任务时间已更新。',
          },
        });
      },
    });
  }

  private getKernel(): RecordInputKernel {
    return new RecordInputKernel(this.store.getState().settings);
  }
}

export function createRecordInputUseCase(store: AppStoreApi, deps: RecordInputUseCaseDeps): RecordInputUseCase {
  return new RecordInputUseCase(store, deps);
}
