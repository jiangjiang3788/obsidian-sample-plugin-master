// src/features/aichat/AiChatModal.tsx
/** @jsxImportSource preact */
import { h } from 'preact';
import { useState, useEffect, useRef, useMemo, useCallback } from 'preact/hooks';
import { App, Modal, Component } from 'obsidian';
import { render, unmountComponentAtNode } from 'preact/compat';
import {
    Box,
    Typography,
    IconButton,
    TextField,
    Button,
    List,
    ListItem,
    ListItemButton,
    ListItemText,
    Divider,
    Switch,
    FormControlLabel,
    Chip,
    CircularProgress,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    Stack,
    Paper,
    Tooltip,
    Checkbox,
    Autocomplete,
    Popper,
    ClickAwayListener,
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';
import CloseIcon from '@mui/icons-material/Close';
import ChatIcon from '@mui/icons-material/Chat';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { useStore } from '@/app/AppStore';
import { 
    getChatSessionStore, 
    ChatSession, 
    ChatMessage,
    SessionFilters 
} from '@/core/ai/ChatSessionStore';
import { getAiChatService, ChatResponse } from '@/core/ai/AiChatService';
import { getRetrievalService } from '@/core/ai/RetrievalService';
import type { OpenAIChatMessage } from '@/core/ai/AiHttpClient';
import { dayjs } from '@core/utils/date';
import { getMessageRenderService, MessageContentType } from '@/shared/utils/MessageRenderService';

// 获取全局 app 实例
declare const app: App;

// ============== Modal 包装 ==============

export class AiChatModal extends Modal {
    constructor(app: App) {
        super(app);
    }

    onOpen() {
        this.contentEl.empty();
        this.modalEl.addClass('think-ai-chat-modal');
        this.modalEl.style.width = '90vw';
        this.modalEl.style.maxWidth = '1000px';
        this.modalEl.style.height = '85vh';

        // 阻止 Modal 拦截输入事件
        this.contentEl.addEventListener('keydown', (e) => {
            e.stopPropagation();
        });

        render(
            <AiChatModalContent app={this.app} closeModal={() => this.close()} />,
            this.contentEl
        );
    }

    onClose() {
        unmountComponentAtNode(this.contentEl);
    }
}

// ============== 主组件 ==============

interface AiChatModalContentProps {
    app: App;
    closeModal: () => void;
}

function AiChatModalContent({ app, closeModal }: AiChatModalContentProps) {
    const settings = useStore(state => state.settings);
    const themes = settings.inputSettings?.themes ?? [];
    const blocks = settings.inputSettings?.blocks ?? [];
    const aiSettings = settings.aiSettings;

    // 构建主题树结构
    const themeTree = useMemo(() => {
        const tree: { path: string; depth: number; children: string[] }[] = [];
        const pathSet = new Set(themes.map(t => t.path));
        
        // 按路径排序
        const sortedPaths = [...pathSet].sort();
        
        sortedPaths.forEach(path => {
            const parts = path.split('/');
            const depth = parts.length - 1;
            // 找到所有子主题
            const children = sortedPaths.filter(p => p.startsWith(path + '/'));
            tree.push({ path, depth, children });
        });
        
        return tree;
    }, [themes]);

    // 会话状态
    const sessionStore = useMemo(() => getChatSessionStore(), []);
    const [sessions, setSessions] = useState<ChatSession[]>([]);
    const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);

    // 输入状态
    const [inputText, setInputText] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // 过滤器状态
    const [enableRetrieval, setEnableRetrieval] = useState(true);
    const [selectedThemes, setSelectedThemes] = useState<string[]>([]); // 多选主题
    const [selectedType, setSelectedType] = useState<string>(''); // 'task' | '' (全部)
    const [selectedBlockId, setSelectedBlockId] = useState<string>(''); // Block 模板 ID

    // 主题选择器展开状态
    const [themePopperOpen, setThemePopperOpen] = useState(false);
    const themeAnchorRef = useRef<HTMLDivElement>(null);

    // 滚动引用
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // 加载会话列表
    const loadSessions = () => {
        const list = sessionStore.getRecentSessions(20);
        setSessions(list);
    };

    // 初始化
    useEffect(() => {
        loadSessions();
        
        // 订阅变化
        const unsubscribe = sessionStore.subscribe(() => {
            loadSessions();
            if (currentSessionId) {
                setMessages(sessionStore.getMessages(currentSessionId));
            }
        });

        // 确保检索索引已构建
        const retrievalService = getRetrievalService();
        if (retrievalService.needsRebuild()) {
            console.log('AiChatModal: 构建检索索引...');
            retrievalService.buildIndex();
        }

        return unsubscribe;
    }, []);

    // 当前会话变化时加载消息
    useEffect(() => {
        if (currentSessionId) {
            setMessages(sessionStore.getMessages(currentSessionId));
        } else {
            setMessages([]);
        }
    }, [currentSessionId]);

    // 自动滚动到底部
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // 创建新会话
    const handleNewSession = () => {
        const filters: SessionFilters = {};
        if (selectedThemes.length > 0) filters.themePaths = selectedThemes;
        if (selectedType) filters.types = [selectedType as 'task' | 'block'];
        if (selectedBlockId) filters.blockTemplateIds = [selectedBlockId];

        const session = sessionStore.createSession(undefined, filters);
        setCurrentSessionId(session.id);
        setInputText('');
        setError(null);
    };

    // 选择会话
    const handleSelectSession = (sessionId: string) => {
        setCurrentSessionId(sessionId);
        setError(null);

        // 恢复会话的过滤器
        const session = sessionStore.getSession(sessionId);
        if (session?.filters) {
            setSelectedThemes(session.filters.themePaths ?? []);
            setSelectedType(session.filters.types?.[0] ?? '');
            setSelectedBlockId(session.filters.blockTemplateIds?.[0] ?? '');
        }
    };

    // 切换主题选择
    const handleThemeToggle = (path: string) => {
        setSelectedThemes(prev => {
            if (prev.includes(path)) {
                // 移除该主题及其子主题
                return prev.filter(p => p !== path && !p.startsWith(path + '/'));
            } else {
                // 添加该主题
                return [...prev, path];
            }
        });
    };

    // 选择主题及其所有子主题
    const handleThemeSelectWithChildren = (path: string) => {
        const childPaths = themeTree
            .filter(t => t.path.startsWith(path + '/'))
            .map(t => t.path);
        
        setSelectedThemes(prev => {
            const allPaths = [path, ...childPaths];
            const hasAll = allPaths.every(p => prev.includes(p));
            
            if (hasAll) {
                // 全部取消
                return prev.filter(p => !allPaths.includes(p));
            } else {
                // 全部添加
                return [...new Set([...prev, ...allPaths])];
            }
        });
    };

    // 删除会话
    const handleDeleteSession = (sessionId: string, e: Event) => {
        e.stopPropagation();
        sessionStore.deleteSession(sessionId);
        if (currentSessionId === sessionId) {
            setCurrentSessionId(null);
        }
    };

    // 发送消息
    const handleSend = async () => {
        if (!inputText.trim() || isLoading) return;

        // 确保有当前会话
        let sessionId = currentSessionId;
        if (!sessionId) {
            const session = sessionStore.createSession();
            sessionId = session.id;
            setCurrentSessionId(sessionId);
        }

        const userMessage = inputText.trim();
        setInputText('');
        setError(null);
        setIsLoading(true);

        // 添加用户消息
        sessionStore.appendMessage(sessionId, 'user', userMessage);

        try {
            const chatService = getAiChatService();
            
            // 构建历史消息
            const currentMessages = sessionStore.getMessages(sessionId);
            const history: OpenAIChatMessage[] = currentMessages
                .filter(m => m.role !== 'system')
                .slice(0, -1) // 排除刚添加的用户消息
                .map(m => ({ role: m.role, content: m.content }));

            // 构建过滤器
            const filters: any = {};
            if (selectedThemes.length > 0) filters.themePaths = selectedThemes;
            if (selectedType) filters.types = [selectedType];
            if (selectedBlockId) filters.blockTemplateIds = [selectedBlockId];

            // 发送请求
            const response: ChatResponse = await chatService.chat({
                userMessage,
                history,
                enableRetrieval,
                retrievalFilters: filters,
                retrievalLimit: 10,
            });

            // 添加 AI 回复
            sessionStore.appendMessage(sessionId, 'assistant', response.content, {
                referencedItemIds: response.referencedItemIds,
                model: response.model,
                retrievalCount: response.retrievalCount,
            });

        } catch (e: any) {
            console.error('AiChatModal: 发送失败', e);
            setError(e.message || '发送失败');
            // 添加错误消息
            sessionStore.appendMessage(sessionId, 'system', `❌ 错误: ${e.message || '发送失败'}`);
        } finally {
            setIsLoading(false);
        }
    };

    // 处理按键
    const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    // 当前会话
    const currentSession = currentSessionId ? sessionStore.getSession(currentSessionId) : null;

    // AI 未启用提示
    if (!aiSettings?.enabled) {
        return (
            <Box sx={{ p: 4, textAlign: 'center' }}>
                <Typography variant="h6" gutterBottom>AI 功能未启用</Typography>
                <Typography color="text.secondary">
                    请在设置中启用 AI 功能并配置 API 密钥
                </Typography>
                <Button variant="outlined" onClick={closeModal} sx={{ mt: 2 }}>
                    关闭
                </Button>
            </Box>
        );
    }

    return (
        <Box sx={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
            {/* 左侧：会话列表 */}
            <Box sx={{
                width: '240px',
                borderRight: '1px solid var(--background-modifier-border)',
                display: 'flex',
                flexDirection: 'column',
                flexShrink: 0,
            }}>
                {/* 新建会话按钮 */}
                <Box sx={{ p: 1.5 }}>
                    <Button
                        fullWidth
                        variant="contained"
                        startIcon={<AddIcon />}
                        onClick={handleNewSession}
                        size="small"
                    >
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
                                onClick={() => handleSelectSession(session.id)}
                                sx={{ py: 1, pr: 1 }}
                            >
                                <ListItemText
                                    primary={
                                        <Typography variant="body2" noWrap sx={{ fontWeight: currentSessionId === session.id ? 600 : 400 }}>
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
                                    onClick={(e: any) => handleDeleteSession(session.id, e)}
                                    sx={{ opacity: 0.5, '&:hover': { opacity: 1 } }}
                                >
                                    <DeleteIcon fontSize="small" />
                                </IconButton>
                            </ListItemButton>
                        ))
                    )}
                </List>
            </Box>

            {/* 右侧：聊天区域 */}
            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                {/* 头部 */}
                <Box sx={{
                    p: 1.5,
                    borderBottom: '1px solid var(--background-modifier-border)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <ChatIcon color="primary" />
                        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                            {currentSession?.title ?? 'AI 助手'}
                        </Typography>
                    </Box>
                    <IconButton onClick={closeModal} size="small">
                        <CloseIcon />
                    </IconButton>
                </Box>

                {/* 过滤器栏 */}
                <Box sx={{
                    p: 1.5,
                    borderBottom: '1px solid var(--background-modifier-border)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                    flexWrap: 'wrap',
                }}>
                    {/* 上下文检索开关 */}
                    <FormControlLabel
                        control={
                            <Switch
                                checked={enableRetrieval}
                                onChange={(e: any) => setEnableRetrieval(e.target.checked)}
                                size="small"
                            />
                        }
                        label={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <SearchIcon fontSize="small" />
                                <Typography variant="body2">引用上下文</Typography>
                            </Box>
                        }
                    />

                    {/* 主题过滤 - 多选下拉 */}
                    {enableRetrieval && themes.length > 0 && (
                        <Box ref={themeAnchorRef}>
                            <Button
                                size="small"
                                variant="outlined"
                                onClick={() => setThemePopperOpen(!themePopperOpen)}
                                endIcon={themePopperOpen ? <ExpandMoreIcon /> : <ChevronRightIcon />}
                                sx={{ textTransform: 'none' }}
                            >
                                主题 {selectedThemes.length > 0 ? `(${selectedThemes.length})` : ''}
                            </Button>
                            <Popper
                                open={themePopperOpen}
                                anchorEl={themeAnchorRef.current}
                                placement="bottom-start"
                                sx={{ zIndex: 1300 }}
                            >
                                <ClickAwayListener onClickAway={() => setThemePopperOpen(false)}>
                                    <Paper sx={{ 
                                        maxHeight: 300, 
                                        overflow: 'auto', 
                                        minWidth: 200,
                                        p: 1,
                                        border: '1px solid var(--background-modifier-border)',
                                    }}>
                                        {/* 全选/清空 */}
                                        <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                                            <Button 
                                                size="small" 
                                                onClick={() => setSelectedThemes(themes.map(t => t.path))}
                                            >
                                                全选
                                            </Button>
                                            <Button 
                                                size="small" 
                                                onClick={() => setSelectedThemes([])}
                                            >
                                                清空
                                            </Button>
                                        </Box>
                                        <Divider sx={{ mb: 1 }} />
                                        {/* 主题树列表 */}
                                        {themeTree.map(item => (
                                            <Box 
                                                key={item.path}
                                                sx={{ 
                                                    display: 'flex', 
                                                    alignItems: 'center',
                                                    pl: item.depth * 2,
                                                }}
                                            >
                                                <Checkbox
                                                    size="small"
                                                    checked={selectedThemes.includes(item.path)}
                                                    onChange={() => handleThemeToggle(item.path)}
                                                />
                                                <Typography 
                                                    variant="body2" 
                                                    sx={{ 
                                                        cursor: 'pointer',
                                                        flex: 1,
                                                    }}
                                                    onClick={() => handleThemeToggle(item.path)}
                                                >
                                                    {item.path.split('/').pop()}
                                                </Typography>
                                                {item.children.length > 0 && (
                                                    <Tooltip title="包含子主题">
                                                        <IconButton 
                                                            size="small"
                                                            onClick={() => handleThemeSelectWithChildren(item.path)}
                                                        >
                                                            <ExpandMoreIcon fontSize="small" />
                                                        </IconButton>
                                                    </Tooltip>
                                                )}
                                            </Box>
                                        ))}
                                    </Paper>
                                </ClickAwayListener>
                            </Popper>
                        </Box>
                    )}

                    {/* 类型过滤 */}
                    {enableRetrieval && (
                        <FormControl size="small" sx={{ minWidth: 100 }}>
                            <InputLabel>类型</InputLabel>
                            <Select
                                value={selectedType}
                                label="类型"
                                onChange={(e: any) => setSelectedType(e.target.value)}
                            >
                                <MenuItem value="">全部</MenuItem>
                                <MenuItem value="task">任务</MenuItem>
                                <MenuItem value="block">记录</MenuItem>
                            </Select>
                        </FormControl>
                    )}

                    {/* Block 模板过滤 (当选择"记录"类型时显示) */}
                    {enableRetrieval && selectedType === 'block' && blocks.length > 0 && (
                        <FormControl size="small" sx={{ minWidth: 120 }}>
                            <InputLabel>记录类型</InputLabel>
                            <Select
                                value={selectedBlockId}
                                label="记录类型"
                                onChange={(e: any) => setSelectedBlockId(e.target.value)}
                            >
                                <MenuItem value="">全部记录</MenuItem>
                                {blocks.map(b => (
                                    <MenuItem key={b.id} value={b.id}>{b.name}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    )}

                    {/* 已选主题标签 */}
                    {enableRetrieval && selectedThemes.length > 0 && (
                        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                            {selectedThemes.slice(0, 3).map(path => (
                                <Chip
                                    key={path}
                                    size="small"
                                    label={path.split('/').pop()}
                                    onDelete={() => handleThemeToggle(path)}
                                    sx={{ height: 24 }}
                                />
                            ))}
                            {selectedThemes.length > 3 && (
                                <Chip
                                    size="small"
                                    label={`+${selectedThemes.length - 3}`}
                                    sx={{ height: 24 }}
                                />
                            )}
                        </Box>
                    )}

                    {/* 索引状态 */}
                    {enableRetrieval && (
                        <Chip
                            size="small"
                            label={`索引: ${getRetrievalService().getIndexStats().itemCount} 条`}
                            variant="outlined"
                        />
                    )}
                </Box>

                {/* 消息区域 */}
                <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
                    {messages.length === 0 ? (
                        <Box sx={{ textAlign: 'center', py: 4 }}>
                            <ChatIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
                            <Typography color="text.secondary">
                                {currentSession ? '开始新的对话' : '选择或创建一个对话'}
                            </Typography>
                            {enableRetrieval && (
                                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                                    已启用上下文检索，AI 将基于你的记录回答问题
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

                {/* 错误提示 */}
                {error && (
                    <Box sx={{ px: 2, pb: 1 }}>
                        <Typography color="error" variant="body2">
                            {error}
                        </Typography>
                    </Box>
                )}

                {/* 输入区域 */}
                <Box sx={{
                    p: 2,
                    borderTop: '1px solid var(--background-modifier-border)',
                    display: 'flex',
                    gap: 1,
                }}>
                    <TextField
                        fullWidth
                        multiline
                        maxRows={4}
                        placeholder={currentSession ? '输入消息...' : '选择或创建对话后开始'}
                        value={inputText}
                        onChange={(e: any) => setInputText(e.target.value)}
                        onKeyDown={handleKeyDown}
                        disabled={isLoading || !currentSession}
                        size="small"
                    />
                    <Button
                        variant="contained"
                        onClick={handleSend}
                        disabled={!inputText.trim() || isLoading || !currentSession}
                        sx={{ minWidth: 'auto', px: 2 }}
                    >
                        <SendIcon />
                    </Button>
                </Box>
            </Box>
        </Box>
    );
}

// ============== 消息气泡组件 ==============

interface MessageBubbleProps {
    message: ChatMessage;
    app: App;
}

function MessageBubble({ message, app }: MessageBubbleProps) {
    const isUser = message.role === 'user';
    const isSystem = message.role === 'system';
    const contentRef = useRef<HTMLDivElement>(null);

    // 确定 contentType：优先使用消息自带的，否则按 role 推断
    // 历史数据兼容：assistant/system -> markdown, user -> plain
    const contentType: MessageContentType = message.contentType 
        ?? (message.role === 'user' ? 'plain' : 'markdown');

    // 渲染消息内容
    useEffect(() => {
        if (!contentRef.current) return;

        const renderService = getMessageRenderService();
        
        // 用户消息用纯文本，AI 回复用 Markdown
        renderService.renderMessage({
            app,
            containerEl: contentRef.current,
            content: message.content,
            contentType,
            sourcePath: '',
            cls: 'message-content',
        }).catch(err => {
            console.error('MessageBubble: 渲染失败', err);
        });

        // 组件卸载时清理
        return () => {
            if (contentRef.current) {
                renderService.clear(contentRef.current);
            }
        };
    }, [message.content, message.id, contentType, app]);

    return (
        <Box sx={{
            display: 'flex',
            justifyContent: isUser ? 'flex-end' : 'flex-start',
        }}>
            <Paper
                elevation={0}
                sx={{
                    maxWidth: '80%',
                    p: 1.5,
                    borderRadius: 2,
                    bgcolor: isUser 
                        ? 'primary.main' 
                        : isSystem 
                            ? 'warning.light' 
                            : 'background.paper',
                    color: isUser ? 'primary.contrastText' : 'text.primary',
                    border: isUser ? 'none' : '1px solid var(--background-modifier-border)',
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
                {/* 消息内容容器 */}
                <Box 
                    ref={contentRef}
                    sx={{ 
                        wordBreak: 'break-word',
                        fontSize: '0.875rem',
                        lineHeight: 1.5,
                    }}
                />
                
                {/* 元信息 */}
                <Box sx={{ 
                    mt: 0.5, 
                    display: 'flex', 
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    opacity: 0.7,
                }}>
                    <Typography variant="caption">
                        {dayjs(message.created).format('HH:mm')}
                    </Typography>
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
