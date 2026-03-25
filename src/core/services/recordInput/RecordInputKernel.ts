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
import type { InputSettings } from '@/core/types/schema';
import { buildEditRecordState } from './editStateResolver';
import { normalizeRecordInput as normalizeRecordInputImpl } from './normalization';
import { resolveRecordDependencies } from './dependencyResolver';
import { validateRecordInput as validateRecordInputImpl } from './validation';

export class RecordInputKernel {
  constructor(private settings: InputSettings) {}

  prepareCreate(params: PrepareCreateRecordParams): PreparedCreateRecord {
    const resolved = this.resolveMissingDependencies({
      blockId: params.blockId ?? null,
      themeId: params.themeId ?? null,
    });

    return {
      blockId: resolved.blockId,
      themeId: resolved.themeId,
      template: resolved.template,
      initialFormData: {},
      warnings: [...resolved.warnings],
    };
  }

  prepareEdit(params: PrepareEditRecordParams): PreparedEditRecord {
    return buildEditRecordState({
      settings: this.settings,
      item: params.item,
      preferredBlockId: params.blockId ?? null,
      preferredThemeId: params.themeId ?? null,
    });
  }

  resolveMissingDependencies(params: { blockId?: string | null; themeId?: string | null; item?: PrepareEditRecordParams['item'] | null }): ResolveDependenciesResult {
    return resolveRecordDependencies({
      settings: this.settings,
      blockId: params.blockId ?? null,
      themeId: params.themeId ?? null,
      item: params.item ?? null,
    });
  }

  normalizeRecordInput(params: NormalizeRecordInputParams): NormalizeRecordInputResult {
    return normalizeRecordInputImpl(params);
  }

  validateRecordInput(params: ValidateRecordInputParams): RecordValidationResult {
    return validateRecordInputImpl(params);
  }
}
