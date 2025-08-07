// src/main.ts
import { App, Plugin, TFile, Notice } from 'obsidian';

import { ObsidianPlatform } from '@platform/obsidian';
import { DataStore } from '@core/services/dataStore';

import * as DashboardFeature   from '@features/dashboard';
import * as QuickInputFeature  from '@features/quick-input';

import type { DashboardConfig }  from '@core/domain/schema';
import type { InputSettings }    from '@core/utils/inputSettings';

// ---------- 插件级类型 & 默认值 ---------- //

interface ThinkSettings {
  dashboards:     DashboardConfig[];
  inputSettings:   InputSettings;
}

const DEFAULT_SETTINGS: ThinkSettings = {
  dashboards:     [],                // 先给空数组，至少不再 undefined
  inputSettings:  { base: {}, themes: [] },
};

// 供各 Feature 使用的上下文对象
export interface ThinkContext {
  app:       App;
  plugin:    ThinkPlugin;
  platform:  ObsidianPlatform;
  dataStore: DataStore;
}

// ---------- 主插件类 ---------- //

export default class ThinkPlugin extends Plugin {
  // public 成员可给其它模块直接拿
  platform!:  ObsidianPlatform;
  dataStore!: DataStore;

  /** 统一包裹的用户设置 */
  private _settings!: ThinkSettings;

  /* —— 快捷 getter（避免到处写 this._settings.xxx） —— */
  get dashboards()    { return this._settings.dashboards; }
  get inputSettings() { return this._settings.inputSettings; }

  /** 已挂载的 Dashboard 容器，用于卸载时清理 */
  activeDashboards: { container: HTMLElement; configName: string }[] = [];

  // ===== 生命钩子 ===== //

  async onload(): Promise<void> {
    console.log('ThinkPlugin load');

    /* 0. 读配置 ---------------------------------------------------- */
    await this.loadSettings();

    /* 1. 初始化 Platform & Core ----------------------------------- */
    this.platform  = new ObsidianPlatform(this.app);
    this.dataStore = new DataStore(this.platform);
    await this.dataStore.initialScan();

    /* 2. 注册各 Feature ------------------------------------------- */
    const ctx: ThinkContext = {
      app:       this.app,
      plugin:    this,
      platform:  this.platform,
      dataStore: this.dataStore,
    };

    // —— Dashboard & Quick-Input 都导出了 setup(ctx) —— //
    DashboardFeature.setup?.(ctx);
    QuickInputFeature.setup?.(ctx);

    /* 3. 其它：可在这里加设置页等 ------------------------------- */
    // this.addSettingTab(new SettingsTab(this));
  }

  onunload(): void {
    console.log('ThinkPlugin unload');
    // 卸载所有动态挂载的 Dashboard 视图
    this.activeDashboards.forEach(({ container }) => container.empty());
  }

  // ===== 设置读写 ===== //

  /** 把空洞位用默认值补齐，再挂到 this._settings */
  private async loadSettings() {
    const stored = (await this.loadData()) as Partial<ThinkSettings> | null;
    this._settings = Object.assign({}, DEFAULT_SETTINGS, stored);
  }

  async saveSettings() {
    await this.saveData(this._settings);
  }

  // ===== 提供给其它模块的快捷 API（可按需增加） ===== //

  /**
   * 更新仪表盘配置并持久化
   */
  async upsertDashboard(cfg: DashboardConfig) {
    const list = this._settings.dashboards;
    const idx  = list.findIndex(d => d.name === cfg.name);
    idx >= 0 ? (list[idx] = cfg) : list.push(cfg);
    await this.saveSettings();
    new Notice(`已保存仪表盘「${cfg.name}」`);
  }

  /**
   * 打开设置页并定位到 Dashboard 区域（留空：直接打开顶部）
   */
  openSettingsForDashboard(name?: string) {
    this.openSettingTab();
    // 可在 SettingsTab 内部根据 name 做滚动定位
  }
}