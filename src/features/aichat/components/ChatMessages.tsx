/** @jsxImportSource preact */
import type { RefObject } from 'preact';
import { ChatIcon } from '@shared/ui/public';
import type { ChatMessage } from '@core/ai/public';
import { MessageBubble } from './MessageBubble';

export interface ChatMessagesProps {
    messages: ChatMessage[];
    isLoading: boolean;
    emptyHint: { title: string; retrievalHint?: string };
    enableRetrieval: boolean;
    messagesEndRef: RefObject<HTMLDivElement>;
}

export function ChatMessages({ messages, isLoading, emptyHint, enableRetrieval, messagesEndRef }: ChatMessagesProps) {
    return (
        <div className="think-ai-chat-messages">
            {messages.length === 0 ? (
                <div className="think-ai-chat-empty">
                    <ChatIcon fontSize="large" />
                    <strong>{emptyHint.title}</strong>
                    {enableRetrieval && emptyHint.retrievalHint ? <span>{emptyHint.retrievalHint}</span> : null}
                </div>
            ) : (
                <div className="think-ai-chat-messages__stack">
                    {messages.map((msg) => <MessageBubble key={msg.id} message={msg} />)}
                    {isLoading ? (
                        <div className="think-ai-chat-thinking" role="status">
                            <span className="think-overlay-spinner" aria-hidden="true" />
                            <span>AI 正在思考…</span>
                        </div>
                    ) : null}
                </div>
            )}
            <div ref={messagesEndRef} />
        </div>
    );
}
