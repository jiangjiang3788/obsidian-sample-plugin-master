// main.ts - 插件主入口，定义 ThinkPlugin 类，协调数据层与渲染层
import { App, Plugin, PluginSettingTab, TFile, TFolder } from 'obsidian';
import { render, h } from 'preact';  // 使用 Preact 渲染 JSX 组件
import { DataStore } from './data/store';
import { DashboardConfig } from './config/schema';
import { SettingsTab } from './ui/SettingsTab';
import { Dashboard } from './views/Dashboard';

// ThinkPlugin 主类，继承 Obsidian 的 Plugin 基类
export default class ThinkPlugin extends Plugin {
  // 全局数据存储实例
  public dataStore!: DataStore;
  // 仪表盘配置列表（持久化保存）
  public dashboards: DashboardConfig[] = [];
  // 活跃的仪表盘视图，用于动态刷新 { 容器元素, 配置名 }
  private activeDashboards: Array<{container: HTMLElement, configName: string}> = [];

  async onload() {
    console.log('ThinkPlugin 加载 - 新版 Dashboard 架构');
    // 读取已保存的配置
    const savedData = await this.loadData();
    if (savedData && savedData.dashboards) {
      this.dashboards = savedData.dashboards;
    }
    // 如果没有任何仪表盘配置，则创建一个默认配置
    if (this.dashboards.length === 0) {
      this._createDefaultDashboard();
    }
    // 初始化数据存储并进行初始扫描
    this.dataStore = new DataStore(this.app);
    await this.dataStore.scanAll();  // 扫描全部 md 文件，解析生成 Item 列表

    // 注册 Vault 事件监听，实现数据层的增量更新
    this.registerEvent(this.app.vault.on('modify', (file) => {
      if (file instanceof TFile && file.extension === 'md') {
        // 文件修改后重新扫描该文件，更新数据
        this.dataStore.scanFile(file).then(() => {
          // 不自动刷新 UI，以免频繁闪烁
          //（可选）如需自动刷新，可调用 this.refreshAllDashboards();
        });
      }
    }));
    this.registerEvent(this.app.vault.on('create', (file) => {
      if (file instanceof TFile && file.extension === 'md') {
        this.dataStore.scanFile(file);
      }
    }));
    this.registerEvent(this.app.vault.on('delete', (file) => {
      if (file instanceof TFile && file.extension === 'md') {
        this.dataStore.removeFileItems(file.path);
      }
    }));
    this.registerEvent(this.app.vault.on('rename', (file, oldPath) => {
      if (file instanceof TFile && file.extension === 'md') {
        // 删除旧路径对应的数据，添加新路径的数据
        this.dataStore.removeFileItems(oldPath);
        this.dataStore.scanFile(file);
      }
    }));

    // 注册 Markdown 代码块处理器，用于渲染 Dashboard 仪表盘视图
    this.registerMarkdownCodeBlockProcessor('think', (source, el, ctx) => {
      let configName: string | undefined;
      try {
        const input = source.trim() ? JSON.parse(source) : {};
        configName = input.config || input.dashboard || input.name;
      } catch(e) {
        console.warn('ThinkPlugin: 仪表盘代码块 JSON 解析失败，使用默认配置', e);
      }
      // 如果未指定 config 名称，则默认使用第一个配置
      if (!configName && this.dashboards.length > 0) {
        configName = this.dashboards[0].name;
      }
      const dashConfig = this.dashboards.find(cfg => cfg.name === configName);
      if (!dashConfig) {
        el.createDiv({ text: `找不到名称为 "${configName}" 的仪表盘配置` });
        return;
      }
      // 渲染 Dashboard 组件
      render(h(Dashboard, { config: dashConfig, dataStore: this.dataStore, plugin: this }), el);
      // 记录活动的 Dashboard，用于后续刷新
      this.activeDashboards.push({ container: el, configName: dashConfig.name });
    });

    // 注入全局样式，使视图组件显示更美观
    this._injectStyles();

    // 添加设置页，让用户可以可视化编辑仪表盘配置
    this.addSettingTab(new SettingsTab(this.app, this));
  }

  // 在卸载插件时调用
  onunload() {
    // 卸载时清理可能遗留的样式
    const styleEl = document.getElementById('think-dashboard-style');
    if (styleEl) styleEl.remove();
    console.log('ThinkPlugin 卸载');
  }

  /** 刷新所有活动的仪表盘视图 */
  public refreshAllDashboards() {
    this.activeDashboards = this.activeDashboards.filter(d => document.body.contains(d.container));
    for (const entry of this.activeDashboards) {
      const dashConfig = this.dashboards.find(cfg => cfg.name === entry.configName);
      if (!dashConfig) continue;
      // 在已有容器上重新渲染 Dashboard 以更新内容
      render(h(Dashboard, { config: dashConfig, dataStore: this.dataStore, plugin: this }), entry.container);
    }
  }

  /** 创建默认仪表盘配置 (在无配置时调用) */
  private _createDefaultDashboard() {
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const defaultDash: DashboardConfig = {
      name: '默认仪表盘',
      path: '',
      tags: [],
      initialView: '月',
      initialDate: todayStr,
      modules: [
        {
          view: 'ListView',
          title: '未完成任务',
          collapsed: false,
          filters: [
            { field: 'type', op: '=', value: 'task' },
            { field: 'status', op: '=', value: 'open' }
          ],
          sort: [],  // 未完成任务不排序，按笔记原顺序
          props: {}
        },
        {
          view: 'ListView',
          title: '已完成任务',
          collapsed: true,
          filters: [
            { field: 'type', op: '=', value: 'task' },
            { field: 'status', op: '=', value: 'done' }
          ],
          sort: [
            { field: 'date', dir: 'desc' }
          ],
          props: {}
        }
      ]
    };
    this.dashboards.push(defaultDash);
  }

  /** 注入全局 CSS 样式 */
  private _injectStyles() {
    const style = document.createElement('style');
    style.id = 'think-dashboard-style';
    style.textContent = `
      .think-table { width: 100%; border: 1px solid #ccc; border-collapse: collapse; }
      .think-table th, .think-table td { border: 1px solid #ccc; padding: 4px; text-align: center; }
      .think-table th { background-color: #f0f0f0; }
      .think-table td.empty { background-color: #f9f9f9; }
      .tag-pill { background-color: #e0e0e0; border-radius: 4px; padding: 0 6px; margin-right: 6px; font-size: 90%; display: inline-block; }
      .task-done { text-decoration: line-through; color: gray; }
      .module-header { display: flex; align-items: center; padding: 4px 8px; background: #eee; cursor: pointer; }
      .module-title { flex: 1; font-weight: bold; }
      .module-toggle { margin-left: 4px; }
      .module-content { padding: 6px 8px; }
    `;
    document.head.appendChild(style);
  }
}