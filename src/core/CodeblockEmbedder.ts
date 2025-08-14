// src/core/CodeblockEmbedder.ts

import { render, h } from 'preact';

import { CODEBLOCK_LANG } from '@core/domain/constants';

import { DataStore } from '@core/services/dataStore';

import { LayoutRenderer } from '@features/dashboard/ui/LayoutRenderer';

import type ThinkPlugin from '../main';

import type { Layout } from '@core/domain/schema';



export class CodeblockEmbedder {

  constructor(

    private plugin: ThinkPlugin,

    private dataStore: DataStore,

  ) {

    this.registerProcessor();

  }



  private registerProcessor() {

    this.plugin.registerMarkdownCodeBlockProcessor(

      CODEBLOCK_LANG,

      (source, el, /* ctx */) => {

        // 清理旧的渲染

        try { render(null, el); } catch {}

        el.empty();

        

        let layoutName: string | undefined;



        // 解析代码块内容，获取布局名称

        try {

          const trimmedSource = source.trim();

          if (trimmedSource.startsWith('{')) {

            const input = JSON.parse(trimmedSource);

            // 支持 { "layout": "My Layout" } 或 { "name": "My Layout" }

            layoutName = input.layout || input.name;

          } else if (trimmedSource) {

            // 直接将代码块内容作为布局名称，支持 "My Layout" 或 My Layout

            layoutName = trimmedSource.replace(/['"]/g, '');

          }

        } catch (e) {

          console.warn('ThinkPlugin: 代码块内容解析失败', e);

          el.createDiv({ text: '代码块内容解析失败，请检查语法。应为布局名称或JSON。' });

          return;

        }

        

        const allLayouts = this.plugin.appStore.getSettings().layouts;



        // 如果未指定布局名称，则使用第一个可用的布局

        if (!layoutName && allLayouts.length > 0) {

            layoutName = allLayouts[0].name;

            new Notice(`Think Plugin: 未指定布局，已自动选择第一个布局 "${layoutName}"。`);

        }



        // 查找布局配置

        const layout = allLayouts.find(l => l.name === layoutName);

        if (!layout) {

          el.createDiv({ text: `Think Plugin: 找不到名称为 "${layoutName}" 的布局。请在插件设置中创建。` });

          return;

        }



        // 挂载并渲染

        this.mount(el, layout);

      },

    );

  }



  /**

   * 将 LayoutRenderer 组件挂载到指定的 HTML 元素上，并注册以便于热重载。

   * @param el - 目标容器元素。

   * @param layout - 要渲染的布局配置。

   */

  private mount(el: HTMLElement, layout: Layout) {

    render(

      h(LayoutRenderer, {

        layout: layout,

        dataStore: this.dataStore,

        plugin: this.plugin,

      }),

      el,

    );

    

    // 注册活动的布局，以便在设置更改时刷新

    // 先移除旧的引用（如果存在），再添加新的，确保唯一性

    this.plugin.activeLayouts = this.plugin.activeLayouts.filter(l => l.container !== el);

    this.plugin.activeLayouts.push({ container: el, layoutName: layout.name });

  }

}