// src/main.ts
import { App, Plugin, Notice } from 'obsidian';
import { render, h } from 'preact';

import { ObsidianPlatform } from '@platform/obsidian';
import { DataStore } from '@core/services/dataStore';
import { AppStore } from '@state/AppStore';

import * as DashboardFeature from '@features/dashboard';
import * as QuickInputFeature from '@features/quick-input';
import * as CoreSettings from '@core/settings/index';

import type { DashboardConfig } from '@core/domain/schema';
import type { InputSettings } from '@core/utils/inputSettings';
import { GLOBAL_CSS, STYLE_TAG_ID, LOCAL_STORAGE_KEYS } from '@core/domain/constants';
import { Dashboard } from '@features/dashboard/ui/Dashboard';

// ---------- 插件级类型 & 默认值 ---------- //

export interface ThinkSettings {
  dashboards: DashboardConfig[];
  inputSettings: InputSettings;
}

const DEFAULT_SETTINGS: ThinkSettings = {
  dashboards: [],
  inputSettings: { base: {}, themes: [] },
};

// ---------- Feature & Core Context ---------- //

export interface ThinkContext {
  app: App;
  plugin: ThinkPlugin;
  platform: ObsidianPlatform;
  dataStore: DataStore;
}

// ---------- 主插件类 ---------- //

export default class ThinkPlugin extends Plugin {
  platform!: ObsidianPlatform;
  dataStore!: DataStore;
  appStore!: AppStore;

  get dashboards() { return this.appStore.getSettings().dashboards; }
  get inputSettings() { return this.appStore.getSettings().inputSettings; }
  set inputSettings(v: InputSettings) { this.appStore.updateInputSettings(v); }

  activeDashboards: { container: HTMLElement; configName: string }[] = [];

  async persistAll(settings: ThinkSettings) {
    await this.saveData(settings);
    this.rerenderActiveDashboards(settings);
  }
 
  private rerenderActiveDashboards(settings: ThinkSettings) {
    // ... rerenderActiveDashboards 内部逻辑保持不变 ...
    console.log('[ThinkPlugin] Rerendering active dashboards...');
    this.activeDashboards.forEach(activeDash => {
        const { container, configName } = activeDash;
        const newConfig = settings.dashboards.find(d => d.name === configName);
        if (newConfig) {
            render(h(Dashboard, {
                config: newConfig,
                dataStore: this.dataStore,
                plugin: this,
            }), container);
        } else {
            try { render(null, container); } catch {}
            container.empty();
            container.createDiv({ text: `仪表盘配置 "${configName}" 已被删除。` });
        }
    });
    this.activeDashboards = this.activeDashboards.filter(ad =>
        settings.dashboards.some(d => d.name === ad.configName)
    );
  }

  async onload(): Promise<void> {
    console.log('ThinkPlugin load');

    const settings = await this.loadSettings();
   
    this.injectGlobalCss();

    this.platform = new ObsidianPlatform(this.app);
    this.dataStore = new DataStore(this.platform);
    this.appStore = AppStore.instance;
    this.appStore.init(this, settings);
    await this.dataStore.initialScan();

    const ctx: ThinkContext = {
      app: this.app,
      plugin: this,
      platform: this.platform,
      dataStore: this.dataStore,
    };

    DashboardFeature.setup?.(ctx);
    QuickInputFeature.setup?.(ctx);
    CoreSettings.setup?.(ctx);

    // [MODIFIED] 添加命令用于打开插件设置
    this.addCommand({
        id: 'think-open-settings',
        name: '打开 Think 插件设置',
        callback: () => {
            // @ts-ignore
            this.app.setting.open();
            // @ts-ignore
            this.app.setting.openTabById(this.manifest.id);
        }
    });
  }

  onunload(): void {
    // ... onunload 内部逻辑保持不变 ...
    console.log('ThinkPlugin unload');
    document.getElementById(STYLE_TAG_ID)?.remove();
    this.activeDashboards.forEach(({ container }) => {
      try { render(null, container); } catch {}
      container.empty();
    });
    this.activeDashboards = [];
  }

  private async loadSettings(): Promise<ThinkSettings> {
    const stored = (await this.loadData()) as any as Partial<ThinkSettings> | null;
    return Object.assign({}, DEFAULT_SETTINGS, stored);
  }

  async saveSettings() {
    await this.persistAll(this.appStore.getSettings());
  }

  private injectGlobalCss() {
    let el = document.getElementById(STYLE_TAG_ID) as HTMLStyleElement | null;
    if (!el) {
      el = document.createElement('style');
      el.id = STYLE_TAG_ID;
      document.head.appendChild(el);
    }
    el.textContent = GLOBAL_CSS;
  }

  // [REMOVED] openSettingsForDashboard 方法不再需要，其功能已移至命令
}