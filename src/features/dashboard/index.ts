// src/features/dashboard/index.ts
import type { ThinkContext } from '@platform/context';

import { VaultWatcher }     from '@core/VaultWatcher';
import { CodeblockEmbedder } from '@core/CodeblockEmbedder';

/** Dashboard Feature 的入口 —— 把所有与仪表盘相关的监听 / 代码块注册都放这里 */
export function setup(ctx: ThinkContext) {
  const { plugin, dataStore } = ctx;

  /* ① 监听 Vault 变化 —— 实时刷新仪表盘 */
  new VaultWatcher(plugin, dataStore);

  /* ② 注册 ```think``` 代码块 —— 在阅读视图渲染 Dashboard */
  new CodeblockEmbedder(plugin, dataStore);

  /* 如需 SettingsTab，可继续在这里 plugin.addSettingTab(...) */
}