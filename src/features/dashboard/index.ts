// src/features/dashboard/index.ts
import type { ThinkContext } from '../../main';
import { VaultWatcher } from '@core/VaultWatcher';
import { CodeblockEmbedder } from '@core/CodeblockEmbedder';

/** 负责渲染和交互功能的入口 */
export function setup(ctx: ThinkContext) { // ctx 参数现在接收的是 ThinkPlugin 的实例
    const { plugin, dataStore, appStore, rendererService } = ctx;

    new VaultWatcher(plugin, dataStore);
    new CodeblockEmbedder(plugin, appStore, dataStore, rendererService);
}