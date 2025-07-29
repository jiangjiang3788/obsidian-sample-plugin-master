// src/main.ts
import { Plugin } from 'obsidian';
import { DataStore } from './data/store';
import { DashboardConfig } from './config/schema';
import { SettingsTab } from './ui/SettingsTab';
import { STYLE_TAG_ID, GLOBAL_CSS } from './config/constants';
import { VaultWatcher } from './core/VaultWatcher';
import { CodeblockEmbedder } from './core/CodeblockEmbedder';

export interface PersistData {
  dashboards: DashboardConfig[];
  inputSettings?: Record<string, any>;
}

export default class ThinkPlugin extends Plugin {
  dataStore!: DataStore;
  dashboards: DashboardConfig[] = [];
  activeDashboards: Array<{ container: HTMLElement; configName: string }> = [];
  inputSettings: Record<string, any> = {};

  /* ---------- 生命周期 ---------- */
  async onload() {
    console.log('ThinkPlugin 加载 - 重构版');

    /* — 读取持久化 — */
    const saved = (await this.loadData()) as PersistData | undefined;
    if (saved?.dashboards) this.dashboards = saved.dashboards;
    if (!this.dashboards.length) this._createDefaultDashboard();
    this.inputSettings = saved?.inputSettings ?? {};

    /* — 向后兼容旧视图名 — */
    this.dashboards.forEach(d =>
      d.modules.forEach(m => { if ((m.view as any) === 'ListView') m.view = 'BlockView'; }),
    );

    /* — 初始化数据层 & 监听 / 渲染 — */
    this.dataStore = new DataStore(this.app);
    await this.dataStore.scanAll();
    new VaultWatcher(this, this.dataStore);
    new CodeblockEmbedder(this, this.dataStore);

    this._injectStyles();
    this.addSettingTab(new SettingsTab(this.app, this));
  }

  onunload() {
    document.getElementById(STYLE_TAG_ID)?.remove();
    console.log('ThinkPlugin 卸载');
  }

  /* ---------- 公共 API ---------- */
  async persistAll() {
    await this.saveData({
      dashboards: this.dashboards,
      inputSettings: this.inputSettings,
    });
  }

  /* ---------- 内部工具 ---------- */
  private _createDefaultDashboard() {
    const now   = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    const def: DashboardConfig = {
      name: '默认仪表盘',
      path: '',
      tags: [],
      initialView: '月',
      initialDate: today,
      modules: [
        {
          view: 'BlockView',
          title: '未完成任务',
          filters: [{ field:'type',op:'=',value:'task' },{ field:'status',op:'=',value:'open' }],
          sort: [],
          collapsed: false,
          props: {},
        },
        {
          view: 'BlockView',
          title: '已完成任务',
          filters: [{ field:'type',op:'=',value:'task' },{ field:'status',op:'=',value:'done' }],
          sort : [{ field:'date',dir:'desc' }],
          collapsed: true,
          props: {},
        },
      ],
    };
    this.dashboards.push(def);
  }

  private _injectStyles() {
    if (document.getElementById(STYLE_TAG_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_TAG_ID;
    style.textContent = GLOBAL_CSS;
    document.head.appendChild(style);
  }
}