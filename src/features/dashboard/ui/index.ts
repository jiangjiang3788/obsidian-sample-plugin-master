// src/features/dashboard/ui/index.ts
import { TableView } from './TableView';
import { BlockView } from './BlockView';
import { ExcelView } from './ExcelView';
import { TimelineView } from './TimelineView'; // 1. 导入新的视图组件

/* ------------------------------------------------------------------ */
/* 视图注册表                                                         */
/* ------------------------------------------------------------------ */
export const VIEW_REGISTRY = {
  TableView,
  BlockView,
  TimelineView, // 2. 在注册表中添加新视图
  ExcelView,
} as const;

/** Dashboard.tsx 动态调用用这个常量 */
export const ViewComponents = VIEW_REGISTRY;

/** 所有可选视图名称（下拉框等用） */
export type ViewName = keyof typeof VIEW_REGISTRY;
export const VIEW_OPTIONS: ViewName[] = Object.keys(VIEW_REGISTRY) as ViewName[];