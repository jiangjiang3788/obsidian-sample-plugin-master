// src/main.ts
//-----------------------------------------------------------
// Obsidian 插件入口
// * 负责初始化平台 / DataStore
// * 只做“组合”——具体功能交给各 Feature 的 setup(ctx)
//-----------------------------------------------------------

import { Plugin } from 'obsidian';
import { ObsidianPlatform } from '@platform/obsidian';
import { DataStore } from '@core/services/dataStore';

import * as DashboardFeature from '@features/dashboard';   // 第 6 步会用
import * as QuickInputFeature from '@features/quick-input';

export interface ThinkContext {
  app:         App;
  plugin:      ThinkPlugin;
  platform:    ObsidianPlatform;
  dataStore:   DataStore;
}

export default class ThinkPlugin extends Plugin {
  /* ---------- 平台适配 & Core ---------- */
  platform!:  ObsidianPlatform;
  dataStore!: DataStore;

  /* ---------- 生命周期 ---------- */
  async onload() {
    console.log('ThinkPlugin 加载 (refactor)');

    /* 1. 初始化 Platform & DataStore */
    this.platform  = new ObsidianPlatform(this.app);
    this.dataStore = new DataStore(this.platform);

    /* 2. 首次扫描 Vault */
    await this.dataStore.scanAll();

    /* 3. 组装上下文，供 Features 使用 */
    const ctx: ThinkContext = {
      app: this.app,
      plugin: this,
      platform: this.platform,
      dataStore: this.dataStore,
    };

    /* 4. 挂载各 Feature —— 按需启用即可 */
    QuickInputFeature.setup(ctx);
    DashboardFeature.setup(ctx);

    /* 5. 引入全局样式（Shared） */
    import('@shared/styles/styles.css');
  }

  onunload() {
    console.log('ThinkPlugin 卸载');
  }
}
