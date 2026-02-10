/** @jsxImportSource preact */
import { h } from 'preact';
import type { RefObject } from 'preact';
import { Box, Typography } from '@mui/material';
import ChatIcon from '@mui/icons-material/Chat';
import { ModalHeader } from '@shared/public';
import type { ChatMessage, ChatSession, ThemeDefinition } from '@core/public';
import { FiltersBar, type BlockDefinition } from './components/FiltersBar';
import { SessionList } from './components/SessionList';
import { ChatMessages } from './components/ChatMessages';
import { ChatComposer } from './components/ChatComposer';

export interface AiChatModalViewProps {
    closeModal: () => void;

    // sessions
    sessions: ChatSession[];
    currentSessionId: string | null;
    currentSessionTitle: string | null;
    onNewSession: () => void;
    onSelectSession: (sessionId: string) => void;
    onDeleteSession: (sessionId: string, e: Event) => void;

    // filters
    enableRetrieval: boolean;
    setEnableRetrieval: (enabled: boolean) => void;
    themes: ThemeDefinition[];
    selectedThemes: string[];
    setSelectedThemes: (themes: string[]) => void;
    selectedType: string;
    setSelectedType: (t: string) => void;
    blocks: BlockDefinition[];
    selectedBlockId: string;
    setSelectedBlockId: (id: string) => void;
    indexItemCount: number;

    // messages
    messages: ChatMessage[];
    isLoading: boolean;
    messagesEndRef: RefObject<HTMLDivElement>;

    // error
    error: string | null;

    // composer
    inputText: string;
    setInputText: (t: string) => void;
    onKeyDown: (e: KeyboardEvent) => void;
    onSend: () => void;
    composerDisabled: boolean;
    composerPlaceholder: string;

    emptyHint: {
        title: string;
        retrievalHint?: string;
    };
}

export function AiChatModalView(props: AiChatModalViewProps) {
    const {
                closeModal,
        sessions,
        currentSessionId,
        currentSessionTitle,
        onNewSession,
        onSelectSession,
        onDeleteSession,
        enableRetrieval,
        setEnableRetrieval,
        themes,
        selectedThemes,
        setSelectedThemes,
        selectedType,
        setSelectedType,
        blocks,
        selectedBlockId,
        setSelectedBlockId,
        indexItemCount,
        messages,
        isLoading,
        messagesEndRef,
        error,
        inputText,
        setInputText,
        onKeyDown,
        onSend,
        composerDisabled,
        composerPlaceholder,
        emptyHint,
    } = props;

    return (
        <Box sx={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
            {/* 左侧：会话列表 */}
            <SessionList
                sessions={sessions}
                currentSessionId={currentSessionId}
                onNewSession={onNewSession}
                onSelectSession={onSelectSession}
                onDeleteSession={onDeleteSession}
            />

            {/* 右侧：聊天区域 */}
            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                {/* 头部 */}
                <ModalHeader
                    padding={1.5}
                    left={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <ChatIcon color="primary" />
                            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                                {currentSessionTitle ?? 'AI 助手'}
                            </Typography>
                        </Box>
                    }
                    onClose={closeModal}
                />

                {/* 过滤器栏 */}
                <FiltersBar
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
                    indexItemCount={indexItemCount}
                />

                {/* 消息区域 */}
                <ChatMessages
                        messages={messages}
                    isLoading={isLoading}
                    emptyHint={emptyHint}
                    enableRetrieval={enableRetrieval}
                    messagesEndRef={messagesEndRef}
                />

                {/* 错误提示 */}
                {error && (
                    <Box sx={{ px: 2, pb: 1 }}>
                        <Typography color="error" variant="body2">
                            {error}
                        </Typography>
                    </Box>
                )}

                {/* 输入区域 */}
                <ChatComposer
                    inputText={inputText}
                    setInputText={setInputText}
                    onKeyDown={onKeyDown}
                    onSend={onSend}
                    isLoading={isLoading}
                    disabled={composerDisabled}
                    placeholder={composerPlaceholder}
                />
            </Box>
        </Box>
    );
}
