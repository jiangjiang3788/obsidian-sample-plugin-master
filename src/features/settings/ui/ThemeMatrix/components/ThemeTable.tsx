/** @jsxImportSource preact */
import { h } from 'preact';
import {
    Table,
    TableHead,
    TableRow,
    TableCell,
    TableBody,
    Typography,
    Checkbox,
    IconButton,
    Tooltip
} from '@mui/material';
import { ThemeTreeNodeRow } from './ThemeTreeNodeRow';
import type { ThemeTableProps } from '../types';

export function ThemeTable({
    blocks,
    activeThemes,
    archivedThemes,
    showArchived,
    overridesMap,
    selection,
    editingThemeId,
    appStore,
    onCellClick,
    onToggleExpand,
    onContextMenu,
    onSetEditingThemeId,
    isThemeSelected,
    isBlockSelected,
    onThemeSelect,
    onBlockSelect
}: ThemeTableProps) {
    return (
        <Table size="small" sx={{ '& th, & td': { whiteSpace: 'nowrap', py: 1, px: 1.5 } }}>
            <TableHead>
                <TableRow>
                    <TableCell sx={{ width: '40px', fontWeight: 'bold' }}>
                        {/* 选择列 */}
                    </TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>主题路径</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 'bold', width: '80px' }}>图标</TableCell>
                    {blocks.map(b => (
                        <TableCell 
                            key={b.id} 
                            align="center" 
                            sx={{ 
                                fontWeight: 'bold',
                                cursor: selection.mode === 'block' ? 'pointer' : 'default',
                                backgroundColor: isBlockSelected(b.id) ? 'action.selected' : 'inherit',
                                '&:hover': selection.mode === 'block' ? {
                                    backgroundColor: 'action.hover'
                                } : {}
                            }}
                            onClick={(e) => {
                                if (selection.mode === 'block' && onBlockSelect) {
                                    onBlockSelect(b.id, e);
                                }
                            }}
                        >
                            {selection.mode === 'block' && (
                                <Checkbox
                                    size="small"
                                    checked={isBlockSelected(b.id)}
                                    sx={{ p: 0, mr: 0.5 }}
                                />
                            )}
                            {b.name}
                        </TableCell>
                    ))}
                    <TableCell align="center" sx={{ fontWeight: 'bold', width: '60px' }}>操作</TableCell>
                </TableRow>
            </TableHead>
            <TableBody>
                {/* 激活主题 */}
                {activeThemes.length > 0 && (
                    <div>
                        <TableRow>
                            <TableCell colSpan={blocks.length + 4} sx={{ backgroundColor: 'action.hover' }}>
                                <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                                    激活主题 ({activeThemes.length})
                                </Typography>
                            </TableCell>
                        </TableRow>
                        {activeThemes.map(node => (
                            <ThemeTreeNodeRow
                                key={node.theme.id}
                                node={node}
                                blocks={blocks}
                                overridesMap={overridesMap}
                                onCellClick={onCellClick}
                                editingThemeId={editingThemeId}
                                onSetEditingThemeId={onSetEditingThemeId}
                                appStore={appStore}
                                onToggleExpand={onToggleExpand}
                                onContextMenu={onContextMenu}
                                isThemeSelected={isThemeSelected}
                                isPartiallySelected={(themeId: string) => false} // 简化实现
                                onThemeSelect={onThemeSelect}
                            />
                        ))}
                    </div>
                )}
                
                {/* 归档主题 */}
                {showArchived && archivedThemes.length > 0 && (
                    <div>
                        <TableRow>
                            <TableCell colSpan={blocks.length + 4} sx={{ backgroundColor: 'action.hover' }}>
                                <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                                    归档主题 ({archivedThemes.length})
                                </Typography>
                            </TableCell>
                        </TableRow>
                        {archivedThemes.map(node => (
                            <ThemeTreeNodeRow
                                key={node.theme.id}
                                node={node}
                                blocks={blocks}
                                overridesMap={overridesMap}
                                onCellClick={onCellClick}
                                editingThemeId={editingThemeId}
                                onSetEditingThemeId={onSetEditingThemeId}
                                appStore={appStore}
                                onToggleExpand={onToggleExpand}
                                onContextMenu={onContextMenu}
                                isThemeSelected={isThemeSelected}
                                isPartiallySelected={(themeId: string) => false} // 简化实现
                                onThemeSelect={onThemeSelect}
                            />
                        ))}
                    </div>
                )}
            </TableBody>
        </Table>
    );
}
