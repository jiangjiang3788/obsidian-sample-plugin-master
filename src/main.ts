// src/main.ts
// 在 loadSettings() 里加入迁移脚本：把 status/category 迁到 categoryKey，并修正模块里的 filters/sort/group/fields/row/col

import { App, Plugin, Notice } from 'obsidian';
import { render } from 'preact'; // ✅ 用于卸载 Preact

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
  set dashboards(v: DashboardConfig[]) { this._settings.dashboards = v; }          // ✅ setter

  get inputSettings() { return this._settings.inputSettings; }
  set inputSettings(v: InputSettings)  { this._settings.inputSettings = v; }       // ✅ setter

  activeDashboards: { container: HTMLElement; configName: string }[] = [];

  // 统一持久化出口（设置页等调用）
  async persistAll() { await this.saveSettings(); }                                 // ✅ 新增

  // ===== 生命周期 ===== //

  async onload(): Promise<void> {
    console.log('ThinkPlugin load');

    // 0. 加载用户设置（含迁移）
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
    // ✅ 正确卸载 Preact，避免内存泄漏
    this.activeDashboards.forEach(({ container }) => {
      try { render(null, container); } catch {}
      container.empty();
    });
    this.activeDashboards = [];
  }

  // ===== 设置持久化 ===== //

  private async loadSettings() {
    const stored = (await this.loadData()) as Partial<ThinkSettings> | null;
    this._settings = Object.assign({}, DEFAULT_SETTINGS, stored);

    // ✅ 迁移：status/category -> categoryKey
    const changed = migrateSettingsToCategoryKey(this._settings);
    if (changed) {
      try {
        await this.saveData(this._settings);
        console.log('[ThinkPlugin] settings migrated to categoryKey');
      } catch (e) {
        console.warn('[ThinkPlugin] settings migration save failed', e);
      }
    }
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

/* ====================================================================== */
/*                         迁移脚本（一次性）                              */
/* ====================================================================== */

function migrateSettingsToCategoryKey(settings: ThinkSettings): boolean {
  let changed = false;

  const mapFieldName = (f?: string) => {
    if (!f) return f;
    if (f === 'status' || f === 'category') { changed = true; return 'categoryKey'; }
    return f;
  };

  const mapStatusValue = (v: any) => {
    if (typeof v !== 'string') return v;
    const s = v.trim().toLowerCase();
    if (s === 'open' || s === 'done' || s === 'cancelled') {
      changed = true;
      return `任务/${s}`;
    }
    return v;
  };

  const fixFilters = (filters?: any[]) => {
    if (!Array.isArray(filters)) return filters;
    return filters.map(f => {
      if (!f || typeof f !== 'object') return f;
      const nf = { ...f };
      if (nf.field === 'status') {
        nf.field = 'categoryKey';
        nf.value = mapStatusValue(nf.value);
        changed = true;
      } else if (nf.field === 'category') {
        nf.field = 'categoryKey';
        changed = true;
      }
      return nf;
    });
  };

  const fixSort = (sort?: any[]) => {
    if (!Array.isArray(sort)) return sort;
    return sort.map(s => {
      if (!s || typeof s !== 'object') return s;
      const ns = { ...s };
      ns.field = mapFieldName(ns.field);
      return ns;
    });
  };

  const fixArrayFields = (arr?: string[]) => {
    if (!Array.isArray(arr)) return arr;
    const mapped = arr.map(a => (a === 'status' || a === 'category') ? 'categoryKey' : a);
    if (mapped.some((v, i) => v !== arr[i])) changed = true;
    // 去重保持顺序
    const seen = new Set<string>();
    return mapped.filter(v => (seen.has(v) ? false : (seen.add(v), true)));
  };

  const fixModule = (m: any) => {
    if (!m || typeof m !== 'object') return m;
    const nm = { ...m };

    // filters / sort
    nm.filters = fixFilters(nm.filters);
    nm.sort    = fixSort(nm.sort);

    // group（字符串）与 groups（数组，UI 扩展用）
    if (typeof nm.group === 'string' && (nm.group === 'status' || nm.group === 'category')) {
      nm.group = 'categoryKey'; changed = true;
    }
    if (Array.isArray(nm.groups)) nm.groups = fixArrayFields(nm.groups);

    // row/col（TableView）
    if (nm.rowField === 'status' || nm.rowField === 'category') {
      nm.rowField = 'categoryKey'; changed = true;
    }
    if (nm.colField === 'status' || nm.colField === 'category') {
      nm.colField = 'categoryKey'; changed = true;
    }

    // fields（Excel/Table 可见列）
    if (Array.isArray(nm.fields)) nm.fields = fixArrayFields(nm.fields);

    return nm;
  };

  // 仪表盘模块批量处理
  (settings.dashboards || []).forEach(d => {
    if (!Array.isArray(d.modules)) return;
    d.modules = d.modules.map(fixModule);
  });

  return changed;
}