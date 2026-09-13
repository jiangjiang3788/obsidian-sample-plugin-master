import type {
  NormalizeRecordInputParams,
  NormalizeRecordInputResult,
  PrepareCreateRecordParams,
  PrepareEditRecordParams,
  PreparedCreateRecord,
  PreparedEditRecord,
  RecordValidationResult,
  ResolveDependenciesResult,
  ValidateRecordInputParams,
} from '@/core/types/recordInput';
import type { ThinkSettings } from '@/core/settings/ThinkSettings';
import { buildEditRecordState } from './editStateResolver';
import { buildEditableRecordSnapshot } from './snapshot/EditSnapshotFactory';
import { normalizeRecordInput as normalizeRecordInputImpl } from './normalization';
import { resolveRecordDependencies } from './dependencyResolver';
import { validateRecordInput as validateRecordInputImpl } from './validation';

export class RecordInputKernel {
  constructor(private settings: ThinkSettings) {}

  prepareCreate(params: PrepareCreateRecordParams): PreparedCreateRecord {
    const resolved = this.resolveMissingDependencies({
      recordTypeId: params.recordTypeId ?? null,
      context: params.context ?? null,
      requireDirectGoalTemplate: true,
    });

    const snapshot = buildEditableRecordSnapshot({
      mode: 'create',
      recordTypeId: resolved.recordTypeId,
      fields: {},
      template: resolved.template,
    });

    return {
      recordTypeId: resolved.recordTypeId,
      template: resolved.template,
      initialFormData: {},
      snapshot,
      outputPlan: snapshot.outputPlan,
      persistencePlan: snapshot.persistencePlan,
      warnings: [...resolved.warnings],
    };
  }

  prepareEdit(params: PrepareEditRecordParams): PreparedEditRecord {
    return buildEditRecordState({
      settings: this.settings,
      item: params.item,
      preferredRecordTypeId: params.recordTypeId ?? null,
    });
  }

  resolveMissingDependencies(params: {
    recordTypeId?: string | null;
    item?: PrepareEditRecordParams['item'] | null;
    context?: Record<string, unknown> | null;
    requireDirectGoalTemplate?: boolean;
  }): ResolveDependenciesResult {
    return resolveRecordDependencies({
      settings: this.settings,
      recordTypeId: params.recordTypeId ?? null,
      item: params.item ?? null,
      context: params.context ?? null,
      requireDirectGoalTemplate: params.requireDirectGoalTemplate === true,
    });
  }

  normalizeRecordInput(params: NormalizeRecordInputParams): NormalizeRecordInputResult {
    return normalizeRecordInputImpl(params);
  }

  validateRecordInput(params: ValidateRecordInputParams): RecordValidationResult {
    return validateRecordInputImpl(params);
  }
}
