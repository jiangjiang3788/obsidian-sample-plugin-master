// src/core/records/RecordEntity.ts
import type { IThemeMatcher } from '@/core/types/theme';
import type { RecurrenceInfo } from './task/RecurrenceTypes';

/** Current Markdown storage location. Location is mutable metadata, never identity. */
export interface RecordSourceLocation {
  path: string;
  startLine: number;
  endLine: number;
  modified: number;
}

/**
 * Canonical runtime Record entity.
 *
 * R2 deliberately keeps this shape small. It contains identity, source and facts that
 * are valid across Record families. Task/Series/Session/Habit-specific properties are
 * defined on typed projections below and MUST NOT be added back to this base type.
 */
export interface RecordEntity {
  id: string;
  schemaVersion: number;
  coreBlock: string;

  title: string;
  content: string;
  editableText?: string;
  rawSource?: string;
  fullData?: string;
  tags: string[];

  /** Transitional creation provenance. R10 removes it from persisted generic records. */
  templateId?: string;
  templateSourceType?: 'core-block' | 'goal-template';

  goalId?: string;
  goalPath?: string;
  rootGoal?: string;
  leafGoal?: string;

  /** Historical theme snapshot plus derived theme view fields. */
  theme?: string;
  themePath?: string;
  rootTheme?: string;
  leafTheme?: string;

  /** Transitional human category label; never a Record type discriminator. */
  categoryKey: string;

  date?: string;
  dateMs?: number;
  dateSource?: 'done' | 'due' | 'scheduled' | 'start' | 'created' | 'end' | 'block';
  startISO?: string;
  endISO?: string;
  startMs?: number;
  endMs?: number;

  created: number;
  modified: number;
  filename?: string;
  fileName?: string;
  header?: string;
  folder?: string;
  icon?: string;
  extra: Record<string, string | number | boolean>;

  source?: RecordSourceLocation;
  file?: {
    path: string;
    line?: number;
    basename?: string;
    folder?: string;
  };

  /** Transitional generic time/display fields. R5/R6 decide their final query projection. */
  startTime?: string;
  endTime?: string;
  duration?: number;
  period?: string;
  periodCount?: number;
  cycleId?: string;
}

export type GenericRecordCoreBlock = 'thought' | 'evidence' | 'plan' | 'review' | 'blocker' | 'milestone';

export interface GenericRecord extends RecordEntity {
  coreBlock: GenericRecordCoreBlock;
}

export interface ThoughtRecord extends RecordEntity {
  coreBlock: 'thought';
  /** Canonical target field; old 分类 values remain transitional until R10. */
  recordSubtype?: '感受' | '思考';
}

export interface HabitRecord extends RecordEntity {
  coreBlock: 'habit';
  rating?: number;
  image?: string;
  /** Transitional image alias; R10 converges it to image. */
  pintu?: string;
  displayCount?: number;
  levelCount?: number;
  countForLevel?: boolean;
  manuallyEdited?: boolean;
}

export type TaskRecordStatus = 'open' | 'done' | 'cancelled' | 'skipped';
export type RecordTaskPriority = 'lowest' | 'low' | 'medium' | 'high' | 'highest';

export interface TaskRecordEntity extends RecordEntity {
  coreBlock: 'task';
  status: TaskRecordStatus;
  seriesId?: string;
  /** Derived from TaskSeries for consumers; never persisted on Task instances. */
  recurrenceInfo?: RecurrenceInfo;
  priority?: RecordTaskPriority;
  expectedDurationMinutes?: number;
  energyDemand?: string;
  brainDemand?: string;
  physicalDemand?: string;
  createdAt?: string;
  createdDate?: string;
  scheduledDate?: string;
  startDate?: string;
  dueDate?: string;
  doneDate?: string;
  cancelledDate?: string;
  completedAt?: string;
  cancelledAt?: string;
  skippedAt?: string;
}

export interface TaskSeriesRecordEntity extends RecordEntity {
  coreBlock: 'task-series';
  status: 'active' | 'stopped';
  recurrenceInfo: RecurrenceInfo;
  priority?: RecordTaskPriority;
  expectedDurationMinutes?: number;
  energyDemand?: string;
  brainDemand?: string;
  physicalDemand?: string;
  seriesStartDate?: string;
  currentTaskId?: string;
  rolloverPolicy?: 'carry';
}

export interface TaskSessionRecordEntity extends RecordEntity {
  coreBlock: 'task-session';
  taskId: string;
  seriesId?: string;
  sessionStartedAt: string;
  sessionEndedAt: string;
  sessionDurationMinutes: number;
  sessionResult: 'work-block-ended' | 'task-completed';
  sessionSource: 'timer' | 'energy-view' | 'unknown';
  suggestedDurationMinutes?: number;
  startEnergyRecordId?: string;
  endEnergyRecordId?: string;
  energyDelta?: number;
  brainDelta?: number;
  physicalDelta?: number;
}

/** Parsed Energy records currently expose their domain payload through extra/FieldResolver. */
export interface EnergyRecordEntity extends RecordEntity {
  coreBlock: 'energy';
}

export type AnyRecordEntity =
  | GenericRecord
  | ThoughtRecord
  | HabitRecord
  | TaskRecordEntity
  | TaskSeriesRecordEntity
  | TaskSessionRecordEntity
  | EnergyRecordEntity
  | RecordEntity;

/**
 * Consumer projection used by existing View/Search/Field surfaces during R2-R6.
 *
 * This is intentionally NOT the persistence/domain model. It is the explicit compatibility
 * surface that replaces the old mega universal projection. Domain code should narrow RecordEntity with
 * asTaskRecord/asTaskSeriesRecord/asTaskSessionRecord/asHabitRecord instead.
 */
export interface RecordViewItem extends RecordEntity {
  /** Consumer-only flattened domain projection. Do not use as a persistence model. */
  status?: TaskRecordStatus | 'active' | 'stopped' | string;
  recurrenceInfo?: RecurrenceInfo;
  seriesId?: string;
  seriesStartDate?: string;
  currentTaskId?: string;
  rolloverPolicy?: 'carry';
  priority?: RecordTaskPriority;
  expectedDurationMinutes?: number;
  energyDemand?: string;
  brainDemand?: string;
  physicalDemand?: string;
  createdAt?: string;
  createdDate?: string;
  scheduledDate?: string;
  startDate?: string;
  dueDate?: string;
  doneDate?: string;
  cancelledDate?: string;
  completedAt?: string;
  cancelledAt?: string;
  skippedAt?: string;

  taskId?: string;
  sessionStartedAt?: string;
  sessionEndedAt?: string;
  sessionDurationMinutes?: number;
  sessionResult?: 'work-block-ended' | 'task-completed' | string;
  sessionSource?: 'timer' | 'energy-view' | 'unknown' | string;
  suggestedDurationMinutes?: number;
  startEnergyRecordId?: string;
  endEnergyRecordId?: string;
  energyDelta?: number;
  brainDelta?: number;
  physicalDelta?: number;

  recordSubtype?: '感受' | '思考' | string;
  rating?: number;
  image?: string;
  pintu?: string;
  displayCount?: number;
  levelCount?: number;
  countForLevel?: boolean;
  manuallyEdited?: boolean;
}

export function toRecordViewItem(record: RecordEntity): RecordViewItem {
  return record as RecordViewItem;
}

export function asHabitRecord(record: RecordEntity | null | undefined): HabitRecord | null {
  return record?.coreBlock === 'habit' ? record as HabitRecord : null;
}

/** 文件级扫描上下文。 */
export interface RecordFileContext {
  filePath: string;
  fileName: string;
  parentFolder: string;
  created: number;
  modified: number;
}

/** 当前记录所在 Markdown 位置上下文。 */
export interface RecordLocationContext {
  /** 1-based line number. */
  line?: number;
  /** Markdown heading/section only; never used as theme. */
  header?: string;
  /** Tags inherited from current heading, e.g. ## Work #project/a. */
  sectionTags?: string[];
}

export interface RecordNormalizeContext extends RecordFileContext, RecordLocationContext {
  themeMatcher?: IThemeMatcher;
}
