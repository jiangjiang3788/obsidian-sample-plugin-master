import type { RecordCaptureTemplate } from '@/core/recordInput/CaptureTemplate';
import type { RecordViewItem } from '@/core/records/RecordEntity';
import type { EditableRecordSnapshot, RecordOutputPlan, RecordPersistencePlan } from './recordSnapshot';
import type { TaskSessionCreateInput } from './timer';
import type { TaskSeriesEditIntent } from '@/core/records/task/taskSeriesEdit';
import type { TimelineEditTarget, TimelineLogicalRange } from './timeline';

export type RecordOperation =
  | 'create'
  | 'update'
  | 'delete'
  | 'complete'
  | 'task_session'
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

export interface RecordInputMeta {
  timeDirection?: 'forward' | 'backward';
  taskSeriesEdit?: TaskSeriesEditIntent;
}

export interface RecordSubmitIssue {
  code: string;
  message: string;
  field?: string;
}

export type RecordContinuationReason = 'task_completion';

/**
 * Internal orchestration metadata carried from the saved source Record into a
 * continuation create flow. It is not a persisted Record field and intentionally
 * contains no Relation semantics: continuation must stay useful even if the
 * product never persists RecordRelation.
 */
export interface RecordContinuationContext {
  /** Root Record that started this continuation chain. */
  sourceRecordId: string;
  reason: RecordContinuationReason;
  expectedGoalPath: string;
  /** RecordTypes already created in this chain; they are hidden from the next panel. */
  completedRecordTypeIds: string[];
}

export interface RecordContinuationOption {
  kind: 'create_record';
  label: string;
  recordTypeId: string;
  context: Record<string, unknown> & {
    __recordContinuation: RecordContinuationContext;
  };
  /** The user already chose the next RecordType from the continuation panel. */
  allowRecordTypeSwitch: false;
}

export interface RecordContinuationFollowUp {
  kind: 'record_continuation';
  reason: RecordContinuationReason;
  sourceRecordId: string;
  goalPath: string;
  options: RecordContinuationOption[];
  /** Safe because the source Record is already persisted before this state exists. */
  dismissOnOutsideClick: true;
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
    continuation?: RecordContinuationFollowUp;
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
  openedFrom?: 'list' | 'detail' | 'search' | 'timeline' | 'quickinput' | 'timer' | 'unknown';
}

export interface PrepareCreateRecordParams {
  recordTypeId?: string | null;
  context?: Record<string, unknown>;
  source?: RecordInputSource;
}

export interface PrepareEditRecordParams {
  item: RecordViewItem;
  recordTypeId?: string | null;
  source?: Extract<RecordInputSource, 'quickinput' | 'timer' | 'unknown'>;
}

export interface PreparedCreateRecord {
  recordTypeId: string | null;
  template: RecordCaptureTemplate | null;
  initialFormData: Record<string, unknown>;
  snapshot?: EditableRecordSnapshot | null;
  outputPlan?: RecordOutputPlan;
  persistencePlan?: RecordPersistencePlan;
  warnings: RecordSubmitIssue[];
}

export interface PreparedEditRecord {
  recordTypeId: string | null;
  template: RecordCaptureTemplate | null;
  initialFormData: Record<string, unknown>;
  snapshot?: EditableRecordSnapshot | null;
  outputPlan?: RecordOutputPlan;
  persistencePlan?: RecordPersistencePlan;
  inferred: {
    usedFallbackRecordType: boolean;
    canonicalRecordTypeId?: string | null;
    templateSourceType?: 'record-type' | 'goal-template' | null;
    resolvedBy?: 'exact' | 'inferred' | 'fallback';
  };
  warnings: RecordSubmitIssue[];
}

export interface SubmitCreateRecordParams {
  recordTypeId: string;
  formData: Record<string, unknown>;
  context?: Record<string, unknown>;
  meta?: RecordInputMeta;
  signal?: AbortSignal;
  source?: Extract<RecordInputSource, 'quickinput' | 'ai_batch' | 'timer' | 'unknown' | 'view_quick_create'>;
}

export interface SubmitUpdateRecordParams {
  item: RecordViewItem;
  recordTypeId: string;
  formData: Record<string, unknown>;
  meta?: RecordInputMeta;
  expectedOutputPlan?: Pick<RecordOutputPlan, 'targetFilePath' | 'targetHeader'> | null;
  expectedPersistencePlan?: Pick<RecordPersistencePlan, 'originalPath' | 'pathChanged' | 'writeMode'> | null;
  signal?: AbortSignal;
  source?: Extract<RecordInputSource, 'quickinput' | 'unknown'>;
}

export interface SubmitDeleteRecordParams {
  item: RecordViewItem;
  signal?: AbortSignal;
  source?: Extract<RecordInputSource, 'quickinput' | 'unknown'>;
}

export interface SubmitCompleteRecordParams {
  itemId: string;
  session?: TaskSessionCreateInput;
  signal?: AbortSignal;
  source?: Extract<RecordInputSource, 'quickinput' | 'timer' | 'layout_renderer' | 'unknown'>;
}

export interface SubmitTaskSessionParams {
  itemId: string;
  session: TaskSessionCreateInput;
  signal?: AbortSignal;
  source?: Extract<RecordInputSource, 'timer' | 'unknown'>;
}

export interface SubmitUpdateTimelineRangeParams {
  target: TimelineEditTarget;
  range: TimelineLogicalRange;
  signal?: AbortSignal;
  source?: Extract<RecordInputSource, 'timer' | 'layout_renderer' | 'unknown'>;
}

export interface ResolveDependenciesResult {
  recordTypeId: string | null;
  template: RecordCaptureTemplate | null;
  warnings: RecordSubmitIssue[];
  errors: RecordSubmitIssue[];
  meta: {
    templateId?: string | null;
    templateSourceType?: 'record-type' | 'goal-template' | null;
    usedFallbackRecordType: boolean;
    canonicalRecordTypeId?: string | null;
  };
}

export interface NormalizeRecordInputParams {
  template: RecordCaptureTemplate;
  formData: Record<string, unknown>;
  context?: Record<string, unknown>;
  mode: 'create' | 'edit' | 'ai_batch';
}

export interface NormalizeRecordInputResult {
  normalizedFormData: Record<string, unknown>;
  warnings: RecordSubmitIssue[];
}

export interface ValidateRecordInputParams {
  template: RecordCaptureTemplate | null;
  formData: Record<string, unknown>;
  mode: 'create' | 'edit' | 'delete' | 'complete' | 'time_update';
  item?: RecordViewItem;
}

export interface RecordValidationResult {
  ok: boolean;
  errors: RecordSubmitIssue[];
  warnings: RecordSubmitIssue[];
}
