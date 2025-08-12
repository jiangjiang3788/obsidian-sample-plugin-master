// src/main.ts
import { App, Plugin, Notice } from 'obsidian';
import { render } from 'preact';

import { ObsidianPlatform } from '@platform/obsidian';
import { DataStore }        from '@core/services/dataStore';
import { AppStore }         from '@state/AppStore'; // <-- 引入 AppStore

import * as DashboardFeature  from '@features/dashboard';
import * as QuickInputFeature from '@features/quick-input';
import * as CoreSettings      from '@core/settings/index';

import type { DashboardConfig } from '@core/domain/schema';
import type { InputSettings }   from '@core/utils/inputSettings';
import { GLOBAL_CSS, STYLE_TAG_ID } from '@core/domain/constants';

// ---------- 插件级类型 & 默认值 ---------- //

export interface ThinkSettings {
  dashboards:    DashboardConfig[];
  inputSettings: InputSettings;
}

const DEFAULT_SETTINGS: ThinkSettings = {
  dashboards:    [],
  inputSettings: { base: {}, themes: [] },
};

// ---------- Feature & Core Context ---------- //

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
  appStore!: AppStore;

  // getters/setters 现在从 AppStore 读写，但保留它们可以减少对旧代码的冲击
  get dashboards()    { return this.appStore.getSettings().dashboards; }
  get inputSettings() { return this.appStore.getSettings().inputSettings; }
  
  // 让 InputSettingsTable 等旧组件的 onSave 仍然可以工作
  set inputSettings(v: InputSettings)   { this.appStore.updateInputSettings(v); }

  activeDashboards: { container: HTMLElement; configName: string }[] = [];

  // 统一持久化出口（由 AppStore 调用）
  async persistAll(settings: ThinkSettings) {
    await this.saveData(settings);
  }

  // ===== 生命周期 ===== //

  async onload(): Promise<void> {
    console.log('ThinkPlugin load');

    // 0) 加载设置
    const settings = await this.loadSettings();
    
    // 1) 注入全局样式
    this.injectGlobalCss();

    // 2) 初始化 platform / core / store
    this.platform  = new ObsidianPlatform(this.app);
    this.dataStore = new DataStore(this.platform);
    this.appStore = AppStore.instance;
    this.appStore.init(this, settings); // <-- 初始化 AppStore
    await this.dataStore.initialScan();

    // 3) 注入 Feature & Core Context
    const ctx: ThinkContext = {
      app:       this.app,
      plugin:    this,
      platform:  this.platform,
      dataStore: this.dataStore,
    };

    DashboardFeature.setup?.(ctx);
    QuickInputFeature.setup?.(ctx);
    CoreSettings.setup?.(ctx); // ← 注册设置页 (从新的 core/settings 模块)
  }

  onunload(): void {
    console.log('ThinkPlugin unload');
    document.getElementById(STYLE_TAG_ID)?.remove();
    this.activeDashboards.forEach(({ container }) => {
      try { render(null, container); } catch {}
      container.empty();
    });
    this.activeDashboards = [];
  }

  // ===== 设置持久化 ===== //

  private async loadSettings(): Promise<ThinkSettings> {
    const stored = (await this.loadData()) as any as Partial<ThinkSettings> | null;
    let settings = Object.assign({}, DEFAULT_SETTINGS, stored);

    if (stored && '_migration' in stored) {
      try {
        const clone: any = { ...settings };
        delete (clone as any)._migration;
        settings = clone;
        await this.saveData(settings);
        console.log('[ThinkPlugin] cleaned legacy _migration flag');
      } catch (e) {
        console.warn('[ThinkPlugin] failed to clean legacy _migration flag', e);
      }
    }
    return settings;
  }

  // saveSettings is deprecated, use persistAll via AppStore actions
  async saveSettings() {
    await this.persistAll(this.appStore.getSettings());
  }

  // ===== 样式注入 ===== //
  private injectGlobalCss() {
    let el = document.getElementById(STYLE_TAG_ID) as HTMLStyleElement | null;
    if (!el) {
      el = document.createElement('style');
      el.id = STYLE_TAG_ID;
      document.head.appendChild(el);
    }
    el.textContent = GLOBAL_CSS;
  }

  // ===== 外部 API ===== //

  // Deprecated: use AppStore.instance.updateDashboard
  async upsertDashboard(cfg: DashboardConfig) {
    const list = this.appStore.getSettings().dashboards;
    const idx  = list.findIndex(d => d.name === cfg.name);
    if (idx >= 0) {
      await this.appStore.updateDashboard(idx, cfg);
    } else {
      await this.appStore.addDashboard(); // Simplified, might need adjustment
      // Find the new dashboard and update it.
      const newList = this.appStore.getSettings().dashboards;
      const newIdx = newList.findIndex(d => d.name === '新仪表盘'); // Relies on default name
      if(newIdx >= 0) await this.appStore.updateDashboard(newIdx, cfg);
    }
    new Notice(`已保存仪表盘「${cfg.name}」`);
  }

  openSettingsForDashboard(name?: string) {
    this.app.setting.open();
    this.app.setting.setTabById?.('think-settings');
    if (name) {
      localStorage.setItem('think-target-dash', name);
    }
  }
}