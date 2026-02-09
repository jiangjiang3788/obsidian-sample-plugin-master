/** @jsxImportSource preact */
import { h } from 'preact';
import { Box, Button, Divider, IconButton, List, ListItemButton, ListItemText, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import type { ChatSession } from '@core/public';
import { dayjs } from '@core/public';

export interface SessionListProps {
    sessions: ChatSession[];
    currentSessionId: string | null;
    onNewSession: () => void;
    onSelectSession: (sessionId: string) => void;
    onDeleteSession: (sessionId: string, e: Event) => void;
}

export function SessionList({
    sessions,
    currentSessionId,
    onNewSession,
    onSelectSession,
    onDeleteSession,
}: SessionListProps) {
    return (
        <Box
            sx={{
                width: '240px',
                borderRight: '1px solid var(--background-modifier-border)',
                display: 'flex',
                flexDirection: 'column',
                flexShrink: 0,
            }}
        >
            {/* 新建会话按钮 */}
            <Box sx={{ p: 1.5 }}>
                <Button fullWidth variant="contained" startIcon={<AddIcon />} onClick={onNewSession} size="small">
                    新建对话
                </Button>
            </Box>

            <Divider />

            {/* 会话列表 */}
            <List sx={{ flex: 1, overflow: 'auto', py: 0 }}>
                {sessions.length === 0 ? (
                    <Box sx={{ p: 2, textAlign: 'center' }}>
                        <Typography variant="body2" color="text.secondary">
                            暂无对话记录
                        </Typography>
                    </Box>
                ) : (
                    sessions.map(session => (
                        <ListItemButton
                            key={session.id}
                            selected={currentSessionId === session.id}
                            onClick={() => onSelectSession(session.id)}
                            sx={{ py: 1, pr: 1 }}
                        >
                            <ListItemText
                                primary={
                                    <Typography
                                        variant="body2"
                                        noWrap
                                        sx={{ fontWeight: currentSessionId === session.id ? 600 : 400 }}
                                    >
                                        {session.title}
                                    </Typography>
                                }
                                secondary={
                                    <Typography variant="caption" color="text.secondary">
                                        {dayjs(session.modified).format('MM-DD HH:mm')}
                                    </Typography>
                                }
                            />
                            <IconButton
                                size="small"
                                onClick={(e: any) => onDeleteSession(session.id, e)}
                                sx={{ opacity: 0.5, '&:hover': { opacity: 1 } }}
                            >
                                <DeleteIcon fontSize="small" />
                            </IconButton>
                        </ListItemButton>
                    ))
                )}
            </List>
        </Box>
    );
}
