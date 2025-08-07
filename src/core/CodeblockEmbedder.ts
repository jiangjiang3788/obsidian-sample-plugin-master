// src/core/CodeblockEmbedder.ts
//-----------------------------------------------------------
// 负责解析 ```think 代码块并渲染 Dashboard
//-----------------------------------------------------------

import { render, h } from 'preact';

import { CODEBLOCK_LANG }   from '@core/domain/constants';
import { DashboardConfig }  from '@core/domain/schema';
import { DataStore }        from '@core/services/dataStore';

import { Dashboard }        from '@features/dashboard/ui/Dashboard';   // 新路径
import type ThinkPlugin     from '../main';

export class CodeblockEmbedder {
  constructor(
    private plugin: ThinkPlugin,
    private dataStore: DataStore,
  ) {
    this.registerProcessor();
  }

  /* ---------- 注册代码块处理器 ---------- */
  private registerProcessor() {
    this.plugin.registerMarkdownCodeBlockProcessor(
      CODEBLOCK_LANG,
      (source, el) => {
        let configName: string | undefined;
        let inlineDash: DashboardConfig | undefined;

        /* ① 解析代码块 JSON 参数 ----------------------------- */
        try {
          const input = source.trim() ? JSON.parse(source) : {};

          if (Array.isArray(input.modules)) {
            //   内联模式：在代码块里直接写 modules
            inlineDash = {
              name: input.name || '__inline__',
              path: input.path || '',
              tags: input.tags || [],
              initialView: input.initialView || '月',
              initialDate: input.initialDate || '',
              modules: input.modules,
            };
          } else {
            //   引用模式：{ "config": "默认仪表盘" }
            configName = input.config || input.dashboard || input.name;
          }
        } catch (e) {
          console.warn('ThinkPlugin: 仪表盘代码块 JSON 解析失败', e);
        }

        /* ② 内联仪表盘直接渲染 -------------------------------- */
        if (inlineDash) {
          this.mount(el, inlineDash);
          return;
        }

        /* ③ 找不到 name → 默认第一个 ------------------------- */
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

  /* ---------- 在元素上挂载 Preact Dashboard ---------- */
  private mount(el: HTMLElement, dash: DashboardConfig) {
    render(
      h(Dashboard, {
        config:    dash,
        dataStore: this.dataStore,
        plugin:    this.plugin,
      }),
      el,
    );
    this.plugin.activeDashboards.push({ container: el, configName: dash.name });
  }
}