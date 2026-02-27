/** @jsxImportSource preact */
import { h } from 'preact';
import { useEffect, useRef } from 'preact/hooks';
import type { MessageRenderPort, MessageContentType } from '@core/public';

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
}

/**
 * 通用 Markdown/Plain 渲染器。
 *
 * ⚠️ shared 层不依赖 Obsidian（遵守 obsidian-leak gate）。
 * - 有 renderPort：使用同一套渲染逻辑（与 AI chat 一致）
 * - 无 renderPort：退化为 plain text（保留换行）
 */
export function MarkdownContent({
  renderPort,
  content,
  contentType = 'markdown',
  sourcePath = '',
  className = '',
  onClick,
}: MarkdownContentProps) {
  const elRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!elRef.current) return;

    // clear
    elRef.current.innerHTML = '';

    if (renderPort) {
      // 不传 cls：避免内部使用 Obsidian addClass 时传入带空格 token。
      renderPort
        .renderMessage({
          containerEl: elRef.current,
          content,
          contentType: contentType === 'plain' ? 'plain' : 'markdown',
          sourcePath,
        })
        .catch(() => {
          // renderPort 自己兜底，这里不额外 console
        });
    } else {
      // last resort: plain text (preserve line breaks)
      elRef.current.style.whiteSpace = 'pre-wrap';
      elRef.current.textContent = content;
    }

    return () => {
      if (elRef.current && renderPort) renderPort.clear(elRef.current);
    };
  }, [renderPort, content, contentType, sourcePath, className]);

  return <div ref={elRef} className={`md-content ${className}`.trim()} onClick={onClick as any} />;
}
