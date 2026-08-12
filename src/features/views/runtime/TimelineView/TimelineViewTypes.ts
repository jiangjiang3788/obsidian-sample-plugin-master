import type { TaskBlock } from '@core/types/public';

export interface DailyViewData {
  dateRangeDays: any[];
  blocksByDay: Record<string, TaskBlock[]>;
}
