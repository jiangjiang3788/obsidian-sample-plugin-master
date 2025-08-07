import { App, Plugin, Notice } from 'obsidian';

import { ObsidianPlatform } from '@platform/obsidian';
import { DataStore }        from '@core/services/dataStore';

import * as DashboardFeature   from '@features/dashboard';
import * as QuickInputFeature  from '@features/quick-input';
import * as SettingsFeature    from '@features/settings';

import type { DashboardConfig } from '@core/domain/schema';
import type { InputSettings }   from '@core/utils/inputSettings';

// ---------- 插件级类型 & 默认值 ---------- //

interface ThinkSettings {
  dashboards:    DashboardConfig[];
  inputSettings: InputSettings;
}

const DEFAULT_SETTINGS: ThinkSettings = {
  dashboards:    [],
  inputSettings: { base: {}, themes: [] },
};

// ---------- Feature Context ---------- //

export interface ThinkContext {
  app:       App;
  plugin:    ThinkPlugin;
  platform:  ObsidianPlatform;
  dataStore: DataStore;
}

// ---------- 主插件类 ---------- //

export default class ThinkPlugin extends Plugin {
  platform!:  ObsidianPlatform;
  dataStore!: DataStore;

  private _settings!: ThinkSettings;

  get dashboards()    { return this._settings.dashboards; }
  get inputSettings() { return this._settings.inputSettings; }

  activeDashboards: { container: HTMLElement; configName: string }[] = [];

  // ===== 生命周期 ===== //

  async onload(): Promise<void> {
    console.log('ThinkPlugin load');

    // 0. 加载用户设置
    await this.loadSettings();

    // 1. 初始化 platform / core
    this.platform  = new ObsidianPlatform(this.app);
    this.dataStore = new DataStore(this.platform);
    await this.dataStore.initialScan();

    // 2. 注入 Feature Context
    const ctx: ThinkContext = {
      app:       this.app,
      plugin:    this,
      platform:  this.platform,
      dataStore: this.dataStore,
    };

    DashboardFeature.setup?.(ctx);
    QuickInputFeature.setup?.(ctx);
    SettingsFeature.setup?.(ctx);  // ← 注册设置页
  }

  onunload(): void {
    console.log('ThinkPlugin unload');
    this.activeDashboards.forEach(({ container }) => container.empty());
  }

  // ===== 设置持久化 ===== //

  private async loadSettings() {
    const stored = (await this.loadData()) as Partial<ThinkSettings> | null;
    this._settings = Object.assign({}, DEFAULT_SETTINGS, stored);
  }

  async saveSettings() {
    await this.saveData(this._settings);
  }

  // ===== 外部 API ===== //

  /** 新增 / 更新仪表盘配置并保存 */
  async upsertDashboard(cfg: DashboardConfig) {
    const list = this._settings.dashboards;
    const idx  = list.findIndex(d => d.name === cfg.name);
    idx >= 0 ? (list[idx] = cfg) : list.push(cfg);
    await this.saveSettings();
    new Notice(`已保存仪表盘「${cfg.name}」`);
  }

  /** 打开设置页并（可选）跳转定位 */
  openSettingsForDashboard(name?: string) {
    this.app.setting.open();
    this.app.setting.setTabById?.('think-settings');

    if (name) {
      // 给 SettingsTab 留下滚动定位依据
      localStorage.setItem('think-target-dash', name);
    }
  }
}
