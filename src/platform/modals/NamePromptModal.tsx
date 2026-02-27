// src/platform/modals/NamePromptModal.tsx
/** @jsxImportSource preact */
import { h } from 'preact';
import { render, unmountComponentAtNode } from 'preact/compat';
import { useState } from 'preact/hooks';
import type { App } from 'obsidian';
import { Modal } from 'obsidian';
import { TextField, Button } from '@mui/material';
import type { NamePromptOptions } from '@core/public';

function PromptComponent({
  title,
  placeholder,
  ctaText,
  initialValue,
  onSubmit,
  onCancel,
}: {
  title: string;
  placeholder?: string;
  ctaText?: string;
  initialValue?: string;
  onSubmit: (value: string) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState(initialValue || '');

  const handleConfirm = () => {
    onSubmit(value.trim());
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleConfirm();
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    }
  };

  return (
    <div class="think-modal">
      <h3>{title}</h3>
      <TextField
        autoFocus
        fullWidth
        variant="outlined"
        placeholder={placeholder}
        value={value}
        onChange={(e) => setValue((e.target as HTMLInputElement).value)}
        onKeyDown={handleKeyDown as any}
        sx={{ mt: 2 }}
      />
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem', gap: '8px' }}>
        <Button onClick={handleConfirm} variant="contained">
          {ctaText || '确认'}
        </Button>
        <Button onClick={onCancel}>取消</Button>
      </div>
    </div>
  );
}

/**
 * NamePromptModal
 * - openAndGetValue(): Promise<string|null>
 * - 点击遮罩/右上角 X / Esc 关闭时也会 resolve(null)，避免 Promise 悬挂
 */
export class NamePromptModal extends Modal {
  private resolvePromise: ((value: string | null) => void) | null = null;

  constructor(app: App, private options: NamePromptOptions) {
    super(app);
  }

  openAndGetValue(): Promise<string | null> {
    return new Promise((resolve) => {
      this.resolvePromise = resolve;
      this.open();
    });
  }

  onOpen() {
    this.contentEl.empty();
    render(
      <PromptComponent
        title={this.options.title}
        placeholder={this.options.placeholder}
        ctaText={this.options.ctaText}
        initialValue={this.options.defaultValue}
        onSubmit={(value) => {
          // 空字符串按取消处理，避免返回无意义值
          const v = value.trim();
          if (this.resolvePromise) {
            this.resolvePromise(v ? v : null);
            this.resolvePromise = null;
          }
          this.close();
        }}
        onCancel={() => {
          if (this.resolvePromise) {
            this.resolvePromise(null);
            this.resolvePromise = null;
          }
          this.close();
        }}
      />,
      this.contentEl
    );
  }

  onClose() {
    // 用户直接关闭（点击遮罩/右上角/ESC）也必须 resolve，防止 await 卡死
    if (this.resolvePromise) {
      this.resolvePromise(null);
      this.resolvePromise = null;
    }
    unmountComponentAtNode(this.contentEl);
  }
}
