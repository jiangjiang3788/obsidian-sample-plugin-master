// scr/views/index.ts - 视图组件注册表，将视图名称映射到组件
import { TableView }    from './TableView';
import { BlockView }    from './BlockView';
import { TimelineView } from './TimelineView';
import { CalendarView } from './CalendarView';
import { ChartView }    from './ChartView';
import { ExcelView }    from './ExcelView';
import { SettingsFormView } from './SettingsFormView'; 
/** 唯一维护的清单 */
export const VIEW_REGISTRY = {
  TableView,
  BlockView,
  TimelineView,
  CalendarView,
  ChartView,
  ExcelView,
  SettingsFormView, 
} as const;

export const ViewComponents = VIEW_REGISTRY;
export type ViewName = keyof typeof VIEW_REGISTRY;
export const VIEW_OPTIONS: ViewName[] = Object.keys(VIEW_REGISTRY) as ViewName[];