// src/main.ts
import { App, Plugin, Notice } from 'obsidian';
import { render } from 'preact';

import { ObsidianPlatform } from '@platform/obsidian';
import { DataStore }        from '@core/services/dataStore';

import * as DashboardFeature   from '@features/dashboard';
import * as QuickInputFeature  from '@features/quick-input';
import * as CoreSettings       from '@core/settings/index'; // <-- THE FIX IS HERE

import type { DashboardConfig } from '@core/domain/schema';
import type { InputSettings }   from '@core/utils/inputSettings';
import { GLOBAL_CSS, STYLE_TAG_ID } from '@core/domain/constants';

// ---------- 插件级类型 & 默认值 ---------- //

interface ThinkSettings {
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

  private _settings!: ThinkSettings;

  get dashboards()    { return this._settings.dashboards; }
  set dashboards(v: DashboardConfig[]) { this._settings.dashboards = v; }

  get inputSettings() { return this._settings.inputSettings; }
  set inputSettings(v: InputSettings)  { this._settings.inputSettings = v; }

  activeDashboards: { container: HTMLElement; configName: string }[] = [];

  // 统一持久化出口（设置页等调用）
  async persistAll() { await this.saveSettings(); }

  // ===== 生命周期 ===== //

  async onload(): Promise<void> {
    console.log('ThinkPlugin load');

    // 0) 加载设置（并做一次性清理：去掉历史上残留的 _migration 字段）
    await this.loadSettings();

    // 1) 注入全局样式（把链接改为黑色无下划线）
    this.injectGlobalCss();

    // 2) 初始化 platform / core
    this.platform  = new ObsidianPlatform(this.app);
    this.dataStore = new DataStore(this.platform);
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
    CoreSettings.setup?.(ctx);  // ← 注册设置页 (从新的 core/settings 模块)
  }

  onunload(): void {
    console.log('ThinkPlugin unload');

    // 移除注入的样式
    document.getElementById(STYLE_TAG_ID)?.remove();

    // 正确卸载 Preact，避免内存泄漏
    this.activeDashboards.forEach(({ container }) => {
      try { render(null, container); } catch {}
      container.empty();
    });
    this.activeDashboards = [];
  }

  // ===== 设置持久化 ===== //

  private async loadSettings() {
    const stored = (await this.loadData()) as any as Partial<ThinkSettings> | null;

    // 合并默认
    this._settings = Object.assign({}, DEFAULT_SETTINGS, stored);

    // 一次性清理：如果旧版本曾经写入过 _migration 字段，这里直接删除并保存一次
    if (stored && '_migration' in stored) {
      try {
        const clone: any = { ...this._settings };
        delete (clone as any)._migration;
        this._settings = clone;
        await this.saveData(this._settings);
        console.log('[ThinkPlugin] cleaned legacy _migration flag');
      } catch (e) {
        console.warn('[ThinkPlugin] failed to clean legacy _migration flag', e);
      }
    }
  }

  async saveSettings() {
    await this.saveData(this._settings);
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
    // 确保设置页tab的ID与 SettingsTab.ts 中定义的 `id` 字段一致
    this.app.setting.setTabById?.('think-settings');

    if (name) {
      // 给 SettingsTab 留下滚动定位依据
      localStorage.setItem('think-target-dash', name);
    }
  }
}