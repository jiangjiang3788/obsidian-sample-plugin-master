// scr/ui/SettingsTab.ts
/** @jsxImportSource preact */

import { render } from 'preact';
import { PluginSettingTab, Notice } from 'obsidian';
import ThinkPlugin from '../main';
import { DashboardConfig } from '../config/schema';
import { DashboardConfigForm } from './DashboardConfigForm';

export class SettingsTab extends PluginSettingTab {
  plugin: ThinkPlugin;
  private selectIdx = 0;
  private editorEl!: HTMLElement;

  constructor(app: any, plugin: ThinkPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl('h2', { text: 'Think 仪表盘 配置' });

    // 仪表盘选择 + 增删
    const header = containerEl.createDiv({ style: 'margin-bottom:8px;' });

    const select = header.createEl('select');
    this.plugin.dashboards.forEach((d, i) => {
      const opt = select.createEl('option', { text: d.name });
      opt.value = String(i);
    });
    select.value = String(this.selectIdx);
    select.onchange = () => {
      this.selectIdx = Number(select.value);
      this.renderEditor();
    };

    header.createEl('button', { text: '新增' }).onclick = () => {
      let name = '新仪表盘';
      let n = 1;
      while (this.plugin.dashboards.some(d => d.name === name)) name = `新仪表盘${n++}`;
      this.plugin.dashboards.push({ name, modules: [] });
      this.selectIdx = this.plugin.dashboards.length - 1;
      this.display();
    };

    header.createEl('button', { text: '删除' }).onclick = () => {
      if (!this.plugin.dashboards.length) return;
      const del = this.plugin.dashboards.splice(this.selectIdx, 1)[0];
      new Notice(`已删除：${del.name}`);
      this.selectIdx = Math.max(0, this.selectIdx - 1);
      this.display();
    };

    // 表单容器
    this.editorEl = containerEl.createDiv();
    this.renderEditor();
  }

  private renderEditor() {
    this.editorEl.empty();
    const dash = this.plugin.dashboards[this.selectIdx];
    if (!dash) return;

    render(
      // 传克隆体避免未保存就污染原对象
      (DashboardConfigForm as any)({
        dashboard: structuredClone(dash) as DashboardConfig,
        dashboards: this.plugin.dashboards,
        onSave: (d: DashboardConfig) => {
          Object.assign(dash, d);
          this.plugin.persistAll().then(() => new Notice('已保存'));
          this.display();
        },
        onCancel: () => this.renderEditor(),
      }),
      this.editorEl
    );
  }
}