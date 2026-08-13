/** @jsxImportSource preact */
import type { RefObject } from 'preact';
import { ChatIcon, ModalHeader } from '@shared/ui/public';
import type { ChatMessage, ChatSession } from '@core/ai/public';
import type { ThemeDefinition } from '@core/types/public';
import { FiltersBar, type BlockDefinition } from './components/FiltersBar';
import { SessionList } from './components/SessionList';
import { ChatMessages } from './components/ChatMessages';
import { ChatComposer } from './components/ChatComposer';

export interface AiChatModalViewProps {
    closeModal: () => void;
    sessions: ChatSession[];
    currentSessionId: string | null;
    currentSessionTitle: string | null;
    onNewSession: () => void;
    onSelectSession: (sessionId: string) => void;
    onDeleteSession: (sessionId: string, e: Event) => void;
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
    messages: ChatMessage[];
    isLoading: boolean;
    messagesEndRef: RefObject<HTMLDivElement>;
    error: string | null;
    inputText: string;
    setInputText: (t: string) => void;
    onKeyDown: (e: KeyboardEvent) => void;
    onSend: () => void;
    composerDisabled: boolean;
    composerPlaceholder: string;
    emptyHint: { title: string; retrievalHint?: string };
}

export function AiChatModalView(props: AiChatModalViewProps) {
    const {
        closeModal, sessions, currentSessionId, currentSessionTitle, onNewSession, onSelectSession, onDeleteSession,
        enableRetrieval, setEnableRetrieval, themes, selectedThemes, setSelectedThemes, selectedType, setSelectedType,
        blocks, selectedBlockId, setSelectedBlockId, indexItemCount, messages, isLoading, messagesEndRef, error,
        inputText, setInputText, onKeyDown, onSend, composerDisabled, composerPlaceholder, emptyHint,
    } = props;

    return (
        <div className="think-ai-chat">
            <SessionList
                sessions={sessions}
                currentSessionId={currentSessionId}
                onNewSession={onNewSession}
                onSelectSession={onSelectSession}
                onDeleteSession={onDeleteSession}
            />

            <section className="think-ai-chat__main">
                <ModalHeader
                    left={
                        <div className="think-ai-chat__title">
                            <ChatIcon fontSize="small" />
                            <span>{currentSessionTitle ?? 'AI 助手'}</span>
                        </div>
                    }
                    onClose={closeModal}
                />

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

                <ChatMessages
                    messages={messages}
                    isLoading={isLoading}
                    emptyHint={emptyHint}
                    enableRetrieval={enableRetrieval}
                    messagesEndRef={messagesEndRef}
                />

                {error ? <div className="think-ai-chat__error" role="alert">{error}</div> : null}

                <ChatComposer
                    inputText={inputText}
                    setInputText={setInputText}
                    onKeyDown={onKeyDown}
                    onSend={onSend}
                    isLoading={isLoading}
                    disabled={composerDisabled}
                    placeholder={composerPlaceholder}
                />
            </section>
        </div>
    );
}
