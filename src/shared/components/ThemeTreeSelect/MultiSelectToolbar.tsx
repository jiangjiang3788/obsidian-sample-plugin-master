/** @jsxImportSource preact */
import { h } from 'preact';
import { Box, Button } from '@mui/material';
import type { ThemePathTreeNode as ThemeTreeNode } from '@core/public';
import { ThemePathTreeBuilder as ThemeTreeBuilder } from '@core/public';

export interface MultiSelectToolbarProps {
    themeTree: ThemeTreeNode[];
    onSelectMultiple?: (paths: string[]) => void;
}

export function MultiSelectToolbar({ themeTree, onSelectMultiple }: MultiSelectToolbarProps) {
    return (
        <Box
            sx={{
                display: 'flex',
                gap: 1,
                p: 1,
                borderBottom: '1px solid var(--background-modifier-border)',
            }}
        >
            <Button
                size="small"
                onClick={() => {
                    const allPaths = ThemeTreeBuilder.getLeafNodes(themeTree).map(n => n.path);
                    onSelectMultiple?.(allPaths);
                }}
            >
                全选
            </Button>
            <Button size="small" onClick={() => onSelectMultiple?.([])}>
                清空
            </Button>
        </Box>
    );
}
