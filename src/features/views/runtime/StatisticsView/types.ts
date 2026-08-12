import type { RecordViewItem } from '@core/types/public';

export type StatisticsCurrentView = '年' | '季' | '月' | '周' | '天';

export type StatisticsCellClickHandler = (
  cellIdentifier: any,
  target: HTMLElement,
  blocks: RecordViewItem[],
  title: string
) => void;
