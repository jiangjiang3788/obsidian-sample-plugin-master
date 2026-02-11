import type { Item } from '@core/public';

export type StatisticsCurrentView = '年' | '季' | '月' | '周' | '天';

export type StatisticsCellClickHandler = (
  cellIdentifier: any,
  target: HTMLElement,
  blocks: Item[],
  title: string
) => void;
