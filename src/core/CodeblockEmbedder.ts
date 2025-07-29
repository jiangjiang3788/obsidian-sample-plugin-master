// core/CodeblockEmbedder.ts
import { DashboardConfig } from '../config/schema';
import { CODEBLOCK_LANG } from '../config/constants';
import { render, h } from 'preact';
import { Dashboard } from '../views/Dashboard';
import type ThinkPlugin from '../main';
import { DataStore } from '../data/store';

/** 负责处理 ```think 代码块并渲染 Dashboard */
export class CodeblockEmbedder {
  private plugin: ThinkPlugin;
  private dataStore: DataStore;

  constructor(plugin: ThinkPlugin, dataStore: DataStore) {
    this.plugin    = plugin;
    this.dataStore = dataStore;
    this.registerProcessor();
  }

  private registerProcessor() {
    this.plugin.registerMarkdownCodeBlockProcessor(
      CODEBLOCK_LANG,
      (source, el) => {
        let configName: string | undefined;
        let inlineDash: DashboardConfig | undefined;

        try {
          const input = source.trim() ? JSON.parse(source) : {};
          if (Array.isArray(input.modules)) {
            // ② 内联模式
            inlineDash = {
              name: input.name || '__inline__',
              path: input.path || '',
              tags: input.tags || [],
              initialView: input.initialView || '月',
              initialDate: input.initialDate || '',
              modules: input.modules,
            };
          } else {
            // ① 引用持久化
            configName = input.config || input.dashboard || input.name;
          }
        } catch (e) {
          console.warn('ThinkPlugin: 仪表盘代码块 JSON 解析失败', e);
        }

        if (inlineDash) return this.mount(el, inlineDash);

        if (!configName && this.plugin.dashboards.length)
          configName = this.plugin.dashboards[0].name;

        const dash = this.plugin.dashboards.find(d => d.name === configName);
        if (!dash) {
          el.createDiv({ text: `找不到名称为 "${configName}" 的仪表盘配置` });
          return;
        }
        this.mount(el, dash);
      },
    );
  }

  private mount(el: HTMLElement, dash: DashboardConfig) {
    render(
      h(Dashboard, {
        config: dash,
        dataStore: this.dataStore,
        plugin:   this.plugin,
      }),
      el,
    );
    this.plugin.activeDashboards.push({ container: el, configName: dash.name });
  }
}