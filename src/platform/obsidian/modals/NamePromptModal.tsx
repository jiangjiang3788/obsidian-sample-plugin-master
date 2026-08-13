// src/platform/obsidian/modals/NamePromptModal.tsx
/** @jsxImportSource preact */
import { useState } from 'preact/hooks';
import type { App } from 'obsidian';
import { Modal } from 'obsidian';
import { ModalHeader, ThinkButton, ThinkInput } from '@shared/ui/public';
import type { NamePromptOptions } from '@core/ports/public';
import { prepareThinkModal, renderModalContent, unmountModalContent } from './modalPreact';

function PromptComponent({ title, placeholder, ctaText, initialValue, onSubmit, onCancel }: {
  title: string;
  placeholder?: string;
  ctaText?: string;
  initialValue?: string;
  onSubmit: (value: string) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState(initialValue || '');
  const handleConfirm = () => onSubmit(value.trim());
  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Enter') { event.preventDefault(); handleConfirm(); }
    if (event.key === 'Escape') { event.preventDefault(); onCancel(); }
  };

  return (
    <div className="think-overlay-form think-name-prompt">
      <ModalHeader left={<span>{title}</span>} onClose={onCancel} />
      <div className="think-overlay-body think-name-prompt__body">
        <ThinkInput
          autoFocus
          value={value}
          placeholder={placeholder}
          onInput={(event) => setValue((event.currentTarget as HTMLInputElement).value)}
          onKeyDown={handleKeyDown as any}
        />
      </div>
      <div className="think-overlay-footer">
        <ThinkButton onClick={onCancel}>取消</ThinkButton>
        <ThinkButton variant="primary" onClick={handleConfirm}>{ctaText || '确认'}</ThinkButton>
      </div>
    </div>
  );
}

export class NamePromptModal extends Modal {
  private resolvePromise: ((value: string | null) => void) | null = null;

  constructor(app: App, private options: NamePromptOptions) { super(app); }

  openAndGetValue(): Promise<string | null> {
    return new Promise((resolve) => {
      this.resolvePromise = resolve;
      this.open();
    });
  }

  onOpen() {
    prepareThinkModal(this, 'think-modal-host--medium', 'think-name-prompt-modal');
    renderModalContent(this.contentEl, (
      <PromptComponent
        title={this.options.title}
        placeholder={this.options.placeholder}
        ctaText={this.options.ctaText}
        initialValue={this.options.defaultValue}
        onSubmit={(value) => {
          this.resolvePromise?.(value || null);
          this.resolvePromise = null;
          this.close();
        }}
        onCancel={() => {
          this.resolvePromise?.(null);
          this.resolvePromise = null;
          this.close();
        }}
      />
    ));
  }

  onClose() {
    this.resolvePromise?.(null);
    this.resolvePromise = null;
    unmountModalContent(this.contentEl);
  }
}
