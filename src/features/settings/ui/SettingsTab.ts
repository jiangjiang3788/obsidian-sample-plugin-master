

/** @jsxImportSource preact */
import { PluginSettingTab, Notice } from 'obsidian';
import type ThinkPlugin from '@root/main';          // 视你 main.ts 真实路径调整
import { DashboardConfigForm } from '@features/dashboard/ui';   

import { InputSettingsTable  } from './InputSettingsTable';
export class SettingsTab extends PluginSettingTab {
  private plugin: ThinkPlugin;

  constructor(app: any, plugin: ThinkPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  /* ------------------------------------------------------------------ */
  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    /* ── 通用输入设置 ───────────────────────────────────────── */
    const inputHost = containerEl.createDiv({ cls: 'think-settings-block' });
    render(h(InputSettingsTable, { plugin: this.plugin }), inputHost);

    containerEl.createEl('hr');

    /* ── 仪表盘配置管理 ───────────────────────────────────── */
    containerEl.createEl('h2', { text: 'Think 仪表盘 - 配置管理' });

    /* 新建仪表盘按钮 */
    containerEl
      .createEl('button', { text: '➕ 新建仪表盘', cls: 'mod-cta' })
      .onclick = () => {
        let name = '新仪表盘',
          n = 1;
        while (this.plugin.dashboards.some(d => d.name === name))
          name = `新仪表盘${n++}`;

        this.plugin.dashboards.push({ name, modules: [] });
        this.persistAndReload('已创建新仪表盘');
      };

    /* 上次展开目标 */
    const wantOpen = localStorage.getItem('think-target-dash');

    /* 列出全部仪表盘 */
    this.plugin.dashboards.forEach((dash, idx) => {
      const details = containerEl.createEl('details', { cls: 'think-settings-block' });
      details.open = dash.name === wantOpen;
      if (details.open) localStorage.removeItem('think-target-dash');

      /* summary */
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

      /* 懒加载配置表单 */
      const host = details.createDiv();
      const mountForm = () => {
        host.empty();
        render(
          h(DashboardConfigForm, {
            dashboard: structuredClone(dash),
            dashboards: this.plugin.dashboards,
            onSave: d => {
              Object.assign(dash, d);
              this.persistAndReload('已保存');
              localStorage.setItem('think-target-dash', dash.name); // 保持展开
            },
            onCancel: () => this.display(),
          }),
          host,
        );
      };
      if (details.open) mountForm();
      details.addEventListener('toggle', () => {
        if (details.open && host.childElementCount === 0) mountForm();
      });
    });
  }

  /* ------------------------------------------------------------------ */
  private persistAndReload(msg: string) {
    this.plugin.persistAll().then(() => {
      new Notice(msg);
      this.display();
    });
  }
}