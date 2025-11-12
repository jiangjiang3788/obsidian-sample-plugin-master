// src/features/logic/CodeblockEmbedder.ts
import { render } from 'preact'; // [修改] 不再需要 h
import { Notice, Plugin } from 'obsidian';
import { CODEBLOCK_LANG } from '@/lib/types/domain/constants';
import { DataStore } from '../services/core/dataStore';
// [移除] 不再需要直接导入 LayoutRenderer
// import { LayoutRenderer } from '../../views/Dashboard/ui/LayoutRenderer'; 
import { AppStore } from '@core/stores/AppStore';
import { RendererService } from '../services/core/RendererService';
import type { Layout } from '@/lib/types/domain/schema';
import type { ActionService } from '../services/core/ActionService';

export class CodeblockEmbedder {
    constructor(
        private plugin: Plugin,
        private appStore: AppStore,
        private dataStore: DataStore,
        private rendererService: RendererService,
        private actionService: ActionService,
    ) {
        this.registerProcessor();
    }

    private registerProcessor() {
        this.plugin.registerMarkdownCodeBlockProcessor(
            CODEBLOCK_LANG,
            (source, el, /* ctx */) => {
                try { render(null, el); } catch { }
                el.empty();
                
                let layoutName: string | undefined;

                try {
                    const trimmedSource = source.trim();
                    if (trimmedSource.startsWith('{')) {
                        const input = JSON.parse(trimmedSource);
                        layoutName = input.layout || input.name;
                    } else if (trimmedSource) {
                        layoutName = trimmedSource.replace(/['"]/g, '');
                    }
                } catch (e) {
                    console.warn('ThinkPlugin: 代码块内容解析失败', e);
                    el.createDiv({ text: '代码块内容解析失败，请检查语法。应为布局名称或JSON。' });
                    return;
                }
                
                const allLayouts = this.appStore.getSettings().layouts;

                if (!layoutName && allLayouts.length > 0) {
                    layoutName = allLayouts[0].name;
                    new Notice(`Think Plugin: 未指定布局，已自动选择第一个布局 "${layoutName}"。`);
                }

                const layout = allLayouts.find(l => l.name === layoutName);
                if (!layout) {
                    el.createDiv({ text: `Think Plugin: 找不到名称为 "${layoutName}" 的布局。请在插件设置中创建。` });
                    return;
                }

                // [修改] mountAndRegister 现在只负责调用服务，不再自己渲染
                this.mountAndRegister(el, layout);
            },
        );
    }

    /**
     * [修改] 此方法现在将渲染工作完全委托给 RendererService
     */
    private mountAndRegister(el: HTMLElement, layout: Layout) {
        // [移除] 此处不再需要手动调用 render()，因为 register 方法会处理
        // render( h(LayoutRenderer, { ... }), el );

        // [修改] 只调用服务即可，服务会负责正确的渲染
        this.rendererService.register(el, layout);
    }
}
