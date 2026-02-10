// src/platform/ObsidianMessageRenderPort.ts
import { App, MarkdownRenderer, Component } from 'obsidian';
import type { MessageRenderPort, RenderMessageArgs } from '@core/public';
import { devWarn } from '@core/public';

export class ObsidianMessageRenderPort implements MessageRenderPort {
  constructor(private app: App) {}

  clear(containerEl: HTMLElement): void {
    containerEl.empty();
  }

  async renderMessage(args: RenderMessageArgs): Promise<void> {
    const {
      containerEl,
      content,
      contentType = 'markdown',
      sourcePath = '',
      cls,
    } = args;

    this.clear(containerEl);
    if (cls) containerEl.addClass(cls);

    if (contentType === 'plain') {
      const pre = containerEl.createEl('div', { cls: 'message-render-plain' });
      pre.style.whiteSpace = 'pre-wrap';
      pre.style.wordBreak = 'break-word';
      pre.textContent = content;
      return;
    }

    const wrapper = containerEl.createDiv({ cls: 'message-render-markdown' });
    const renderComponent = new Component();
    renderComponent.load();
    try {
      await MarkdownRenderer.render(this.app, content, wrapper, sourcePath, renderComponent);
    } catch (e) {
      devWarn('MessageRenderPort: Markdown 渲染失败，降级为纯文本', e);
      this.clear(containerEl);
      const pre = containerEl.createEl('div', { cls: 'message-render-plain' });
      pre.style.whiteSpace = 'pre-wrap';
      pre.style.wordBreak = 'break-word';
      pre.textContent = content;
    } finally {
      renderComponent.unload();
    }
  }
}
