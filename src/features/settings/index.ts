/**
 * @file Settings feature entry (Theme metadata + Settings UI)
 * 
 * 架构：使用 zustand store + useCases 进行状态管理
 */

/* ========================================================================== */
/* 1. Theme 相关导出                                                          */
/* ========================================================================== */

// ThemeMatrix runtime UI removed in single-user convergence; theme remains metadata only.


/* ========================================================================== */
/* 2. Settings 模块（设置面板 + 视图编辑器）                                   */
/* ========================================================================== */

import type { PluginHost } from '@core/ports/public';
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
  plugin: PluginHost;
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
/* 3. View configuration exports                                              */
/* ========================================================================== */

export { VIEW_OPTIONS } from '@core/types/public';
export type { ViewName } from '@core/types/public';
