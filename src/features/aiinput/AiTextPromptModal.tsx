// src/features/aiinput/AiTextPromptModal.tsx
/** @jsxImportSource preact */
import { h } from 'preact';
import { useState } from 'preact/hooks';
import { App, Modal } from 'obsidian';
import { render, unmountComponentAtNode } from 'preact/compat';
import { Button, TextField, Box, Typography, Stack, IconButton, Tooltip, CircularProgress } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import SmartToyIcon from '@mui/icons-material/SmartToy';

interface AiTextPromptFormProps {
    onSubmit: (text: string) => void;
    onCancel: () => void;
    isLoading?: boolean;
}

function AiTextPromptForm({ onSubmit, onCancel, isLoading }: AiTextPromptFormProps) {
    const [text, setText] = useState('');

    const handleSubmit = () => {
        if (text.trim()) {
            onSubmit(text.trim());
        }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
        // Ctrl/Cmd + Enter 提交
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            e.preventDefault();
            handleSubmit();
        }
        // Escape 取消
        if (e.key === 'Escape') {
            e.preventDefault();
            onCancel();
        }
    };

    return (
        <Box sx={{ p: 2, minWidth: 400 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Stack direction="row" spacing={1} alignItems="center">
                    <SmartToyIcon color="primary" />
                    <Typography variant="h6">AI 自然语言快速记录</Typography>
                </Stack>
                <Tooltip title="关闭">
                    <IconButton onClick={onCancel} size="small">
                        <CloseIcon />
                    </IconButton>
                </Tooltip>
            </Box>

            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                用自然语言描述你想记录的内容，AI 会自动识别并填充相应字段。
            </Typography>

            <TextField
                fullWidth
                multiline
                rows={4}
                placeholder="例如：今天早上9点到11点学习了2小时英语，感觉很好"
                value={text}
                onChange={(e: any) => setText(e.target.value)}
                onKeyDown={handleKeyDown as any}
                autoFocus
                disabled={isLoading}
                sx={{ mb: 2 }}
            />

            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
                提示：按 Ctrl+Enter 快速提交
            </Typography>

            <Stack direction="row" spacing={1} justifyContent="flex-end">
                <Button onClick={onCancel} disabled={isLoading}>
                    取消
                </Button>
                <Button
                    variant="contained"
                    onClick={handleSubmit}
                    disabled={!text.trim() || isLoading}
                    startIcon={isLoading ? <CircularProgress size={16} /> : undefined}
                >
                    {isLoading ? '解析中...' : '解析'}
                </Button>
            </Stack>
        </Box>
    );
}

/**
 * AI 文本输入 Modal
 * 返回 Promise<string | null>，用户取消时返回 null
 */
export class AiTextPromptModal extends Modal {
    private resolvePromise: ((value: string | null) => void) | null = null;
    private isLoading = false;

    constructor(app: App) {
        super(app);
    }

    /**
     * 打开 Modal 并获取用户输入
     */
    openAndGetValue(): Promise<string | null> {
        return new Promise((resolve) => {
            this.resolvePromise = resolve;
            this.open();
        });
    }

    /**
     * 设置加载状态
     */
    setLoading(loading: boolean) {
        this.isLoading = loading;
        this.renderContent();
    }

    onOpen() {
        this.contentEl.empty();
        this.modalEl.addClass('think-ai-prompt-modal');
        this.renderContent();
    }

    private renderContent() {
        this.contentEl.empty();
        render(
            <AiTextPromptForm
                onSubmit={(text) => {
                    if (this.resolvePromise) {
                        this.resolvePromise(text);
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
                isLoading={this.isLoading}
            />,
            this.contentEl
        );
    }

    onClose() {
        // 如果用户直接关闭 Modal（点击外部或按 Esc），返回 null
        if (this.resolvePromise) {
            this.resolvePromise(null);
            this.resolvePromise = null;
        }
        unmountComponentAtNode(this.contentEl);
    }
}
