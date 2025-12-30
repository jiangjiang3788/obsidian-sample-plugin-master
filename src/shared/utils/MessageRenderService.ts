// src/shared/utils/MessageRenderService.ts
/**
 * MessageRenderService - 消息渲染服务
 * Role: Service (消息内容渲染，支持 Markdown)
 *
 * Do:
 * - 使用 Obsidian 内置 MarkdownRenderer 渲染 Markdown
 * - 提供降级策略（渲染失败时显示纯文本）
 * - 不依赖具体视图组件
 *
 * Don't:
 * - 管理消息状态
 * - 处理 HTML 渲染（安全考虑）
 */

import { App, MarkdownRenderer, Component } from 'obsidian';

// ============== Types ==============

export type MessageContentType = 'markdown' | 'plain' | 'html';

export interface RenderMessageOptions {
    /** Obsidian App 实例 */
    app: App;
    /** 容器元素 */
    containerEl: HTMLElement;
    /** 消息内容 */
    content: string;
    /** 内容类型（默认 markdown） */
    contentType?: MessageContentType;
    /** Markdown 渲染上下文路径（默认 ""） */
    sourcePath?: string;
    /** 容器额外 class（可选） */
    cls?: string;
    /** Component 实例（用于 Obsidian 生命周期管理，可选） */
    component?: Component;
}

// ============== MessageRenderService ==============

export class MessageRenderService {
    /**
     * 清空容器内容
     */
    clear(containerEl: HTMLElement): void {
        containerEl.empty();
    }

    /**
     * 渲染消息内容到容器
     * - markdown: 使用 Obsidian MarkdownRenderer
     * - plain: 纯文本
     * - html: 当前视为 plain（安全考虑）
     *
     * 渲染失败时自动降级为纯文本
     */
    async renderMessage(options: RenderMessageOptions): Promise<void> {
        const {
            app,
            containerEl,
            content,
            contentType = 'markdown',
            sourcePath = '',
            cls,
            component,
        } = options;

        // 1. 清空容器
        this.clear(containerEl);

        // 2. 添加自定义 class
        if (cls) {
            containerEl.addClass(cls);
        }

        // 3. 根据 contentType 渲染
        if (contentType === 'plain' || contentType === 'html') {
            // plain 和 html 当前都视为纯文本
            this.renderPlainText(containerEl, content);
            return;
        }

        // 4. Markdown 渲染（带降级）
        try {
            await this.renderMarkdown(app, containerEl, content, sourcePath, component);
        } catch (e) {
            console.warn('MessageRenderService: Markdown 渲染失败，降级为纯文本', e);
            this.clear(containerEl);
            this.renderPlainText(containerEl, content);
        }
    }

    /**
     * 渲染纯文本
     */
    private renderPlainText(containerEl: HTMLElement, content: string): void {
        const pre = containerEl.createEl('div', {
            cls: 'message-render-plain',
        });
        pre.style.whiteSpace = 'pre-wrap';
        pre.style.wordBreak = 'break-word';
        pre.textContent = content;
    }

    /**
     * 使用 Obsidian MarkdownRenderer 渲染 Markdown
     */
    private async renderMarkdown(
        app: App,
        containerEl: HTMLElement,
        content: string,
        sourcePath: string,
        component?: Component
    ): Promise<void> {
        // 创建渲染容器
        const wrapper = containerEl.createDiv({
            cls: 'message-render-markdown',
        });

        // 使用临时 Component 如果没有提供
        const renderComponent = component ?? new Component();
        
        if (!component) {
            // 临时 Component 需要手动加载
            renderComponent.load();
        }

        try {
            // 调用 Obsidian 的 MarkdownRenderer
            await MarkdownRenderer.render(
                app,
                content,
                wrapper,
                sourcePath,
                renderComponent
            );
        } finally {
            if (!component) {
                // 清理临时 Component
                renderComponent.unload();
            }
        }
    }
}

// ============== 单例导出 ==============

let _instance: MessageRenderService | null = null;

export function getMessageRenderService(): MessageRenderService {
    if (!_instance) {
        _instance = new MessageRenderService();
    }
    return _instance;
}
