// src/main.ts —— Obsidian 插件入口，职责：组装平台 + 核心 + 各 Feature
import { Plugin } from 'obsidian';

import { DashboardConfig } from '@core/domain/schema';
import { ObsidianPlatform } from '@platform/obsidian';
import { DataStore } from '@core/services/dataStore';
import { SettingsTab } from './ui/SettingsTab';
import { STYLE_TAG_ID, GLOBAL_CSS } from '@core/domain/constants';
import { VaultWatcher } from './core/VaultWatcher';
import { CodeblockEmbedder } from './core/CodeblockEmbedder';
// ★ 新增：快速输入面板（三个 Modal）
import { QuickTaskModal } from './ui/modals/QuickTaskModal';
import { QuickBlockModal } from './ui/modals/QuickBlockModal';
import { QuickHabitModal } from './ui/modals/QuickHabitModal';

import './views/styles.css'; // 让复选框样式生效

export interface PersistData {
  dashboards: DashboardConfig[];
  inputSettings?: Record<string, any>;
}

export default class ThinkPlugin extends Plugin {
  /* ---------- 平台 & 核心 ---------- */
  platform!: ObsidianPlatform;
  dataStore!: DataStore;

  /* ---------- 状态持久化 ---------- */
  dashboards: DashboardConfig[] = [];
  activeDashboards: Array<{ container: HTMLElement; configName: string }> =
    [];
  inputSettings: Record<string, any> = {};
  currentSettingsTarget: string | null = null;

  /* =================================================================== */
  /*                                生命周期                             */
  /* =================================================================== */
  async onload() {
    console.log('ThinkPlugin 加载 - 重构版');

    /* ---------- 平台 & 数据层 ---------- */
    this.platform = new ObsidianPlatform(this.app);
    this.dataStore = new DataStore(this.platform);

    /* ---------- 读取持久化 ---------- */
    const saved = (await this.loadData()) as PersistData | undefined;
    if (saved?.dashboards) this.dashboards = saved.dashboards;
    if (!this.dashboards.length) this._createDefaultDashboard();
    this.inputSettings = saved?.inputSettings ?? {};

    /* 向后兼容旧视图名 & 删除已废弃视图 */
    this.dashboards.forEach(d => {
      d.modules = d.modules
        .filter(m => (m.view as any) !== 'SettingsFormView')
        .map(m => {
          if ((m.view as any) === 'ListView') m.view = 'BlockView';
          return m;
        });
    });

    /* ---------- 首次扫描与监听 ---------- */
    await this.dataStore.scanAll();
    new VaultWatcher(this, this.dataStore);
    new CodeblockEmbedder(this, this.dataStore);

    /* ---------- 样式注入 & 设置页 ---------- */
    this._injectStyles();
    this.addSettingTab(new SettingsTab(this.app, this));

    /* ---------- 命令：快速录入 ---------- */
    this.addCommand({
      id: 'think-quick-input-task',
      name: '快速录入 · 任务',
      callback: () => new QuickTaskModal(this).open(),
    });
    this.addCommand({
      id: 'think-quick-input-block',
      name: '快速录入 · 计划/总结/思考',
      callback: () => new QuickBlockModal(this).open(),
    });
    this.addCommand({
      id: 'think-quick-input-habit',
      name: '快速录入 · 打卡',
      callback: () => new QuickHabitModal(this).open(),
    });

    /* ---------- 清理本地存储标记 ---------- */
    this.register(() => localStorage.removeItem('think-target-dash'));
  }

  onunload() {
    document.getElementById(STYLE_TAG_ID)?.remove();
    console.log('ThinkPlugin 卸载');
  }

  /* =================================================================== */
  /*                                公共 API                              */
  /* =================================================================== */

  openSettingsForDashboard(name: string) {
    localStorage.setItem('think-target-dash', name);
    this.app.setting.open();
    this.app.setting.openTabById(this.manifest.id);
  }

  async persistAll() {
    await this.saveData({
      dashboards: this.dashboards,
      inputSettings: this.inputSettings,
    });
  }

  /* =================================================================== */
  /*                              内部工具                                */
  /* =================================================================== */
  private _createDefaultDashboard() {
    const now = new Date();
    const today = `${now.getFullYear()}-${String(
      now.getMonth() + 1,
    ).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

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

  private _injectStyles() {
    if (document.getElementById(STYLE_TAG_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_TAG_ID;
    style.textContent = GLOBAL_CSS;
    document.head.appendChild(style);
  }
}
