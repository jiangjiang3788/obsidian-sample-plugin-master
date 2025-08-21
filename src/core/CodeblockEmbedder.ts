// src/core/CodeblockEmbedder.ts
import { h, render } from 'preact';
import { Notice, Plugin } from 'obsidian';
import { CODEBLOCK_LANG } from '@core/domain/constants';
import { DataStore } from '@core/services/dataStore';
import { LayoutRenderer } from '@features/dashboard/ui/LayoutRenderer';
import { AppStore } from '@state/AppStore';
import { RendererService } from '@core/services/RendererService'; // [修改] 导入新服务
import type { Layout } from '@core/domain/schema';

export class CodeblockEmbedder {
    // [修改] 构造函数依赖注入，不再需要完整的 ThinkPlugin 实例
    constructor(
        private plugin: Plugin, // 只需要 Plugin 基类来注册处理器
        private appStore: AppStore,
        private dataStore: DataStore,
        private rendererService: RendererService,
    ) {
        this.registerProcessor();
    }

    private registerProcessor() {
        this.plugin.registerMarkdownCodeBlockProcessor(
            CODEBLOCK_LANG,
            (source, el, /* ctx */) => {
                // 清理旧的渲染
                try { render(null, el); } catch { }
                el.empty();
                
                let layoutName: string | undefined;

                // 解析代码块内容，获取布局名称
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
                
                // [修改] 从 AppStore 获取最新的布局配置
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

                // [修改] 挂载并注册到 RendererService
                this.mountAndRegister(el, layout);
            },
        );
    }

    /**
     * [修改] 将组件挂载到元素上，并将其注册到 RendererService 进行生命周期管理。
     */
    private mountAndRegister(el: HTMLElement, layout: Layout) {
        // [修改] 调用 RendererService 进行注册和渲染，不再直接操作 activeLayouts 数组
        this.rendererService.register(el, layout);
    }
}