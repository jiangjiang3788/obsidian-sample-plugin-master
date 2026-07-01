/** @jsxImportSource preact */
import { h } from 'preact';
import { useEffect, useRef } from 'preact/hooks';
import type { MessageRenderPort, MessageContentType } from '@core/ports/public';

export interface MarkdownContentProps {
  /** Prefer: reuse AI message renderer. Optional so we can degrade gracefully in non-AI views. */
  renderPort?: MessageRenderPort;
  content: string;
  /** 默认 markdown；也可用于 plain（未来复用） */
  contentType?: MessageContentType;
  /** Markdown 渲染需要 sourcePath（可为空字符串） */
  sourcePath?: string;
  className?: string;
  onClick?: (evt: MouseEvent) => void;
  onDblClick?: (evt: MouseEvent) => void;
  onTouchEnd?: (evt: TouchEvent) => void;
}

function renderPlainFallback(containerEl: HTMLElement, content: string): void {
  containerEl.innerHTML = '';
  containerEl.style.whiteSpace = 'pre-wrap';
  containerEl.textContent = content;
}

/**
 * 通用 Markdown/Plain 渲染器。
 *
 * ⚠️ shared 层不依赖 Obsidian（遵守 obsidian-leak gate）。
 * - 有 renderPort：使用同一套渲染逻辑（与 AI chat / BlockView 一致）
 * - renderPort 不存在或渲染失败：退化为 plain text（保留换行），避免单元格空白
 */
export function MarkdownContent({
  renderPort,
  content,
  contentType = 'markdown',
  sourcePath = '',
  className = '',
  onClick,
  onDblClick,
  onTouchEnd,
}: MarkdownContentProps) {
  const elRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const containerEl = elRef.current;
    if (!containerEl) return;

    let disposed = false;
    containerEl.innerHTML = '';
    containerEl.style.whiteSpace = '';

    if (!renderPort) {
      renderPlainFallback(containerEl, content);
      return undefined;
    }

    renderPort
      .renderMessage({
        containerEl,
        content,
        contentType: contentType === 'plain' ? 'plain' : 'markdown',
        sourcePath,
      })
      .catch(() => {
        if (!disposed && elRef.current === containerEl) {
          renderPlainFallback(containerEl, content);
        }
      });

    return () => {
      disposed = true;
      if (elRef.current === containerEl) renderPort.clear(containerEl);
    };
  }, [renderPort, content, contentType, sourcePath]);

  return <div ref={elRef} className={`md-content ${className}`.trim()} onClick={onClick as any} onDblClick={onDblClick as any} onTouchEnd={onTouchEnd as any} />;
}
