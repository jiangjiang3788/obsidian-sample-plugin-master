// src/features/logic/CodeblockEmbedder.ts
/**
 * P0-3: CodeblockEmbedder - 通过 DI 获取 store
 * 
 * 改动说明：
 * - 使用 container.resolve(STORE_TOKEN) 获取 store
 * - 使用纯函数 getZustandState(store, selector) 读取 settings
 */
import { render } from 'preact';
import { Notice, Plugin } from 'obsidian';
import { container } from 'tsyringe';
import { CODEBLOCK_LANG } from '@/core/types/constants';
import { DataStore } from '@core/services/DataStore';
import { getZustandState, STORE_TOKEN, type AppStoreInstance } from '@/app/store/useAppStore';
import { RendererService } from '@/features/settings/RendererService';
import type { Layout } from '@/core/types/schema';
import type { ActionService } from '@core/services/ActionService';

export class CodeblockEmbedder {
    // P0-3: store 从 DI 获取
    private store: AppStoreInstance;
    
    constructor(
        private plugin: Plugin,
        private dataStore: DataStore,
        private rendererService: RendererService,
        private actionService: ActionService,
    ) {
        // P0-3: 从 DI 容器获取 store
        this.store = container.resolve<AppStoreInstance>(STORE_TOKEN);
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
                    console.warn('ThinkPlugin: 代码块内容解析失败', e);
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
