// src/core/CodeblockEmbedder.ts
import { render, h } from 'preact';
import { CODEBLOCK_LANG } from '@core/domain/constants';
import { DataStore } from '@core/services/dataStore';
import { LayoutRenderer } from '@features/dashboard/ui/LayoutRenderer'; // [MOD] 导入新的渲染器
import type ThinkPlugin from '../main';

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
        try { render(null, el); } catch {}
        el.empty();
        
        let layoutName: string | undefined;

        try {
          const input = source.trim() ? JSON.parse(source) : {};
          // [MOD] 只读取布局名称
          layoutName = input.layout || input.name;
        } catch (e) {
          console.warn('ThinkPlugin: 代码块 JSON 解析失败', e);
          el.createDiv({ text: '代码块 JSON 解析失败，请检查语法。' });
          return;
        }
        
        const layouts = this.plugin.appStore.getSettings().layouts;

        if (!layoutName && layouts.length) {
            layoutName = layouts[0].name;
        }

        const layout = layouts.find(l => l.name === layoutName);
        if (!layout) {
          el.createDiv({ text: `找不到名称为 "${layoutName}" 的布局。请在插件设置中创建。` });
          return;
        }

        this.mount(el, layout);
      },
    );
  }

  private mount(el: HTMLElement, layout: any /* Layout */) {
    render(
      h(LayoutRenderer, {
        layout: layout,
        dataStore: this.dataStore,
        plugin: this.plugin,
      }),
      el,
    );
    
    // 注册活动的布局，以便在设置更改时刷新
    this.plugin.activeLayouts = this.plugin.activeLayouts.filter(l => l.container !== el);
    this.plugin.activeLayouts.push({ container: el, layoutName: layout.name });
  }
}