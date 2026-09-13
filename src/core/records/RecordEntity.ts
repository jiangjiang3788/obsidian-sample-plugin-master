// src/core/records/RecordEntity.ts
import type { RecurrenceInfo } from './task/RecurrenceTypes';
import type { RecordType } from './schema/types';

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
  recordType: RecordType;

  title: string;
  content: string;
  editableText?: string;
  rawSource?: string;
  fullData?: string;
  tags: string[];


  goalPath?: string;
  rootGoal?: string;
  leafGoal?: string;


  date?: string;
  dateMs?: number;
  /** Compatibility projection source. Task-specific views should query explicit date facts. */
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

  /** Generic view projection fields; never persisted as Task storage aliases. */
  startTime?: string;
  endTime?: string;
  duration?: number;
  period?: string;
  periodCount?: number;
  cycleId?: string;
}

export type GenericRecordType = 'thought' | 'feeling' | 'event' | 'plan' | 'review' | 'blocker' | 'milestone';

export interface GenericRecord extends RecordEntity {
  recordType: GenericRecordType;
}


export interface HabitRecord extends RecordEntity {
  recordType: 'habit';
  rating?: number;
  image?: string;
  displayCount?: number;
  levelCount?: number;
  countForLevel?: boolean;
  manuallyEdited?: boolean;
}

export type TaskRecordStatus = 'open' | 'done' | 'cancelled' | 'skipped';
export type RecordTaskPriority = 'lowest' | 'low' | 'medium' | 'high' | 'highest';
export type TaskImportance = 'important' | 'normal';
export type TaskUrgency = 'urgent' | 'normal';
export type TaskAvailabilityContext = 'any' | 'work' | 'home' | 'commute' | 'out';

export interface TaskRecordEntity extends RecordEntity {
  recordType: 'task';
  status: TaskRecordStatus;
  seriesId?: string;
  /** Derived from TaskSeries for consumers; never persisted on Task instances. */
  recurrenceInfo?: RecurrenceInfo;
  priority?: RecordTaskPriority;
  importance?: TaskImportance;
  urgency?: TaskUrgency;
  expectedDurationMinutes?: number;
  energyDemand?: string;
  brainDemand?: string;
  physicalDemand?: string;
  availabilityContexts?: TaskAvailabilityContext[];
  recoveryIntent?: boolean;
  createdAt?: string;
  createdDate?: string;
  scheduledAt?: string;
  startAt?: string;
  endAt?: string;
  dueAt?: string;
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
  recordType: 'task-series';
  status: 'active' | 'stopped';
  recurrenceInfo: RecurrenceInfo;
  priority?: RecordTaskPriority;
  importance?: TaskImportance;
  urgency?: TaskUrgency;
  expectedDurationMinutes?: number;
  energyDemand?: string;
  brainDemand?: string;
  physicalDemand?: string;
  availabilityContexts?: TaskAvailabilityContext[];
  recoveryIntent?: boolean;
  seriesStartDate?: string;
  currentTaskId?: string;
  rolloverPolicy?: 'carry';
}

export interface TaskSessionRecordEntity extends RecordEntity {
  recordType: 'task-session';
  taskId: string;
  seriesId?: string;
  sessionStartedAt: string;
  sessionEndedAt: string;
  sessionDurationMinutes: number;
  sessionResult: 'work-block-ended' | 'task-completed';
  sessionSource: 'timer' | 'energy-view' | 'timeline' | 'unknown';
  suggestedDurationMinutes?: number;
  startEnergyRecordId?: string;
  endEnergyRecordId?: string;
  energyDelta?: number;
  brainDelta?: number;
  physicalDelta?: number;
}

/** Parsed Energy records currently expose their domain payload through extra/FieldResolver. */
export interface EnergyRecordEntity extends RecordEntity {
  recordType: 'energy';
}

export type AnyRecordEntity =
  | GenericRecord
  | HabitRecord
  | TaskRecordEntity
  | TaskSeriesRecordEntity
  | TaskSessionRecordEntity
  | EnergyRecordEntity
  | RecordEntity;

/**
 * Consumer projection used by View/Search/Field surfaces.
 *
 * This is intentionally NOT the persistence/domain model. Domain code should narrow RecordEntity with
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
  importance?: TaskImportance;
  urgency?: TaskUrgency;
  expectedDurationMinutes?: number;
  energyDemand?: string;
  brainDemand?: string;
  physicalDemand?: string;
  availabilityContexts?: TaskAvailabilityContext[];
  recoveryIntent?: boolean;
  createdAt?: string;
  createdDate?: string;
  scheduledAt?: string;
  startAt?: string;
  endAt?: string;
  dueAt?: string;
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

  /** Domain-specific subtype; currently owned by Energy records, not Thought/Feeling. */
  recordSubtype?: string;
  rating?: number;
  image?: string;
  displayCount?: number;
  levelCount?: number;
  countForLevel?: boolean;
  manuallyEdited?: boolean;
}

export function toRecordViewItem(record: RecordEntity): RecordViewItem {
  return record as RecordViewItem;
}

export function asHabitRecord(record: RecordEntity | null | undefined): HabitRecord | null {
  return record?.recordType === 'habit' ? record as HabitRecord : null;
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
}
