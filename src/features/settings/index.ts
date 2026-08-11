/**
 * @file 功能汇总入口（Theme + Settings + Dashboard）
 * 
 * 架构：使用 zustand store + useCases 进行状态管理
 */

/* ========================================================================== */
/* 1. Theme 相关导出                                                          */
/* ========================================================================== */

export { ThemeManager } from './theme/ThemeManager';
// ThemeMatrix runtime UI removed in single-user convergence; theme remains metadata only.


/* ========================================================================== */
/* 2. Settings 模块（设置面板 + 视图编辑器）                                   */
/* ========================================================================== */

import type ThinkPlugin from '@main';
import { SettingsTab, registerThinkSettingsWorkspaceView, openThinkSettingsWorkspaceView } from '@/platform/obsidian/public';
import { DataStore } from '@core/services/public';

import { BlockViewEditor } from './views/editors/BlockViewEditor';
import { ExcelViewEditor } from './views/editors/ExcelViewEditor';
import { HeatmapViewEditor } from './views/editors/HeatmapViewEditor';
import { StatisticsViewEditor } from './views/editors/StatisticsViewEditor';
import { ProgressViewEditor } from './views/editors/ProgressViewEditor';
import { EnergyViewEditor } from './views/editors/EnergyViewEditor';
import { TableViewEditor } from './views/editors/TableViewEditor';
import { TimelineViewEditor } from './views/editors/TimelineViewEditor';

// 设置页里的多个子设置组件
export { LayoutSettings } from './tabs/LayoutSettings';
export { InputSettings } from './tabs/InputSettings';
export { DataManagementSettings } from './tabs/DataManagementSettings';
export { GeneralSettings } from './tabs/GeneralSettings';

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
  Energy: EnergyViewEditor,
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
  registerThinkSettingsWorkspaceView(deps.plugin);
  deps.plugin.addCommand({
    id: 'think-open-control-center',
    name: '打开 Think OS 控制台（标签页）',
    callback: () => { void openThinkSettingsWorkspaceView(deps.plugin); },
  });
}

/* ========================================================================== */
/* 3. Dashboard 核心逻辑（数据监听 + 代码块嵌入）                             */
/* ========================================================================== */

import type { RendererService } from './layout/RendererService';
import type { EventsPort } from '@core/ports/public';
import type { ActionService } from '@core/services/public';

import { VaultWatcher } from '@/platform/obsidian/public';
import { CodeblockEmbedder } from './layout/CodeblockEmbedder';

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
  EnergyView,
} from '@features/settings/views/public';
import type { ComponentType } from 'preact';

/** 从 Domain 层导入 ViewName 和 VIEW_OPTIONS */
import type { ViewName } from '@core/types/public';
import { VIEW_OPTIONS as DOMAIN_VIEW_OPTIONS } from '@core/types/public';

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
  EnergyView,
} as const;

/**
 * 仪表盘中真正使用的视图映射
 * 原来的 dashboard/ui 里的 ViewComponents，这里改名为 DashboardViewComponents
 */
export const DashboardViewComponents = VIEW_REGISTRY;

/** 再把 ViewName 和 VIEW_OPTIONS 暴露出去，供下拉框等 UI 使用 */
export { ViewName, DOMAIN_VIEW_OPTIONS as VIEW_OPTIONS };
