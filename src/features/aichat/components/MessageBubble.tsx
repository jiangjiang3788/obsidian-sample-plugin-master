/** @jsxImportSource preact */
import { h } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { Box, Chip, Paper, Tooltip, Typography } from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckIcon from '@mui/icons-material/Check';

import { IconAction } from '@shared/public';
import type { ChatMessage, MessageContentType } from '@core/public';
import { devError, dayjs } from '@core/public';
import { useMessageRenderPort } from '@/app/public';

export interface MessageBubbleProps {
    message: ChatMessage;
  }

export function MessageBubble({ message }: MessageBubbleProps) {
    const isUser = message.role === 'user';
    const isSystem = message.role === 'system';
    const contentRef = useRef<HTMLDivElement>(null);
    const renderPort = useMessageRenderPort();
    const [copied, setCopied] = useState(false);

    // 复制消息内容
    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(message.content);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            devError('复制失败:', err);
        }
    };

    // 确定 contentType：优先使用消息自带的，否则按 role 推断
    // 历史数据兼容：assistant/system -> markdown, user -> plain
    const contentType: MessageContentType = message.contentType ?? (message.role === 'user' ? 'plain' : 'markdown');

    // 渲染消息内容
    useEffect(() => {
        if (!contentRef.current) return;


        // 用户消息用纯文本，AI 回复用 Markdown
        renderPort
            .renderMessage({
                containerEl: contentRef.current,
                content: message.content,
                contentType: contentType === 'plain' ? 'plain' : 'markdown',
                sourcePath: '',
                cls: 'message-content',
            })
            .catch((err: unknown) => {
                devError('MessageBubble: 渲染失败', err);
            });

        // 组件卸载时清理
        return () => {
            if (contentRef.current) {
                renderPort.clear(contentRef.current);
            }
        };
    }, [message.content, message.id, contentType, renderPort]);

    return (
        <Box sx={{ display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start' }}>
            <Paper
                elevation={0}
                sx={{
                    maxWidth: '80%',
                    p: 1.5,
                    borderRadius: 2,
                    bgcolor: isUser ? 'primary.main' : isSystem ? 'warning.light' : 'background.paper',
                    color: isUser ? 'primary.contrastText' : 'text.primary',
                    border: isUser ? 'none' : '1px solid var(--background-modifier-border)',
                    position: 'relative',
                    '&:hover .copy-button': { opacity: 1 },
                    // Markdown 渲染样式
                    '& .message-content': {
                        '& p': { margin: '0.5em 0' },
                        '& p:first-of-type': { marginTop: 0 },
                        '& p:last-of-type': { marginBottom: 0 },
                        '& ul, & ol': { margin: '0.5em 0', paddingLeft: '1.5em' },
                        '& li': { margin: '0.25em 0' },
                        '& code': {
                            backgroundColor: 'rgba(0,0,0,0.1)',
                            padding: '0.1em 0.3em',
                            borderRadius: '3px',
                            fontSize: '0.9em',
                        },
                        '& pre': {
                            backgroundColor: 'rgba(0,0,0,0.1)',
                            padding: '0.5em',
                            borderRadius: '4px',
                            overflow: 'auto',
                            margin: '0.5em 0',
                        },
                        '& pre code': {
                            backgroundColor: 'transparent',
                            padding: 0,
                        },
                        '& blockquote': {
                            borderLeft: '3px solid var(--text-muted)',
                            margin: '0.5em 0',
                            paddingLeft: '0.75em',
                            color: 'var(--text-muted)',
                        },
                        '& h1, & h2, & h3, & h4, & h5, & h6': {
                            margin: '0.75em 0 0.5em',
                            fontWeight: 600,
                        },
                        '& h1': { fontSize: '1.3em' },
                        '& h2': { fontSize: '1.2em' },
                        '& h3': { fontSize: '1.1em' },
                    },
                }}
            >
                {/* 复制按钮 */}
                <IconAction
                    label={copied ? '已复制' : '复制'}
                    onClick={handleCopy}
                    icon={copied ? <CheckIcon fontSize="small" color="success" /> : <ContentCopyIcon fontSize="small" />}
                    sx={{
                        position: 'absolute',
                        top: 4,
                        right: 4,
                        opacity: 0,
                        transition: 'opacity 0.2s',
                        bgcolor: 'background.paper',
                        boxShadow: 1,
                        '&:hover': { bgcolor: 'action.hover' },
                    }}
                />

                {/* 消息内容容器 */}
                <Box
                    ref={contentRef}
                    sx={{
                        wordBreak: 'break-word',
                        fontSize: '0.875rem',
                        lineHeight: 1.5,
                        userSelect: 'text',
                    }}
                />

                {/* 元信息 */}
                <Box
                    sx={{
                        mt: 0.5,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        opacity: 0.7,
                    }}
                >
                    <Typography variant="caption">{dayjs(message.created).format('HH:mm')}</Typography>
                    {message.meta?.retrievalCount !== undefined && message.meta.retrievalCount > 0 && (
                        <Tooltip title={`基于 ${message.meta.retrievalCount} 条记录回答`}>
                            <Chip
                                size="small"
                                label={`📚 ${message.meta.retrievalCount}`}
                                sx={{ height: 18, fontSize: '0.7rem' }}
                            />
                        </Tooltip>
                    )}
                </Box>
            </Paper>
        </Box>
    );
}
