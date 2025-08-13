// src/core/CodeblockEmbedder.ts
import { render, h } from 'preact';

// [REFACTOR] 导入常量
import { CODEBLOCK_LANG, INTERNAL_NAMES } from '@core/domain/constants';
import { DashboardConfig } from '@core/domain/schema';
import { DataStore } from '@core/services/dataStore';

import { Dashboard } from '@features/dashboard/ui/Dashboard';
import type ThinkPlugin from '../main';

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
      (source, el, /* ctx */) => { // ctx in processor is MarkdownPostProcessorContext
        // 清理旧的渲染，防止内存泄漏
        try { render(null, el); } catch {}
        el.empty();
       
        let configName: string | undefined;
        let inlineDash: DashboardConfig | undefined;

        /* ① 解析代码块 JSON 参数 */
        try {
          const input = source.trim() ? JSON.parse(source) : {};
          if (Array.isArray(input.modules)) {
            inlineDash = {
              // [REFACTOR] 使用常量
              name: input.name || INTERNAL_NAMES.INLINE_DASHBOARD,
              path: input.path || '',
              tags: input.tags || [],
              initialView: input.initialView || '月',
              initialDate: input.initialDate || '',
              modules: input.modules,
            };
          } else {
            configName = input.config || input.dashboard || input.name;
          }
        } catch (e) {
          console.warn('ThinkPlugin: 仪表盘代码块 JSON 解析失败', e);
          el.createDiv({ text: '仪表盘代码块 JSON 解析失败，请检查语法。' });
          return;
        }

        /* ② 内联仪表盘直接渲染 */
        if (inlineDash) {
          this.mount(el, inlineDash);
          return;
        }

        /* ③ 找不到 name → 默认第一个 */
        if (!configName && this.plugin.dashboards.length) {
            configName = this.plugin.dashboards[0].name;
        }

        const dash = this.plugin.dashboards.find(d => d.name === configName);
        if (!dash) {
          el.createDiv({ text: `找不到名称为 "${configName}" 的仪表盘配置。` });
          return;
        }
        this.mount(el, dash);
      },
    );
  }

  /* ---------- 在元素上挂载 Preact Dashboard ---------- */
  private mount(el: HTMLElement, dash: DashboardConfig) {
    // 渲染 Preact 组件
    render(
      h(Dashboard, {
        config: dash,
        dataStore: this.dataStore,
        plugin: this.plugin,
      }),
      el,
    );
   
    // 如果不是内联仪表盘，则将其注册到 activeDashboards 以便能够刷新
    // [REFACTOR] 使用常量
    if (dash.name !== INTERNAL_NAMES.INLINE_DASHBOARD) {
        // 先移除可能存在的旧引用
        this.plugin.activeDashboards = this.plugin.activeDashboards.filter(d => d.container !== el);
        // 添加新引用
        this.plugin.activeDashboards.push({ container: el, configName: dash.name });
    }
  }
}