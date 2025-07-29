// src/ui/SettingsTab.ts
//-----------------------------------------------------------
// 读取 localStorage 中的待展开目标
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

    /* ── 展开此前点击的仪表盘（localStorage 记忆） ────────────── */
    const wantOpen = localStorage.getItem('think-target-dash');

    /* ── 列出所有仪表盘 ─────────────────────────────────────── */
    this.plugin.dashboards.forEach((dash, idx) => {
      const details = containerEl.createEl('details', { cls: 'think-settings-block' });
      if (dash.name === wantOpen) {
        details.open = true;
        localStorage.removeItem('think-target-dash');
      }

      /* summary 区（名称 + 删除按钮） */
      const summary = details.createEl('summary');
      summary.addClass('setting-item');
      summary.createSpan({ text: dash.name });

      /* 删除 */
      summary.createEl('button', { text: '🗑', cls: 'mod-warning' }).onclick = e => {
        e.stopPropagation();
        if (confirm(`确认删除仪表盘「${dash.name}」？此操作不可撤销！`)) {
          this.plugin.dashboards.splice(idx, 1);
          this.persistAndReload('已删除仪表盘');
        }
      };

      /* 表单挂载点 */
      const host = details.createDiv();

      /* 渲染 DashboardConfigForm（传入克隆以避免即时修改原数据） */
      render(
        h(DashboardConfigForm, {
          dashboard  : structuredClone(dash),
          dashboards : this.plugin.dashboards,
          /* 保存：写回 dash → persist → 刷新 UI */
          onSave     : (d) => {
            Object.assign(dash, d);
            this.persistAndReload('已保存');
            /* 保存后保持展开状态 */
            localStorage.setItem('think-target-dash', dash.name);
          },
          /* 取消：简单刷新一次即可恢复制前状态 */
          onCancel   : () => this.display(),
        }),
        host,
      );
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