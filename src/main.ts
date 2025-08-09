// src/main.ts
import { App, Plugin, Notice } from 'obsidian';
import { render } from 'preact';

import { ObsidianPlatform } from '@platform/obsidian';
import { DataStore }        from '@core/services/dataStore';

import * as DashboardFeature   from '@features/dashboard';
import * as QuickInputFeature  from '@features/quick-input';
import * as SettingsFeature    from '@features/settings';

import type { DashboardConfig } from '@core/domain/schema';
import type { InputSettings }   from '@core/utils/inputSettings';
import { GLOBAL_CSS, STYLE_TAG_ID } from '@core/domain/constants';

// ---------- 插件级类型 & 默认值 ---------- //

interface ThinkSettings {
  dashboards:    DashboardConfig[];
  inputSettings: InputSettings;

  /** 迁移元数据（用于可回滚） */
  _migration?: {
    categoryKey?: {
      applied: boolean;             // 是否已应用过迁移
      backup?: DashboardConfig[];   // 迁移前的 dashboards 备份
    }
  }
}

const DEFAULT_SETTINGS: ThinkSettings = {
  dashboards:    [],
  inputSettings: { base: {}, themes: [] },
  _migration: {},
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
  set dashboards(v: DashboardConfig[]) { this._settings.dashboards = v; }

  get inputSettings() { return this._settings.inputSettings; }
  set inputSettings(v: InputSettings)  { this._settings.inputSettings = v; }

  activeDashboards: { container: HTMLElement; configName: string }[] = [];

  // 统一持久化出口（设置页等调用）
  async persistAll() { await this.saveSettings(); }

  // ===== 生命周期 ===== //

  async onload(): Promise<void> {
    console.log('ThinkPlugin load');

    // 0. 加载用户设置（含迁移）
    await this.loadSettings();

    // 1. 注入全局样式（保证链接是黑色无下划线）
    this.injectGlobalCss();

    // 2. 初始化 platform / core
    this.platform  = new ObsidianPlatform(this.app);
    this.dataStore = new DataStore(this.platform);
    await this.dataStore.initialScan();

    // 3. 注入 Feature Context
    const ctx: ThinkContext = {
      app:       this.app,
      plugin:    this,
      platform:  this.platform,
      dataStore: this.dataStore,
    };

    DashboardFeature.setup?.(ctx);
    QuickInputFeature.setup?.(ctx);
    SettingsFeature.setup?.(ctx);  // ← 注册设置页

    // （可选）提供一个回滚命令，想恢复迁移前的配置可用
    this.addCommand({
      id: 'think-revert-categorykey-migration',
      name: '开发者：回滚「categoryKey」迁移（还原 dashboards）',
      callback: async () => {
        const ok = await this.revertCategoryKeyMigration();
        new Notice(ok ? '已回滚到迁移前配置' : '没有可回滚的备份或已回滚过');
      },
    });
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
    const stored = (await this.loadData()) as Partial<ThinkSettings> | null;
    this._settings = Object.assign({}, DEFAULT_SETTINGS, stored);

    // ✅ 迁移：status/category -> categoryKey（一次性），并带备份以便回滚
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
    this.app.setting.setTabById?.('think-settings');

    if (name) {
      // 给 SettingsTab 留下滚动定位依据
      localStorage.setItem('think-target-dash', name);
    }
  }

  /** 回滚到迁移前（如果有备份） */
  private async revertCategoryKeyMigration(): Promise<boolean> {
    const flag = this._settings._migration?.categoryKey;
    if (!flag?.applied || !flag.backup) return false;

    // 还原
    this._settings.dashboards = JSON.parse(JSON.stringify(flag.backup));
    this._settings._migration = {
      ...this._settings._migration,
      categoryKey: { applied: false, backup: undefined },
    };
    await this.saveSettings();
    return true;
  }
}

/* ====================================================================== */
/*                         迁移脚本（一次性）                              */
/*  作用：把 status / category 的字段/值 统一迁到 categoryKey
/*  覆盖范围：filters / sort / group(s) / rowField / colField / fields
/*  兼容：idempotent（多次运行无副作用）；并在首次迁移前做 dashboards 备份，可回滚 */
/* ====================================================================== */

function migrateSettingsToCategoryKey(settings: ThinkSettings): boolean {
  const mig = settings._migration ||= {};
  const ck  = mig.categoryKey ||= { applied: false as boolean, backup: undefined as DashboardConfig[]|undefined };

  if (ck.applied) return false; // 已经迁移过，直接跳过

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

    // group（字符串）与 groups（数组）
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

  // 迁移前备份 dashboards，便于回滚
  ck.backup = JSON.parse(JSON.stringify(settings.dashboards || []));

  // 仪表盘模块批量处理
  (settings.dashboards || []).forEach(d => {
    if (!Array.isArray(d.modules)) return;
    d.modules = d.modules.map(fixModule);
  });

  // 打标记
  ck.applied = true;
  settings._migration.categoryKey = ck;

  return changed;
}