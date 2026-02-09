/** @jsxImportSource preact */
import { h } from 'preact';
import type { RefObject } from 'preact';
import type { App } from 'obsidian';
import { Box, CircularProgress, Stack, Typography } from '@mui/material';
import ChatIcon from '@mui/icons-material/Chat';
import type { ChatMessage } from '@core/public';
import { MessageBubble } from './MessageBubble';

export interface ChatMessagesProps {
    app: App;
    messages: ChatMessage[];
    isLoading: boolean;
    emptyHint: {
        title: string;
        retrievalHint?: string;
    };
    enableRetrieval: boolean;
    messagesEndRef: RefObject<HTMLDivElement>;
}

export function ChatMessages({
    app,
    messages,
    isLoading,
    emptyHint,
    enableRetrieval,
    messagesEndRef,
}: ChatMessagesProps) {
    return (
        <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
            {messages.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                    <ChatIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
                    <Typography color="text.secondary">{emptyHint.title}</Typography>
                    {enableRetrieval && emptyHint.retrievalHint && (
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                            {emptyHint.retrievalHint}
                        </Typography>
                    )}
                </Box>
            ) : (
                <Stack spacing={2}>
                    {messages.map(msg => (
                        <MessageBubble key={msg.id} message={msg} app={app} />
                    ))}
                    {isLoading && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <CircularProgress size={16} />
                            <Typography variant="body2" color="text.secondary">
                                AI 正在思考...
                            </Typography>
                        </Box>
                    )}
                </Stack>
            )}
            <div ref={messagesEndRef} />
        </Box>
    );
}
