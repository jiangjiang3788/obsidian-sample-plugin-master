/** @jsxImportSource preact */
import { h } from 'preact';
import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
import { Box, Button, Typography } from '@mui/material';
import { selectAiSettings, selectInputSettings, useSelector } from '@/app/public';
import type { OpenAIChatMessage, ChatMessage, ChatSession, SessionFilters } from '@core/public';
import { devError, devLog } from '@core/public';
import type { ChatResponse } from '@core/public';
import { AiChatModalView } from './AiChatModalView';
import type { AiServices } from './types';
import { createTakeLatest, CancelledError, useIsMounted } from '@shared/public';

export interface AiChatModalContainerProps {
    closeModal: () => void;
    services: AiServices;
}

export function AiChatModalContainer({ closeModal, services }: AiChatModalContainerProps) {
    // P0: 使用 Zustand store 作为 SSOT
    const aiSettings = useSelector(selectAiSettings);
    const inputSettings = useSelector(selectInputSettings);
    const themes = inputSettings?.themes ?? [];
    const blocks = inputSettings?.blocks ?? [];
    // 从 props 获取服务（已在 composition root 中 resolve）
    const { chatService, retrievalService, sessionStore } = services;
    const [sessions, setSessions] = useState<ChatSession[]>([]);
    const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);

    // 输入状态
    const [inputText, setInputText] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // takeLatest：新的发送会取消上一次请求；并避免卸载后 setState
    const isMountedRef = useIsMounted();
    const takeLatestRef = useRef(createTakeLatest());

    // 过滤器状态
    const [enableRetrieval, setEnableRetrieval] = useState(true);
    const [selectedThemes, setSelectedThemes] = useState<string[]>([]); // 多选主题
    const [selectedType, setSelectedType] = useState<string>(''); // 'task' | '' (全部)
    const [selectedBlockId, setSelectedBlockId] = useState<string>(''); // Block 模板 ID

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
        if (retrievalService.needsRebuild()) {
            devLog('AiChatModal: 构建检索索引...');
            retrievalService.buildIndex();
        }

        return () => {
            try { unsubscribe(); } catch {}
            // modal 关闭/卸载时取消未完成的请求
            takeLatestRef.current.dispose();
        };
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
    const handleNewSession = async () => {
        const filters: SessionFilters = {};
        if (selectedThemes.length > 0) filters.themePaths = selectedThemes;
        if (selectedType) filters.types = [selectedType as 'task' | 'block'];
        if (selectedBlockId) filters.blockTemplateIds = [selectedBlockId];

        const session = await sessionStore.createSession(undefined, filters);
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

    // 删除会话
    const handleDeleteSession = async (sessionId: string, e: Event) => {
        e.stopPropagation();
        await sessionStore.deleteSession(sessionId);
        if (currentSessionId === sessionId) {
            setCurrentSessionId(null);
        }
    };

    // 发送消息
    const handleSend = useCallback(async () => {
        if (!inputText.trim() || isLoading) return;

        // 确保有当前会话
        let sessionId = currentSessionId;
        if (!sessionId) {
            const session = await sessionStore.createSession();
            sessionId = session.id;
            setCurrentSessionId(sessionId);
        }

        const userMessage = inputText.trim();
        setInputText('');
        setError(null);
        if (isMountedRef.current) setIsLoading(true);

        // 添加用户消息（如果已卸载则不写入）
        if (!isMountedRef.current) return;
        await sessionStore.appendMessage(sessionId, 'user', userMessage);

        try {
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
            const response: ChatResponse = await takeLatestRef.current.run((signal) =>
                chatService.chat(
                    {
                        userMessage,
                        history,
                        enableRetrieval,
                        retrievalFilters: filters,
                        retrievalLimit: 5000,
                    },
                    signal,
                )
            );

            // 添加 AI 回复（如果已卸载则不写入）
            if (!isMountedRef.current) return;
            await sessionStore.appendMessage(sessionId, 'assistant', response.content, {
                referencedItemIds: response.referencedItemIds,
                model: response.model,
                retrievalCount: response.retrievalCount,
            });
        } catch (e: any) {
            // 取消不视为错误（modal 关闭/新请求打断）
            if (e instanceof CancelledError) {
                if (isMountedRef.current) devLog('AiChatModal: 请求已取消');
                return;
            }
            devError('AiChatModal: 发送失败', e);
            if (isMountedRef.current) setError(e.message || '发送失败');
            // 添加错误消息（如果已卸载则不写入）
            if (isMountedRef.current) {
                await sessionStore.appendMessage(sessionId, 'system', `❌ 错误: ${e.message || '发送失败'}`);
            }
        } finally {
            if (isMountedRef.current) setIsLoading(false);
        }
    }, [inputText, isLoading, currentSessionId, selectedThemes, selectedType, selectedBlockId, enableRetrieval]);

    // 处理按键
    const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    // 当前会话
    const currentSession = currentSessionId ? sessionStore.getSession(currentSessionId) : null;
    const currentSessionTitle = currentSession?.title ?? null;

    // AI 未启用提示
    if (!aiSettings?.enabled) {
        return (
            <Box sx={{ p: 4, textAlign: 'center' }}>
                <Typography variant="h6" gutterBottom>
                    AI 功能未启用
                </Typography>
                <Typography color="text.secondary">请在设置中启用 AI 功能并配置 API 密钥</Typography>
                <Button variant="outlined" onClick={closeModal} sx={{ mt: 2 }}>
                    关闭
                </Button>
            </Box>
        );
    }

    const emptyHint = {
        title: currentSession ? '开始新的对话' : '选择或创建一个对话',
        retrievalHint: '已启用上下文检索，AI 将基于你的记录回答问题',
    };

    return (
        <AiChatModalView
            closeModal={closeModal}
            sessions={sessions}
            currentSessionId={currentSessionId}
            currentSessionTitle={currentSessionTitle}
            onNewSession={handleNewSession}
            onSelectSession={handleSelectSession}
            onDeleteSession={handleDeleteSession}
            enableRetrieval={enableRetrieval}
            setEnableRetrieval={setEnableRetrieval}
            themes={themes}
            selectedThemes={selectedThemes}
            setSelectedThemes={setSelectedThemes}
            selectedType={selectedType}
            setSelectedType={setSelectedType}
            blocks={blocks}
            selectedBlockId={selectedBlockId}
            setSelectedBlockId={setSelectedBlockId}
            indexItemCount={retrievalService.getIndexStats().itemCount}
            messages={messages}
            isLoading={isLoading}
            messagesEndRef={messagesEndRef}
            error={error}
            inputText={inputText}
            setInputText={setInputText}
            onKeyDown={handleKeyDown}
            onSend={handleSend}
            composerDisabled={!currentSession}
            composerPlaceholder={currentSession ? '输入消息...' : '选择或创建对话后开始'}
            emptyHint={emptyHint}
        />
    );
}
