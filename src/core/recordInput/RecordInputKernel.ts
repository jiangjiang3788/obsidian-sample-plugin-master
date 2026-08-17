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
      blockId: params.blockId ?? null,
      context: params.context ?? null,
    });

    const snapshot = buildEditableRecordSnapshot({
      mode: 'create',
      blockId: resolved.blockId,
      fields: {},
      template: resolved.template,
    });

    return {
      blockId: resolved.blockId,
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
      preferredBlockId: params.blockId ?? null,
    });
  }

  resolveMissingDependencies(params: {
    blockId?: string | null;
    item?: PrepareEditRecordParams['item'] | null;
    context?: Record<string, unknown> | null;
  }): ResolveDependenciesResult {
    return resolveRecordDependencies({
      settings: this.settings,
      blockId: params.blockId ?? null,
      item: params.item ?? null,
      context: params.context ?? null,
    });
  }

  normalizeRecordInput(params: NormalizeRecordInputParams): NormalizeRecordInputResult {
    return normalizeRecordInputImpl(params);
  }

  validateRecordInput(params: ValidateRecordInputParams): RecordValidationResult {
    return validateRecordInputImpl(params);
  }
}
