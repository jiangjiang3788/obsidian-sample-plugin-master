/** @jsxImportSource preact */
import { h } from 'preact';
import {
    Table,
    TableHead,
    TableRow,
    TableCell,
    TableBody,
    Typography
} from '@mui/material';
import { ThemeTreeNodeRow } from './ThemeTreeNodeRow';
import type { ThemeTableProps } from '../types';

export function ThemeTable({
    blocks,
    activeThemes,
    archivedThemes,
    showArchived,
    overridesMap,
    selectedThemes,
    editingThemeId,
    appStore,
    onCellClick,
    onToggleSelect,
    onToggleExpand,
    onContextMenu,
    onSetEditingThemeId
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
                        <TableCell key={b.id} align="center" sx={{ fontWeight: 'bold' }}>
                            {b.name}
                        </TableCell>
                    ))}
                    <TableCell align="center" sx={{ fontWeight: 'bold', width: '60px' }}>操作</TableCell>
                </TableRow>
            </TableHead>
            <TableBody>
                {/* 激活主题 */}
                {activeThemes.length > 0 && (
                    <div style={{ display: 'contents' }}>
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
                                handleCellClick={onCellClick}
                                editingThemeId={editingThemeId}
                                setEditingThemeId={onSetEditingThemeId}
                                appStore={appStore}
                                selectedThemes={selectedThemes}
                                onToggleSelect={onToggleSelect}
                                onToggleExpand={onToggleExpand}
                                onContextMenu={onContextMenu}
                            />
                        ))}
                    </div>
                )}
                
                {/* 归档主题 */}
                {showArchived && archivedThemes.length > 0 && (
                    <div style={{ display: 'contents' }}>
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
                                handleCellClick={onCellClick}
                                editingThemeId={editingThemeId}
                                setEditingThemeId={onSetEditingThemeId}
                                appStore={appStore}
                                selectedThemes={selectedThemes}
                                onToggleSelect={onToggleSelect}
                                onToggleExpand={onToggleExpand}
                                onContextMenu={onContextMenu}
                            />
                        ))}
                    </div>
                )}
            </TableBody>
        </Table>
    );
}
