// src/features/dashboard/index.ts
import type { ThinkContext } from '../../main';
import { VaultWatcher } from '@core/VaultWatcher';
import { CodeblockEmbedder } from '@core/CodeblockEmbedder';

/** 负责渲染和交互功能的入口 */
export function setup(ctx: ThinkContext) {
    const { plugin, dataStore, appStore, rendererService } = ctx;

    /* ① 监听 Vault 变化 —— 实时更新数据 */
    new VaultWatcher(plugin, dataStore);

    /* ② 注册 ```think``` 代码块 —— 在阅读视图渲染布局 */
    // [修改] 实例化 CodeblockEmbedder 时传入新的依赖
    new CodeblockEmbedder(plugin, appStore, dataStore, rendererService);
}