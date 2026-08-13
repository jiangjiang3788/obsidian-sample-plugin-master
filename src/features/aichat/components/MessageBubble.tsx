/** @jsxImportSource preact */
import { useEffect, useRef, useState } from 'preact/hooks';
import { CheckIcon, ContentCopyIcon, ThinkIconButton } from '@shared/ui/public';
import type { ChatMessage } from '@core/ai/public';
import type { MessageContentType } from '@core/ports/public';
import { dayjs, devError } from '@core/utils/public';
import { useMessageRenderPort } from '@/app/public';

export interface MessageBubbleProps { message: ChatMessage }

export function MessageBubble({ message }: MessageBubbleProps) {
    const isUser = message.role === 'user';
    const isSystem = message.role === 'system';
    const contentRef = useRef<HTMLDivElement>(null);
    const renderPort = useMessageRenderPort();
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(message.content);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 2000);
        } catch (error) {
            devError('复制失败:', error);
        }
    };

    const contentType: MessageContentType = message.contentType ?? (isUser ? 'plain' : 'markdown');

    useEffect(() => {
        if (!contentRef.current) return;
        renderPort.renderMessage({
            containerEl: contentRef.current,
            content: message.content,
            contentType: contentType === 'plain' ? 'plain' : 'markdown',
            sourcePath: '',
            cls: 'message-content',
        }).catch((error: unknown) => devError('MessageBubble: 渲染失败', error));

        return () => {
            if (contentRef.current) renderPort.clear(contentRef.current);
        };
    }, [message.content, message.id, contentType, renderPort]);

    const classes = [
        'think-ai-message',
        isUser ? 'is-user' : '',
        isSystem ? 'is-system' : 'is-assistant',
    ].filter(Boolean).join(' ');

    return (
        <div className={classes}>
            <div className="think-ai-message__surface">
                <ThinkIconButton
                    className="think-ai-message__copy"
                    label={copied ? '已复制' : '复制'}
                    size="sm"
                    icon={copied ? <CheckIcon fontSize="small" /> : <ContentCopyIcon fontSize="small" />}
                    onClick={handleCopy}
                />
                <div ref={contentRef} className="think-ai-message__content" />
                <div className="think-ai-message__meta">
                    <time>{dayjs(message.created).format('HH:mm')}</time>
                    {message.meta?.retrievalCount && message.meta.retrievalCount > 0
                        ? <span title={`基于 ${message.meta.retrievalCount} 条记录回答`}>引用 {message.meta.retrievalCount}</span>
                        : null}
                </div>
            </div>
        </div>
    );
}
