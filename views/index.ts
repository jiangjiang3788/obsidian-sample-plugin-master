// views/index.ts ─ 视图注册表（已移除 SettingsFormView）
import { TableView }    from './TableView';
import { BlockView }    from './BlockView';
import { TimelineView } from './TimelineView';
import { CalendarView } from './CalendarView';
import { ChartView }    from './ChartView';
import { ExcelView }    from './ExcelView';

/** 唯一维护的清单（SettingsFormView 已移除） */
export const VIEW_REGISTRY = {
  TableView,
  BlockView,
  TimelineView,
  CalendarView,
  ChartView,
  ExcelView,
} as const;

export const ViewComponents = VIEW_REGISTRY;
export type ViewName = keyof typeof VIEW_REGISTRY;
export const VIEW_OPTIONS: ViewName[] = Object.keys(VIEW_REGISTRY) as ViewName[];