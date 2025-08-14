// src/features/dashboard/index.ts

import type { ThinkContext } from '../../main';



import { VaultWatcher }      from '@core/VaultWatcher';

import { CodeblockEmbedder } from '@core/CodeblockEmbedder';



/** 负责渲染和交互功能的入口 —— 把所有与UI渲染相关的监听/代码块注册都放这里 */

export function setup(ctx: ThinkContext) {

  const { plugin, dataStore } = ctx;



  /* ① 监听 Vault 变化 —— 实时更新数据 */

  new VaultWatcher(plugin, dataStore);



  /* ② 注册 ```think``` 代码块 —— 在阅读视图渲染布局 */

  new CodeblockEmbedder(plugin, dataStore);



  /* 如有其它功能，可继续在这里添加 */

}