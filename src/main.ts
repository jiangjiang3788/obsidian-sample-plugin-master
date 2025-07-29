// src/main.ts
//-----------------------------------------------------------
// Think Plugin 入口（完整实现，包含 openSettingsForDashboard）
//-----------------------------------------------------------

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
  /* ---------- 属性 ---------- */
  dataStore!: DataStore;                                          // 全局数据层
  dashboards: DashboardConfig[] = [];                             // 所有仪表盘
  activeDashboards: Array<{ container: HTMLElement; configName: string }> = [];
  inputSettings: Record<string, any> = {};                        // 通用持久化
  currentSettingsTarget: string | null = null;                    // 打开设置时聚焦的仪表盘名

  /* ---------- 生命周期 ---------- */
  async onload() {
    console.log('ThinkPlugin 加载 - 重构版');

    /* 读取持久化 */
    const saved = (await this.loadData()) as PersistData | undefined;
    if (saved?.dashboards) this.dashboards = saved.dashboards;
    if (!this.dashboards.length) this._createDefaultDashboard();
    this.inputSettings = saved?.inputSettings ?? {};

    /* 向后兼容旧视图名 */
    this.dashboards.forEach(d =>
      d.modules.forEach(m => {
        if ((m.view as any) === 'ListView') m.view = 'BlockView';
      }),
    );

    /* 数据层 & 监听 */
    this.dataStore = new DataStore(this.app);
    await this.dataStore.scanAll();
    new VaultWatcher(this, this.dataStore);
    new CodeblockEmbedder(this, this.dataStore);

    /* 样式注入 + 设置页 */
    this._injectStyles();
    this.addSettingTab(new SettingsTab(this.app, this));

    // ▼ 若存在待展开目标，在 SettingsTab.display 中处理
    this.register(() => localStorage.removeItem('think-target-dash'));
  }

  onunload() {
    document.getElementById(STYLE_TAG_ID)?.remove();
    console.log('ThinkPlugin 卸载');
  }

  /* ---------- 公共 API ---------- */

  /**
   * 从 Dashboard 视图调用：立即打开插件设置并自动展开对应仪表盘
   */
  openSettingsForDashboard(name: string) {
    // ① 先记到 localStorage，防止同一 session 多实例
    localStorage.setItem('think-target-dash', name);

    // ② 打开设置面板，再切换到本插件
    this.app.setting.open();                    // Obsidian >=1.4
    this.app.setting.openTabById(this.manifest.id);
  }

  /**
   * 保存全部仪表盘与用户输入配置
   */
  async persistAll() {
    await this.saveData({
      dashboards: this.dashboards,
      inputSettings: this.inputSettings,
    });
  }

  /* ---------- 内部工具 ---------- */

  /** 默认示例仪表盘（首次安装时注入） */
  private _createDefaultDashboard() {
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(
      2,
      '0',
    )}-${String(now.getDate()).padStart(2, '0')}`;

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
          filters: [
            { field: 'type', op: '=', value: 'task' },
            { field: 'status', op: '=', value: 'open' },
          ],
          sort: [],
          collapsed: false,
          props: {},
        },
        {
          view: 'BlockView',
          title: '已完成任务',
          filters: [
            { field: 'type', op: '=', value: 'task' },
            { field: 'status', op: '=', value: 'done' },
          ],
          sort: [{ field: 'date', dir: 'desc' }],
          collapsed: true,
          props: {},
        },
      ],
    };
    this.dashboards.push(def);
  }

  /** 把全局 CSS 注入到文档 <head> */
  private _injectStyles() {
    if (document.getElementById(STYLE_TAG_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_TAG_ID;
    style.textContent = GLOBAL_CSS;
    document.head.appendChild(style);
  }
}