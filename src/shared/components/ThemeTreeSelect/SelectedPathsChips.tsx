/** @jsxImportSource preact */
import { h } from 'preact';
import { Box, Chip } from '@mui/material';

export interface SelectedPathsChipsProps {
    selectedPaths: string[];
    onRemovePath?: (path: string) => void;
    maxVisible?: number;
}

export function SelectedPathsChips({
    selectedPaths,
    onRemovePath,
    maxVisible = 3,
}: SelectedPathsChipsProps) {
    if (selectedPaths.length === 0) return null;

    const visible = selectedPaths.slice(0, maxVisible);
    const restCount = selectedPaths.length - visible.length;

    return (
        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 0.5 }}>
            {visible.map(path => (
                <Chip
                    key={path}
                    size="small"
                    label={path.split('/').pop()}
                    onDelete={
                        onRemovePath
                            ? () => {
                                  onRemovePath(path);
                              }
                            : undefined
                    }
                    sx={{ height: 22 }}
                />
            ))}
            {restCount > 0 && <Chip size="small" label={`+${restCount}`} sx={{ height: 22 }} />}
        </Box>
    );
}
