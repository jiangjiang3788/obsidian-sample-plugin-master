// src/views/index.ts
// 统一注册所有可用视图，并导出 ViewComponents 供 Dashboard.tsx 动态选择



import { TableView }   from './TableView';
import { BlockView }   from './BlockView';
import { ExcelView }   from './ExcelView';

export * from './DashboardConfigForm' 


/* ------------------------------------------------------------------ */
/* 视图注册表 —— key = 视图名称（外部配置使用）                        */
/* ------------------------------------------------------------------ */
export const VIEW_REGISTRY = {
  TableView,
  BlockView,
  ExcelView,
} as const;

/** Dashboard.tsx 动态调用用这个常量 */
export const ViewComponents = VIEW_REGISTRY;

/** 所有可选视图名称（下拉框等用） */
export type ViewName = keyof typeof VIEW_REGISTRY;
export const VIEW_OPTIONS: ViewName[] = Object.keys(VIEW_REGISTRY) as ViewName[];
