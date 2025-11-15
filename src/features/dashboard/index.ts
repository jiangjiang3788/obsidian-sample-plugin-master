// src/features/dashboard/index.ts
import type { Plugin } from 'obsidian'; // [新增] 导入 Plugin 类型
import type { AppStore } from '@core/stores/AppStore'; // [新增] 导入 AppStore 类型
import type { DataStore } from '@core/services/DataStore'; // [新增] 导入 DataStore 类型
import type { RendererService } from '@core/services/RendererService'; // [新增] 导入 RendererService 类型
import type { ActionService } from '@core/services/ActionService'; // [新增] 导入 ActionService 类型
import { VaultWatcher } from '@core/services/VaultWatcher';
import { CodeblockEmbedder } from './CodeblockEmbedder';

// [新增] 为 Dashboard 功能定义一个清晰的依赖项接口
export interface DashboardDependencies {
    plugin: Plugin;
    appStore: AppStore;
    dataStore: DataStore;
    rendererService: RendererService;
    actionService: ActionService;
}

/**
 * [修改] setup 函数现在接收一个包含明确依赖的对象，而不是一个笼统的上下文。
 */
export function setup(deps: DashboardDependencies) {  
    const { plugin, dataStore, appStore, rendererService, actionService } = deps;

    new VaultWatcher(plugin, dataStore);
    new CodeblockEmbedder(plugin, appStore, dataStore, rendererService, actionService);
}


// src/features/dashboard/ui/index.ts
import { 
    TableView, 
    BlockView, 
    ExcelView, 
    StatisticsView, 
    TimelineView, 
    HeatmapView 
} from '@features/views';
import type { ComponentType } from 'preact';

// [MOVED] ThemeFilter moved to theme module
export { ThemeFilter } from '@features/theme';

// [REFACTOR] Import the authoritative ViewName and VIEW_OPTIONS from the domain layer.
import type { ViewName } from '@core/types/domain/schema';
import { VIEW_OPTIONS as DOMAIN_VIEW_OPTIONS } from '@core/types/domain/schema';


/* ------------------------------------------------------------------ */
/* 视图注册表                                                         */
/* ------------------------------------------------------------------ */
// [REFACTOR] This registry must now implement all views defined in the domain's ViewName type.
// The `Record<ViewName, any>` provides type-safety.
export const VIEW_REGISTRY: Record<ViewName, ComponentType<any>> = {
  TableView,
  BlockView,
  TimelineView,
  ExcelView,
  StatisticsView,
  HeatmapView, // [NEW] Register HeatmapView
} as const;

/** Dashboard.tsx 动态调用用这个常量 */
export const ViewComponents = VIEW_REGISTRY;

/** 所有可选视图名称（下拉框等用），从 Domain 层导入 */
export { ViewName, DOMAIN_VIEW_OPTIONS as VIEW_OPTIONS };
