// src/features/dashboard/index.ts
import type { Plugin } from 'obsidian'; // [新增] 导入 Plugin 类型
import type { AppStore } from '@store/AppStore'; // [新增] 导入 AppStore 类型
import type { DataStore } from '@lib/services/core/dataStore'; // [新增] 导入 DataStore 类型
import type { RendererService } from '@lib/services/core/RendererService'; // [新增] 导入 RendererService 类型
import type { ActionService } from '@lib/services/core/ActionService'; // [新增] 导入 ActionService 类型
import { VaultWatcher } from '@lib/logic/VaultWatcher';
import { CodeblockEmbedder } from '@lib/logic/CodeblockEmbedder';

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