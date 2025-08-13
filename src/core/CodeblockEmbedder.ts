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

        /* ① 解析代码块 JSON 参数 */
        try {
          const input = source.trim() ? JSON.parse(source) : {};
          // [MODIFIED] 移除内联仪表盘的解析逻辑，只读取配置名称
          configName = input.config || input.dashboard || input.name;
        } catch (e) {
          console.warn('ThinkPlugin: 仪表盘代码块 JSON 解析失败', e);
          el.createDiv({ text: '仪表盘代码块 JSON 解析失败，请检查语法。' });
          return;
        }
        
        /* [REMOVED] 内联仪表盘的渲染逻辑已被移除 */

        /* ② 如果未指定名称，则默认使用第一个仪表盘 */
        if (!configName && this.plugin.dashboards.length) {
            configName = this.plugin.dashboards[0].name;
        }

        /* ③ 根据名称查找配置并渲染 */
        const dash = this.plugin.dashboards.find(d => d.name === configName);
        if (!dash) {
          el.createDiv({ text: `找不到名称为 "${configName}" 的仪表盘配置。请在插件设置中创建。` });
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
   
    // [MODIFIED] 不再需要检查是否为内联仪表盘，所有渲染的仪表盘都注册以便刷新
    // 先移除可能存在的旧引用
    this.plugin.activeDashboards = this.plugin.activeDashboards.filter(d => d.container !== el);
    // 添加新引用
    this.plugin.activeDashboards.push({ container: el, configName: dash.name });
  }
}