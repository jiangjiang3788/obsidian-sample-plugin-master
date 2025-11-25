/**
 * @file 功能汇总入口（Theme + Settings + Dashboard）
 */

/* ========================================================================== */
/* 1. Theme 相关导出                                                          */
/* ========================================================================== */

export { ThemeManager } from './ThemeManager';
export { ThemeStore } from './ThemeStore';
export { ThemeMatrix } from './ThemeMatrix';

export * from './theme-types';
export * from './props.types';

/* ========================================================================== */
/* 2. Settings 模块（设置面板 + 视图编辑器）                                   */
/* ========================================================================== */

import { App } from 'obsidian';
import type ThinkPlugin from '@main';
import { SettingsTab } from './SettingsTab';
import { AppStore as SettingsAppStore } from '@/app/AppStore';
import { DataStore } from '@/core/services/DataStore';

import { BlockViewEditor } from './BlockViewEditor';
import { ExcelViewEditor } from './ExcelViewEditor';
import { HeatmapViewEditor } from './HeatmapViewEditor';
import { StatisticsViewEditor } from './StatisticsViewEditor';
import { TableViewEditor } from './TableViewEditor';
import { TimelineViewEditor } from './TimelineViewEditor';

// 设置页里的多个子设置组件
export { LayoutSettings } from './LayoutSettings';
export { InputSettings } from './InputSettings';
export { GeneralSettings } from './GeneralSettings';

/**
 * Settings 模块内部用到的“视图编辑器组件”映射
 * 原来的 ViewComponents，这里改名为 SettingsViewComponents
 * 避免和 Dashboard 的 ViewComponents 冲突
 */
export const SettingsViewComponents = {
  Block: BlockViewEditor,
  Excel: ExcelViewEditor,
  Heatmap: HeatmapViewEditor,
  Statistics: StatisticsViewEditor,
  Table: TableViewEditor,
  Timeline: TimelineViewEditor,
};

/** Settings 模块依赖项接口（原 SettingsDependencies） */
export interface SettingsDependencies {
  app: App;
  plugin: ThinkPlugin;
  appStore: SettingsAppStore;
  dataStore: DataStore;
}

/**
 * Settings 初始化函数
 * 原：export function setup(deps: SettingsDependencies)
 * 这里重命名为 setupSettings，避免和 Dashboard 的 setup 冲突
 */
export function setupSettings(deps: SettingsDependencies): void {
  // SettingsTab 构造函数不变，它可以通过 plugin 实例访问到 appStore
  deps.plugin.addSettingTab(new SettingsTab(deps.app, deps.plugin, deps.dataStore));
}

/* ========================================================================== */
/* 3. Dashboard 核心逻辑（数据监听 + 代码块嵌入）                             */
/* ========================================================================== */

import type { Plugin } from 'obsidian';
import type { AppStore as DashboardAppStore } from '@/app/AppStore';
import type { RendererService } from './RendererService';
import type { ActionService } from '@core/services/ActionService';

import { VaultWatcher } from '@core/services/VaultWatcher';
import { CodeblockEmbedder } from './CodeblockEmbedder';

/** Dashboard 功能依赖项接口（原 DashboardDependencies） */
export interface DashboardDependencies {
  plugin: Plugin;
  appStore: DashboardAppStore;
  dataStore: DataStore;
  rendererService: RendererService;
  actionService: ActionService;
}

/**
 * Dashboard 初始化函数
 * 原：export function setup(deps: DashboardDependencies)
 * 这里重命名为 setupDashboard
 */
export function setupDashboard(deps: DashboardDependencies): void {
  const { plugin, dataStore, appStore, rendererService, actionService } = deps;

  // 监听 Vault 变化
  new VaultWatcher(plugin, dataStore);

  // 注册代码块仪表盘嵌入
  new CodeblockEmbedder(plugin, appStore, dataStore, rendererService, actionService);
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
  HeatmapView,
} from '@features/views';
import type { ComponentType } from 'preact';

/** 从 Domain 层导入 ViewName 和 VIEW_OPTIONS */
import type { ViewName } from '@/core/types/schema';
import { VIEW_OPTIONS as DOMAIN_VIEW_OPTIONS } from '@/core/types/schema';

/**
 * 视图注册表：域层的 ViewName -> 具体视图组件
 */
export const VIEW_REGISTRY: Record<ViewName, ComponentType<any>> = {
  TableView,
  BlockView,
  TimelineView,
  ExcelView,
  StatisticsView,
  HeatmapView,
} as const;

/**
 * 仪表盘中真正使用的视图映射
 * 原来的 dashboard/ui 里的 ViewComponents，这里改名为 DashboardViewComponents
 */
export const DashboardViewComponents = VIEW_REGISTRY;

/** 再把 ViewName 和 VIEW_OPTIONS 暴露出去，供下拉框等 UI 使用 */
export { ViewName, DOMAIN_VIEW_OPTIONS as VIEW_OPTIONS };
