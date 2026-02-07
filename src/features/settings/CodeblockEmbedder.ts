// src/features/logic/CodeblockEmbedder.ts
/**
 * P0-3: CodeblockEmbedder - 通过 app/public 获取 store
 *
 * Phase 4.3: 组合根禁止下沉
 * - features 层禁止直接 import tsyringe container
 * - 使用 createServices() 作为唯一入口拿到 zustandStore
 * - 使用纯函数 getZustandState(store, selector) 读取 settings
 */
import { render } from 'preact';
import { Notice, Plugin } from 'obsidian';
import { CODEBLOCK_LANG, devWarn } from '@core/public';
import { DataStore } from '@core/public';
import { createServices, getZustandState, type AppStoreInstance } from '@/app/public';
import { RendererService } from '@/features/settings/RendererService';
import type { Layout } from '@core/public';
import type { ActionService } from '@core/public';

export class CodeblockEmbedder {
    // P0-3: store 从 DI 获取
    private store: AppStoreInstance;
    
    constructor(
        private plugin: Plugin,
        private dataStore: DataStore,
        private rendererService: RendererService,
        private actionService: ActionService,
    ) {
        // Phase 4.3: 只能通过 app/public 获取 store（禁止 container 下沉）
        this.store = createServices().zustandStore;
        this.registerProcessor();
    }

    /**
     * P0-3: 获取 settings - 使用纯函数 getZustandState
     */
    private getSettings() {
        return getZustandState(this.store, s => s.settings);
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
                    devWarn('ThinkPlugin: 代码块内容解析失败', e);
                    el.createDiv({ text: '代码块内容解析失败，请检查语法。应为布局名称或JSON。' });
                    return;
                }
                
                const settings = this.getSettings();
                const allLayouts = settings.layouts;

                if (!layoutName && allLayouts.length > 0) {
                    layoutName = allLayouts[0].name;
                    new Notice(`Think Plugin: 未指定布局，已自动选择第一个布局 "${layoutName}"。`);
                }

                const layout = allLayouts.find((l: Layout) => l.name === layoutName);
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
        this.rendererService.register(el, layout);
    }
}
