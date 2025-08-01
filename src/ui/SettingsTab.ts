// src/ui/SettingsTab.ts
//-----------------------------------------------------------
// 设置页（懒加载 DashboardConfigForm 以加速打开速度）
//-----------------------------------------------------------

/** @jsxImportSource preact */
import { h, render } from 'preact';
import { PluginSettingTab, Notice } from 'obsidian';
import ThinkPlugin from '../main';
import { DashboardConfigForm } from './DashboardConfigForm';

export class SettingsTab extends PluginSettingTab {
  private plugin: ThinkPlugin;

  constructor(app: any, plugin: ThinkPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  /* ------------------------------------------------------------------ */
  /** 刷新整个设置面板 */
  display(): void {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl('h2', { text: 'Think 仪表盘 - 配置管理' });

    /* ── 新建仪表盘 ─────────────────────────────────────────── */
    containerEl
      .createEl('button', { text: '➕ 新建仪表盘', cls: 'mod-cta' })
      .onclick = () => {
        let name = '新仪表盘', n = 1;
        while (this.plugin.dashboards.some(d => d.name === name))
          name = `新仪表盘${n++}`;

        this.plugin.dashboards.push({ name, modules: [] });
        this.persistAndReload('已创建新仪表盘');
      };

    /* 上次点击的目标（展开用） */
    const wantOpen = localStorage.getItem('think-target-dash');

    /* ── 列出所有仪表盘 ─────────────────────────────────────── */
    this.plugin.dashboards.forEach((dash, idx) => {
      const details = containerEl.createEl('details', { cls: 'think-settings-block' });
      details.open = dash.name === wantOpen;
      if (details.open) localStorage.removeItem('think-target-dash');

      /* summary（名称 + 删除按钮） */
      const summary = details.createEl('summary');
      summary.addClass('setting-item');
      summary.createSpan({ text: dash.name });

      summary
        .createEl('button', { text: '🗑', cls: 'mod-warning' })
        .onclick = e => {
          e.stopPropagation();
          if (confirm(`确认删除仪表盘「${dash.name}」？此操作不可撤销！`)) {
            this.plugin.dashboards.splice(idx, 1);
            this.persistAndReload('已删除仪表盘');
          }
        };

      /* 懒加载 DashboardConfigForm：仅在展开时渲染一次 */
      const host = details.createDiv();
      const renderForm = () => {
        host.empty();   // 防止重复
        render(
          h(DashboardConfigForm, {
            dashboard  : structuredClone(dash),
            dashboards : this.plugin.dashboards,
            onSave     : d => {
              Object.assign(dash, d);
              this.persistAndReload('已保存');
              localStorage.setItem('think-target-dash', dash.name); // 保持展开
            },
            onCancel   : () => this.display(),
          }),
          host,
        );
      };

      /* 如果默认是 open 立即渲染，否则等待 toggle 事件 */
      if (details.open) renderForm();
      details.addEventListener('toggle', () => {
        if (details.open && host.childElementCount === 0) renderForm();
      });
    });
  }

  /* ------------------------------------------------------------------ */
  /** 持久化全部 dashboards，并刷新面板 */
  private persistAndReload(msg: string) {
    this.plugin.persistAll().then(() => {
      new Notice(msg);
      this.display();
    });
  }
}