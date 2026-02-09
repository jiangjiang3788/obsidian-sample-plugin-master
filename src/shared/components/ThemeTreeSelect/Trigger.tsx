/** @jsxImportSource preact */
import { h } from 'preact';
import { Box, IconButton, Typography } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import ClearIcon from '@mui/icons-material/Clear';

export interface ThemeTreeSelectTriggerProps {
    open: boolean;
    onToggleOpen: () => void;
    displayText: string;
    hasSelection: boolean;
    allowClear: boolean;
    disabled: boolean;
    size: 'small' | 'medium';
    onClear: (e: Event) => void;
    anchorRef: preact.RefObject<HTMLDivElement>;
}

export function ThemeTreeSelectTrigger({
    open,
    onToggleOpen,
    displayText,
    hasSelection,
    allowClear,
    disabled,
    size,
    onClear,
    anchorRef,
}: ThemeTreeSelectTriggerProps) {
    return (
        <Box
            ref={anchorRef}
            onClick={() => !disabled && onToggleOpen()}
            sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0.5,
                px: 1.5,
                py: size === 'small' ? 0.5 : 1,
                border: '1px solid var(--background-modifier-border)',
                borderRadius: 1,
                cursor: disabled ? 'not-allowed' : 'pointer',
                opacity: disabled ? 0.5 : 1,
                bgcolor: 'background.paper',
                '&:hover': disabled
                    ? {}
                    : {
                          borderColor: 'primary.main',
                      },
            }}
        >
            <Typography
                variant="body2"
                sx={{
                    flex: 1,
                    color: hasSelection ? 'text.primary' : 'text.secondary',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                }}
            >
                {displayText}
            </Typography>
            {allowClear && hasSelection && !disabled && (
                <IconButton size="small" onClick={onClear} sx={{ p: 0.25 }}>
                    <ClearIcon fontSize="small" />
                </IconButton>
            )}
            <IconButton size="small" sx={{ p: 0.25 }}>
                {open ? <ExpandMoreIcon fontSize="small" /> : <ChevronRightIcon fontSize="small" />}
            </IconButton>
        </Box>
    );
}
