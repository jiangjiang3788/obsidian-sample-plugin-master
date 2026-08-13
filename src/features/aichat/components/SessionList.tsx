/** @jsxImportSource preact */
import { AddIcon, DeleteIcon, ThinkButton, ThinkIconButton } from '@shared/ui/public';
import type { ChatSession } from '@core/ai/public';
import { dayjs } from '@core/utils/public';

export interface SessionListProps {
    sessions: ChatSession[];
    currentSessionId: string | null;
    onNewSession: () => void;
    onSelectSession: (sessionId: string) => void;
    onDeleteSession: (sessionId: string, e: Event) => void;
}

export function SessionList({ sessions, currentSessionId, onNewSession, onSelectSession, onDeleteSession }: SessionListProps) {
    return (
        <aside className="think-ai-chat-sessions" aria-label="AI 对话列表">
            <div className="think-ai-chat-sessions__header">
                <ThinkButton size="sm" leadingIcon={<AddIcon fontSize="small" />} onClick={onNewSession}>新建对话</ThinkButton>
            </div>
            <div className="think-ai-chat-sessions__list">
                {sessions.length === 0 ? (
                    <div className="think-overlay-empty">暂无对话</div>
                ) : sessions.map((session) => {
                    const selected = currentSessionId === session.id;
                    return (
                        <div key={session.id} className={`think-ai-chat-session${selected ? ' is-selected' : ''}`}>
                            <button type="button" className="think-ai-chat-session__select" onClick={() => onSelectSession(session.id)}>
                                <span className="think-ai-chat-session__title">{session.title}</span>
                                <span className="think-ai-chat-session__meta">{dayjs(session.modified).format('MM-DD HH:mm')}</span>
                            </button>
                            <ThinkIconButton
                                label="删除对话"
                                size="sm"
                                tone="danger"
                                className="think-ai-chat-session__delete"
                                icon={<DeleteIcon fontSize="small" />}
                                onClick={(event) => onDeleteSession(session.id, event as unknown as Event)}
                            />
                        </div>
                    );
                })}
            </div>
        </aside>
    );
}
