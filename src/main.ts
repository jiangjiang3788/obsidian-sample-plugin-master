// main.ts
// 插件主入口（整合事件节流、 DataStore  拆分后的调用方式保持兼容）
import { Plugin, TFile } from 'obsidian';
import { render, h } from 'preact';
import { DataStore } from './data/store';
import { DashboardConfig } from './config/schema';
import { SettingsTab } from './ui/SettingsTab';
import { Dashboard } from './views/Dashboard';
import { CODEBLOCK_LANG, STYLE_TAG_ID, GLOBAL_CSS } from './config/constants';

export interface PersistData {
  dashboards: DashboardConfig[];
  /** 新增：所有输入配置统一放到这里 */
  inputSettings?: Record<string, any>;
}

export default class ThinkPlugin extends Plugin {
  public dataStore!: DataStore;
  public dashboards: DashboardConfig[] = [];
  public activeDashboards: Array<{ container: HTMLElement; configName: string }> = [];

  /** ☆ 新增：对外暴露的统一配置对象 */
  public inputSettings: Record<string, any> = {};

  async onload() {
    console.log('ThinkPlugin 加载 - 重构版');

    const saved = (await this.loadData()) as PersistData | undefined;

    if (saved?.dashboards) this.dashboards = saved.dashboards;
    if (this.dashboards.length === 0) this._createDefaultDashboard();

    // ☆ 读取持久化的 inputSettings，没有则给空对象
    this.inputSettings = saved?.inputSettings ?? {};

    // 向后兼容: ListView → BlockView
    for (const dash of this.dashboards) {
      for (const mod of dash.modules) {
        if ((mod.view as any) === 'ListView') mod.view = 'BlockView';
      }
    }

    this.dataStore = new DataStore(this.app);
    await this.dataStore.scanAll();

    // 监听 vault 变化（节流在 DataStore 内做）
    const onVault = this.app.vault.on.bind(this.app.vault);
    const rescan = (f: TFile) => this.dataStore.scanFile(f).then(() => this.dataStore.notifyChange());

    this.registerEvent(onVault('modify', (f) => {
      if (f instanceof TFile && f.extension === 'md') rescan(f);
    }));
    this.registerEvent(onVault('create', (f) => {
      if (f instanceof TFile && f.extension === 'md') rescan(f);
    }));
    this.registerEvent(onVault('delete', (f) => {
      if (f instanceof TFile && f.extension === 'md') {
        this.dataStore.removeFileItems(f.path);
        this.dataStore.notifyChange();
      }
    }));
    this.registerEvent(onVault('rename', (f, old) => {
      if (f instanceof TFile && f.extension === 'md') {
        this.dataStore.removeFileItems(old);
        rescan(f);
      }
    }));

    /**
     * codeblock 处理器
     * - 支持严格 JSON（不允许注释/尾逗号）
     * - 支持两种模式：
     *   1) 引用已持久化的 dashboard：{"config":"默认仪表盘"}
     *   2) 直接内联 modules：{"modules":[{...}]}
     */
    this.registerMarkdownCodeBlockProcessor(CODEBLOCK_LANG, (source, el) => {
      let configName: string | undefined;
      let inlineDash: DashboardConfig | undefined;

      try {
        const input = source.trim() ? JSON.parse(source) : {};

        if (Array.isArray(input.modules)) {
          // ② 内联配置模式
          inlineDash = {
            name: input.name || '__inline__',
            path: input.path || '',
            tags: input.tags || [],
            initialView: input.initialView || '月',
            initialDate: input.initialDate || '',
            modules: input.modules,
          };
        } else {
          // ① 引用持久化的 dashboard
          configName = input.config || input.dashboard || input.name;
        }
      } catch (e) {
        console.warn('ThinkPlugin: 仪表盘代码块 JSON 解析失败，使用默认', e);
      }

      // 内联 dash：直接渲染
      if (inlineDash) {
        render(h(Dashboard, { config: inlineDash, dataStore: this.dataStore, plugin: this }), el);
        this.activeDashboards.push({ container: el, configName: inlineDash.name });
        return;
      }

      // 否则走持久化 dash
      if (!configName && this.dashboards.length) configName = this.dashboards[0].name;
      const dash = this.dashboards.find(d => d.name === configName);
      if (!dash) {
        el.createDiv({ text: `找不到名称为 "${configName}" 的仪表盘配置` });
        return;
      }
      render(h(Dashboard, { config: dash, dataStore: this.dataStore, plugin: this }), el);
      this.activeDashboards.push({ container: el, configName: dash.name });
    });

    this._injectStyles();
    this.addSettingTab(new SettingsTab(this.app, this));
  }

  onunload() {
    const styleEl = document.getElementById(STYLE_TAG_ID);
    if (styleEl) styleEl.remove();
    console.log('ThinkPlugin 卸载');
  }

  public refreshAllDashboards() {
    this.activeDashboards = this.activeDashboards.filter(d => document.body.contains(d.container));
    for (const entry of this.activeDashboards) {
      const dash = this.dashboards.find(cfg => cfg.name === entry.configName);
      if (!dash) continue;
      render(h(Dashboard, { config: dash, dataStore: this.dataStore, plugin: this }), entry.container);
    }
  }

  /** ☆ 统一的持久化入口 */
  public async persistAll() {
    const payload: PersistData = {
      dashboards: this.dashboards,
      inputSettings: this.inputSettings,
    };
    await this.saveData(payload);
  }

  private _createDefaultDashboard() {
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
      now.getDate()
    ).padStart(2, '0')}`;
    const defaultDash: DashboardConfig = {
      name: '默认仪表盘',
      path: '',
      tags: [],
      initialView: '月',
      initialDate: today,
      modules: [
        {
          view: 'BlockView',
          title: '未完成任务',
          collapsed: false,
          filters: [
            { field: 'type', op: '=', value: 'task' },
            { field: 'status', op: '=', value: 'open' },
          ],
          sort: [],
          props: {},
        },
        {
          view: 'BlockView',
          title: '已完成任务',
          collapsed: true,
          filters: [
            { field: 'type', op: '=', value: 'task' },
            { field: 'status', op: '=', value: 'done' },
          ],
          sort: [{ field: 'date', dir: 'desc' }],
          props: {},
        },
      ],
    };
    this.dashboards.push(defaultDash);
  }

  private _injectStyles() {
    if (document.getElementById(STYLE_TAG_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_TAG_ID;
    style.textContent = GLOBAL_CSS;
    document.head.appendChild(style);
  }
}