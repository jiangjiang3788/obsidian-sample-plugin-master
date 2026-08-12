/** Shared period contract used by Goal templates and Record capture definitions. */
export type PeriodGranularity = 'week' | 'month' | 'quarter' | 'year';

export interface PeriodPolicy {
  enabled: boolean;
  granularity: PeriodGranularity;
}
