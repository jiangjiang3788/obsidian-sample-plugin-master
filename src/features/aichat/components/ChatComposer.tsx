/** @jsxImportSource preact */
import { SendIcon, ThinkButton, ThinkTextarea } from '@shared/ui/public';

export interface ChatComposerProps {
    inputText: string;
    setInputText: (text: string) => void;
    onKeyDown: (e: KeyboardEvent) => void;
    onSend: () => void;
    isLoading: boolean;
    disabled: boolean;
    placeholder: string;
}

export function ChatComposer({ inputText, setInputText, onKeyDown, onSend, isLoading, disabled, placeholder }: ChatComposerProps) {
    return (
        <div className="think-ai-chat-composer">
            <ThinkTextarea
                className="think-ai-chat-composer__input"
                rows={2}
                placeholder={placeholder}
                value={inputText}
                onInput={(event) => setInputText((event.currentTarget as HTMLTextAreaElement).value)}
                onKeyDown={onKeyDown as any}
                disabled={isLoading || disabled}
            />
            <ThinkButton
                className="think-ai-chat-composer__send"
                variant="primary"
                size="sm"
                aria-label="发送"
                leadingIcon={<SendIcon fontSize="small" />}
                onClick={onSend}
                disabled={!inputText.trim() || isLoading || disabled}
            >发送</ThinkButton>
        </div>
    );
}
