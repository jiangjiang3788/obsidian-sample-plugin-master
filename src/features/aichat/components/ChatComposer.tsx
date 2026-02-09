/** @jsxImportSource preact */
import { h } from 'preact';
import { Box, Button, TextField } from '@mui/material';
import SendIcon from '@mui/icons-material/Send';

export interface ChatComposerProps {
    inputText: string;
    setInputText: (text: string) => void;
    onKeyDown: (e: KeyboardEvent) => void;
    onSend: () => void;
    isLoading: boolean;
    disabled: boolean;
    placeholder: string;
}

export function ChatComposer({
    inputText,
    setInputText,
    onKeyDown,
    onSend,
    isLoading,
    disabled,
    placeholder,
}: ChatComposerProps) {
    return (
        <Box
            sx={{
                p: 2,
                borderTop: '1px solid var(--background-modifier-border)',
                display: 'flex',
                gap: 1,
            }}
        >
            <TextField
                fullWidth
                multiline
                maxRows={4}
                placeholder={placeholder}
                value={inputText}
                onChange={(e: any) => setInputText(e.target.value)}
                onKeyDown={onKeyDown}
                disabled={isLoading || disabled}
                size="small"
            />
            <Button
                variant="contained"
                onClick={onSend}
                disabled={!inputText.trim() || isLoading || disabled}
                sx={{ minWidth: 'auto', px: 2 }}
            >
                <SendIcon />
            </Button>
        </Box>
    );
}
