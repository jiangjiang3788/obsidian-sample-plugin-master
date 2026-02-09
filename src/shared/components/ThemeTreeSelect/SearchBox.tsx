/** @jsxImportSource preact */
import { h } from 'preact';
import { Box, IconButton, InputAdornment, TextField } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';

export interface SearchBoxProps {
    value: string;
    onChange: (value: string) => void;
}

export function SearchBox({ value, onChange }: SearchBoxProps) {
    return (
        <Box sx={{ p: 1, borderBottom: '1px solid var(--background-modifier-border)' }}>
            <TextField
                fullWidth
                size="small"
                placeholder="搜索主题..."
                value={value}
                onChange={(e: any) => onChange(e.target.value)}
                InputProps={{
                    startAdornment: (
                        <InputAdornment position="start">
                            <SearchIcon fontSize="small" />
                        </InputAdornment>
                    ),
                    endAdornment: value && (
                        <InputAdornment position="end">
                            <IconButton size="small" onClick={() => onChange('')}>
                                <ClearIcon fontSize="small" />
                            </IconButton>
                        </InputAdornment>
                    ),
                }}
                onKeyDown={(e: KeyboardEvent) => e.stopPropagation()}
            />
        </Box>
    );
}
