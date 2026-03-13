/**
 * @file 功能汇总入口（Theme + Settings + Dashboard）
 * 
 * 架构：使用 zustand store + useCases 进行状态管理
 */

/* ========================================================================== */
/* 1. Theme 相关导出                                                          */
/* ========================================================================== */

export { ThemeManager } from './ThemeManager';
export { ThemeMatrix } from './ThemeMatrix';


/* ========================================================================== */
/* 2. Settings 模块（设置面板 + 视图编辑器）                                   */
/* ========================================================================== */

import type ThinkPlugin from '@main';
import { SettingsTab } from './SettingsTab';
import { DataStore } from '@core/public';

import { BlockViewEditor } from './BlockViewEditor';
import { ExcelViewEditor } from './ExcelViewEditor';
import { HeatmapViewEditor } from './HeatmapViewEditor';
import { StatisticsViewEditor } from './StatisticsViewEditor';
import { ProgressViewEditor } from './ProgressViewEditor';
import { TaskExecutionViewEditor } from './TaskExecutionViewEditor';
import { TableViewEditor } from './TableViewEditor';
import { TimelineViewEditor } from './TimelineViewEditor';

// 设置页里的多个子设置组件
export { LayoutSettings } from './LayoutSettings';
export { InputSettings } from './InputSettings';
export { GeneralSettings } from './GeneralSettings';

/**
 * Settings 模块内部用到的"视图编辑器组件"映射
 * 原来的 ViewComponents，这里改名为 SettingsViewComponents
 * 避免和 Dashboard 的 ViewComponents 冲突
 */
export const SettingsViewComponents = {
  Block: BlockViewEditor,
  Excel: ExcelViewEditor,
  Heatmap: HeatmapViewEditor,
  Statistics: StatisticsViewEditor,
  Progress: ProgressViewEditor,
  Table: TableViewEditor,
  Timeline: TimelineViewEditor,
};

/** 
 * Settings 模块依赖项接口
 */
export interface SettingsDependencies {
  app: any;
  plugin: ThinkPlugin;
  dataStore: DataStore;
}

/**
 * Settings 初始化函数
 * 原：export function setup(deps: SettingsDependencies)
 * 这里重命名为 setupSettings，避免和 Dashboard 的 setup 冲突
 * 
 * ⚠️ P1 重构：SettingsTab 不再需要单独传递 dataStore
 * 所有依赖通过 plugin 实例获取，再通过 ServicesProvider 注入 Context
 */
export function setupSettings(deps: SettingsDependencies): void {
  // SettingsTab 通过 plugin 实例获取所有依赖
  deps.plugin.addSettingTab(new SettingsTab(deps.app, deps.plugin));
}

/* ========================================================================== */
/* 3. Dashboard 核心逻辑（数据监听 + 代码块嵌入）                             */
/* ========================================================================== */

import type { RendererService } from './RendererService';
import type { EventsPort } from '@core/public';
import type { ActionService } from '@core/public';

import { VaultWatcher } from '@/platform/events/VaultWatcher';
import { CodeblockEmbedder } from './CodeblockEmbedder';

/** 
 * Dashboard 功能依赖项接口
 */
export interface DashboardDependencies {
  plugin: ThinkPlugin;
  eventsPort: EventsPort;
  dataStore: DataStore;
  rendererService: RendererService;
  actionService: ActionService;
}

/**
 * Dashboard 初始化函数
 * 原：export function setup(deps: DashboardDependencies)
 * 这里重命名为 setupDashboard
 */
export function setupDashboard(deps: DashboardDependencies): () => void {
  const { plugin, eventsPort, dataStore, rendererService, actionService } = deps;

  // 监听 Vault 变化（通过 EventsPort，避免 features 直触 obsidian 类型）
  const watcher = new VaultWatcher(eventsPort, dataStore);

  // S8.2: CodeblockEmbedder 不再需要 appStore 参数
  new CodeblockEmbedder(plugin, dataStore, rendererService, actionService);

  return () => {
    try { watcher.dispose(); } catch {}
  };
}

/* ========================================================================== */
/* 4. Dashboard UI / 视图注册表                                               */
/* ========================================================================== */

import {
  TableView,
  BlockView,
  ExcelView,
  StatisticsView,
  TimelineView,
  EventTimelineView,
  HeatmapView,
  ProgressView,
  TaskExecutionView,
} from '@shared/public';
import type { ComponentType } from 'preact';

/** 从 Domain 层导入 ViewName 和 VIEW_OPTIONS */
import type { ViewName } from '@core/public';
import { VIEW_OPTIONS as DOMAIN_VIEW_OPTIONS } from '@core/public';

/**
 * 视图注册表：域层的 ViewName -> 具体视图组件
 */
export const VIEW_REGISTRY: Record<ViewName, ComponentType<any>> = {
  TableView,
  BlockView,
  TimelineView,
  EventTimelineView,
  ExcelView,
  StatisticsView,
  HeatmapView,
  ProgressView,
  TaskExecutionView,
} as const;

/**
 * 仪表盘中真正使用的视图映射
 * 原来的 dashboard/ui 里的 ViewComponents，这里改名为 DashboardViewComponents
 */
export const DashboardViewComponents = VIEW_REGISTRY;

/** 再把 ViewName 和 VIEW_OPTIONS 暴露出去，供下拉框等 UI 使用 */
export { ViewName, DOMAIN_VIEW_OPTIONS as VIEW_OPTIONS };
