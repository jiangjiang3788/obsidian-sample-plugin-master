// src/features/aiinput/AiTextPromptModal.tsx
/** @jsxImportSource preact */
import { useState } from 'preact/hooks';
import { App, Modal } from 'obsidian';
import { ModalHeader, SmartToyIcon, ThinkButton, ThinkTextarea } from '@shared/ui/public';
import { installBackdropCloseGuard } from './modalBackdropGuard';
import { prepareThinkModal, renderModalContent, unmountModalContent } from './modalPreact';

interface AiTextPromptFormProps {
    onSubmit: (text: string) => void;
    onCancel: () => void;
    isLoading?: boolean;
}

function AiTextPromptForm({ onSubmit, onCancel, isLoading }: AiTextPromptFormProps) {
    const [text, setText] = useState('');
    const handleSubmit = () => {
        const value = text.trim();
        if (value) onSubmit(value);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
        if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
            event.preventDefault();
            handleSubmit();
        }
        if (event.key === 'Escape') {
            event.preventDefault();
            onCancel();
        }
    };

    return (
        <div className="think-overlay-form think-ai-prompt">
            <ModalHeader
                left={<div className="think-overlay-title-row"><SmartToyIcon fontSize="small" /><span>AI 快速记录</span></div>}
                onClose={onCancel}
            />
            <div className="think-overlay-body think-ai-prompt__body">
                <ThinkTextarea
                    autoFocus
                    rows={5}
                    value={text}
                    disabled={isLoading}
                    className="think-ai-prompt__input"
                    placeholder="例如：今天早上 9 点到 11 点学习英语，感觉很好"
                    onInput={(event) => setText((event.currentTarget as HTMLTextAreaElement).value)}
                    onKeyDown={handleKeyDown as any}
                />
            </div>
            <div className="think-overlay-footer">
                <ThinkButton onClick={onCancel} disabled={isLoading}>取消</ThinkButton>
                <ThinkButton variant="primary" loading={isLoading} onClick={handleSubmit} disabled={!text.trim()}>
                    {isLoading ? '解析中' : '解析'}
                </ThinkButton>
            </div>
        </div>
    );
}

export class AiTextPromptModal extends Modal {
    private cleanupBackdropCloseGuard: (() => void) | null = null;
    private resolvePromise: ((value: string | null) => void) | null = null;
    private isLoading = false;

    constructor(app: App) { super(app); }

    openAndGetValue(): Promise<string | null> {
        return new Promise((resolve) => {
            this.resolvePromise = resolve;
            this.open();
        });
    }

    setLoading(loading: boolean) {
        this.isLoading = loading;
        this.renderContent();
    }

    onOpen() {
        prepareThinkModal(this, 'think-modal-host--medium', 'think-ai-prompt-modal');
        this.cleanupBackdropCloseGuard = installBackdropCloseGuard(this);
        this.renderContent();
    }

    private renderContent() {
        this.contentEl.empty();
        renderModalContent(this.contentEl, (
            <AiTextPromptForm
                onSubmit={(text) => {
                    this.resolvePromise?.(text);
                    this.resolvePromise = null;
                    this.close();
                }}
                onCancel={() => {
                    this.resolvePromise?.(null);
                    this.resolvePromise = null;
                    this.close();
                }}
                isLoading={this.isLoading}
            />
        ));
    }

    onClose() {
        this.cleanupBackdropCloseGuard?.();
        this.cleanupBackdropCloseGuard = null;
        this.resolvePromise?.(null);
        this.resolvePromise = null;
        unmountModalContent(this.contentEl);
    }
}
