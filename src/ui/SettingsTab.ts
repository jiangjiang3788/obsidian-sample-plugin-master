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
  plugin: ThinkPlugin;

  constructor(app: any, plugin: ThinkPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl('h2', { text: 'Think 仪表盘 - 配置管理' });

    /* ---- 新建按钮 ---- */
    containerEl
      .createEl('button', { text: '➕ 新建仪表盘', cls: 'mod-cta' })
      .onclick = () => {
        let name = '新仪表盘', n = 1;
        while (this.plugin.dashboards.some(d => d.name === name))
          name = `新仪表盘${n++}`;
        this.plugin.dashboards.push({ name, modules: [] });
        this.plugin.persistAll();
        this.display();
      };

    /* ---- 拿到上次点击的目标 ---- */
    const want = localStorage.getItem('think-target-dash') || null;

    /* ---- 仪表盘列表 ---- */
    this.plugin.dashboards.forEach((dash, idx) => {
      const wrap = containerEl.createEl('details', { cls: 'think-settings-block' });
      if (dash.name === want) {
        wrap.open = true;
        localStorage.removeItem('think-target-dash');
      }

      const sum = wrap.createEl('summary', { text: dash.name });
      sum.addClass('setting-item');

      /* 删除按钮 */
      const delBtn = sum.createEl('button', { text: '🗑', cls: 'mod-warning' });
      delBtn.style.marginLeft = 'auto';
      delBtn.onclick = e => {
        e.stopPropagation();
        if (confirm(`删除仪表盘「${dash.name}」？`)) {
          this.plugin.dashboards.splice(idx, 1);
          this.plugin.persistAll();
          new Notice('已删除');
          this.display();
        }
      };

      /* 表单主体 */
      const host = wrap.createDiv();
      render(
        h(DashboardConfigForm, {
          dashboard:  structuredClone(dash),
          dashboards: this.plugin.dashboards,
          onSave: (d: any) => {
            Object.assign(dash, d);
            this.plugin.persistAll().then(() => new Notice('已保存'));
            this.display();
         },
          onCancel: () => this.display(),
        }),
        host
      );
    });
  }
}