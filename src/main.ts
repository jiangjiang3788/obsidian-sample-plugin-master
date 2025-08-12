// src/main.ts
import { App, Plugin, Notice } from 'obsidian';
import { render, h } from 'preact';

import { ObsidianPlatform } from '@platform/obsidian';
import { DataStore }        from '@core/services/dataStore';
import { AppStore }         from '@state/AppStore';

import * as DashboardFeature  from '@features/dashboard';
import * as QuickInputFeature from '@features/quick-input';
import * as CoreSettings      from '@core/settings/index';

import type { DashboardConfig } from '@core/domain/schema';
import type { InputSettings }   from '@core/utils/inputSettings';
import { GLOBAL_CSS, STYLE_TAG_ID } from '@core/domain/constants';
import { Dashboard } from '@features/dashboard/ui/Dashboard'; // 导入 Dashboard 组件用于重新渲染

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

  // 存储当前所有打开的仪表盘及其容器元素
  activeDashboards: { container: HTMLElement; configName: string }[] = [];

  // 统一持久化出口（由 AppStore 调用）
  async persistAll(settings: ThinkSettings) {
    await this.saveData(settings);
    // [FIX] 保存设置后，立即重新渲染所有活动的仪表盘
    this.rerenderActiveDashboards(settings);
  }
  
  // ===== 新增方法：重新渲染活动的仪表盘 ===== //
  private rerenderActiveDashboards(settings: ThinkSettings) {
    console.log('[ThinkPlugin] Rerendering active dashboards...');
    this.activeDashboards.forEach(activeDash => {
        const { container, configName } = activeDash;
        // 从最新的设置中查找此仪表盘的配置
        const newConfig = settings.dashboards.find(d => d.name === configName);

        if (newConfig) {
            // 如果找到了新配置，则用新配置重新渲染
            render(h(Dashboard, {
                config: newConfig,
                dataStore: this.dataStore,
                plugin: this,
            }), container);
        } else {
            // 如果没找到（例如，仪表盘被删除了），则清空容器
            try { render(null, container); } catch {}
            container.empty();
            container.createDiv({ text: `仪表盘配置 "${configName}" 已被删除。` });
        }
    });

    // 清理掉那些已经被删除的仪表盘引用
    this.activeDashboards = this.activeDashboards.filter(ad => 
        settings.dashboards.some(d => d.name === ad.configName)
    );
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
    // 卸载时清理所有渲染的 Preact 组件
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
    // ... migration code ...
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

  openSettingsForDashboard(name?: string) {
    this.app.setting.open();
    this.app.setting.setTabById?.('think-settings');
    if (name) {
      localStorage.setItem('think-target-dash', name);
    }
  }
}