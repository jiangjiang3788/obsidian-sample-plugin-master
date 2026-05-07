import type { BlockTemplate, ThemeDefinition, Item } from './schema';
import type { EditableRecordSnapshot, RecordOutputPlan, RecordPersistencePlan } from './recordSnapshot';

export type RecordOperation =
  | 'create'
  | 'update'
  | 'delete'
  | 'complete'
  | 'time_update';

export type RecordSubmitStatus =
  | 'success'
  | 'validation_error'
  | 'conflict'
  | 'cancelled'
  | 'error'
  | 'partial_success';

export type RecordInputSource =
  | 'quickinput'
  | 'ai_batch'
  | 'timer'
  | 'view_quick_create'
  | 'layout_renderer'
  | 'unknown';

export interface RecordSubmitIssue {
  code: string;
  message: string;
  field?: string;
}

export interface RecordSubmitResult {
  status: RecordSubmitStatus;
  operation: RecordOperation;
  affectedPath?: string;
  affectedRecordId?: string;
  refresh: {
    scanPaths: string[];
    notify: boolean;
  };
  feedback?: {
    notice?: string;
  };
  followUp?: {
    startTimerForRecordId?: string;
  };
  errors?: RecordSubmitIssue[];
  warnings?: RecordSubmitIssue[];
}


export type EntryKind = 'task' | 'block';

export interface EntryContext {
  entryKind: EntryKind;
  entryId: string;
  sourcePath?: string | null;
  sourceLine?: number | null;
  templateId?: string | null;
  categoryKey?: string | null;
  openedFrom?: 'list' | 'detail' | 'search' | 'timeline' | 'quickinput' | 'timer' | 'unknown';
  supportsTaskTimeEditing?: boolean;
}

export interface PrepareCreateRecordParams {
  blockId?: string | null;
  themeId?: string | null;
  context?: Record<string, unknown>;
  source?: RecordInputSource;
}

export interface PrepareEditRecordParams {
  item: Item;
  blockId?: string | null;
  themeId?: string | null;
  source?: Extract<RecordInputSource, 'quickinput' | 'timer' | 'unknown'>;
}

export interface PreparedCreateRecord {
  blockId: string | null;
  themeId: string | null;
  template: BlockTemplate | null;
  initialFormData: Record<string, unknown>;
  snapshot?: EditableRecordSnapshot | null;
  outputPlan?: RecordOutputPlan;
  persistencePlan?: RecordPersistencePlan;
  warnings: RecordSubmitIssue[];
}

export interface PreparedEditRecord {
  blockId: string | null;
  themeId: string | null;
  template: BlockTemplate | null;
  initialFormData: Record<string, unknown>;
  snapshot?: EditableRecordSnapshot | null;
  outputPlan?: RecordOutputPlan;
  persistencePlan?: RecordPersistencePlan;
  inferred: {
    usedFallbackBlock: boolean;
    usedFallbackTheme: boolean;
    templateSourceType?: 'block' | 'override' | null;
    resolvedBy?: 'exact' | 'inferred' | 'fallback';
  };
  warnings: RecordSubmitIssue[];
}

export interface SubmitCreateRecordParams {
  blockId: string;
  themeId?: string | null;
  formData: Record<string, unknown>;
  context?: Record<string, unknown>;
  meta?: {
    timeDirection?: 'forward' | 'backward';
  };
  signal?: AbortSignal;
  source?: Extract<RecordInputSource, 'quickinput' | 'ai_batch' | 'timer' | 'unknown' | 'view_quick_create'>;
}

export interface SubmitUpdateRecordParams {
  item: Item;
  blockId: string;
  themeId?: string | null;
  formData: Record<string, unknown>;
  meta?: {
    timeDirection?: 'forward' | 'backward';
  };
  /**
   * 主线收口：提交前 UI 实时预览到的输出计划。
   * usecase 会再次计算实际输出计划；如果二者不一致，说明 UI 预览和实际保存链路已经漂移，
   * 必须阻止本次保存，避免“界面显示写到 A，实际写到 B”。
   */
  expectedOutputPlan?: Pick<RecordOutputPlan, 'targetFilePath' | 'targetHeader'> | null;
  expectedPersistencePlan?: Pick<RecordPersistencePlan, 'originalPath' | 'pathChanged' | 'writeMode'> | null;
  signal?: AbortSignal;
  source?: Extract<RecordInputSource, 'quickinput' | 'unknown'>;
}

export interface SubmitDeleteRecordParams {
  item: Item;
  signal?: AbortSignal;
  source?: Extract<RecordInputSource, 'quickinput' | 'unknown'>;
}

export interface SubmitCompleteRecordParams {
  itemId: string;
  options?: {
    duration?: number;
    startTime?: string | null;
    endTime?: string | null;
  };
  signal?: AbortSignal;
  source?: Extract<RecordInputSource, 'timer' | 'layout_renderer' | 'unknown'>;
}

export interface SubmitUpdateRecordTimeParams {
  itemId: string;
  updates: {
    time?: string | null;
    start?: string | null;
    endTime?: string | null;
    end?: string | null;
    duration?: number | string | null;
    date?: string | null;
    direction?: 'forward' | 'backward';
  };
  signal?: AbortSignal;
  source?: Extract<RecordInputSource, 'timer' | 'layout_renderer' | 'unknown'>;
}

export interface ResolveDependenciesResult {
  blockId: string | null;
  themeId: string | null;
  template: BlockTemplate | null;
  theme: ThemeDefinition | null;
  warnings: RecordSubmitIssue[];
  errors: RecordSubmitIssue[];
  meta: {
    templateId?: string | null;
    templateSourceType?: 'block' | 'override' | null;
    usedFallbackBlock: boolean;
    usedFallbackTheme: boolean;
  };
}

export interface NormalizeRecordInputParams {
  template: BlockTemplate;
  formData: Record<string, unknown>;
  context?: Record<string, unknown>;
  mode: 'create' | 'edit' | 'ai_batch';
}

export interface NormalizeRecordInputResult {
  normalizedFormData: Record<string, unknown>;
  warnings: RecordSubmitIssue[];
}

export interface ValidateRecordInputParams {
  template: BlockTemplate | null;
  formData: Record<string, unknown>;
  mode: 'create' | 'edit' | 'delete' | 'complete' | 'time_update';
  item?: Item;
}

export interface RecordValidationResult {
  ok: boolean;
  errors: RecordSubmitIssue[];
  warnings: RecordSubmitIssue[];
}
