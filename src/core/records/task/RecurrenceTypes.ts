export type RecurrenceUnit = 'day' | 'week' | 'month' | 'quarter' | 'year';
export type RecurrenceAnchor = 'scheduled' | 'start' | 'due' | 'completion';
export type TaskRolloverPolicy = 'carry';

/** Canonical Task Series recurrence persisted as structured fields. */
export interface RecurrenceInfo {
  interval: number;
  unit: RecurrenceUnit;
  anchor: RecurrenceAnchor;
}
