// src/shared/components/dialogs/NamePromptModal.tsx
/** @jsxImportSource preact */
import { h, render } from 'preact';
import { useState } from 'preact/hooks';
import { App, Modal } from 'obsidian';
import { TextField, Button } from '@mui/material';

// 内部的 Preact 组件
const PromptComponent = ({ title, placeholder, initialValue, onSubmit, onCancel }: {
    title: string;
    placeholder?: string;
    initialValue?: string;
    onSubmit: (value: string) => void;
    onCancel: () => void;
}) => {
    const [value, setValue] = useState(initialValue || '');

    const handleConfirm = () => {
        if (value.trim()) {
            onSubmit(value.trim());
        }
    };
    
    const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Enter') {
            // [关键] 这里没有调用 e.preventDefault()，是正确的实现
            // 它只是触发了确认逻辑，并不会阻止字符输入
            e.currentTarget.blur(); // 让输入框失焦以触发onBlur或表示完成
            handleConfirm();
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
                onChange={e => setValue((e.target as HTMLInputElement).value)}
                onKeyDown={handleKeyDown}
                sx={{ mt: 2 }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem', gap: '8px' }}>
                <Button onClick={handleConfirm} variant="contained">确认</Button>
                <Button onClick={onCancel}>取消</Button>
            </div>
        </div>
    );
};


// Obsidian Modal 封装
export class NamePromptModal extends Modal {
    constructor(
        app: App,
        private title: string,
        private placeholder: string,
        private initialValue: string,
        private onSubmitCallback: (value: string) => void
    ) {
        super(app);
    }

    onOpen() {
        this.contentEl.empty();
        render(
            <PromptComponent
                title={this.title}
                placeholder={this.placeholder}
                initialValue={this.initialValue}
                onSubmit={(value) => {
                    this.onSubmitCallback(value);
                    this.close();
                }}
                onCancel={() => this.close()}
            />,
            this.contentEl
        );
    }

    onClose() {
        unmountComponentAtNode(this.containerEl);
    }
}