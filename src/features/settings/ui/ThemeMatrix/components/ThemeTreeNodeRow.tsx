/** @jsxImportSource preact */
import { h } from 'preact';
import {
    Box, TableRow, TableCell, IconButton, Tooltip,
    Typography, Checkbox, Chip
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import FolderIcon from '@mui/icons-material/Folder';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import ArchiveIcon from '@mui/icons-material/Archive';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import CheckBoxIcon from '@mui/icons-material/CheckBox';
import CheckBoxOutlineBlankIcon from '@mui/icons-material/CheckBoxOutlineBlank';
import IndeterminateCheckBoxIcon from '@mui/icons-material/IndeterminateCheckBox';
import TaskAltIcon from '@mui/icons-material/TaskAlt';
import CancelIcon from '@mui/icons-material/Cancel';
import EditIcon from '@mui/icons-material/Edit';
import { InlineEditor } from './InlineEditor';
import type { ThemeTreeNodeRowProps } from '../types';

export function ThemeTreeNodeRow({ 
    node, 
    blocks, 
    overridesMap, 
    handleCellClick, 
    editingThemeId,
    setEditingThemeId,
    appStore,
    selectedThemes,
    onToggleSelect,
    onToggleExpand,
    onContextMenu
}: ThemeTreeNodeRowProps) {
    const { theme, children, expanded, level } = node;
    const isSelected = selectedThemes.has(theme.id);
    const hasSelectedChildren = children.some(child => 
        selectedThemes.has(child.theme.id) || 
        child.children.some(grandchild => selectedThemes.has(grandchild.theme.id))
    );
    
    // 计算复选框状态
    const checkboxIcon = isSelected 
        ? <CheckBoxIcon />
        : hasSelectedChildren 
            ? <IndeterminateCheckBoxIcon />
            : <CheckBoxOutlineBlankIcon />;
    
    return (
        <div>
            <TableRow
                hover
                sx={{ 
                    opacity: theme.status === 'inactive' ? 0.6 : 1,
                    backgroundColor: theme.status === 'inactive' ? 'action.hover' : 'inherit'
                }}
                onContextMenu={(e) => onContextMenu(e as any, theme)}
            >
                <TableCell sx={{ width: '40px', p: '0 8px' }}>
                    <Checkbox
                        checked={isSelected}
                        indeterminate={!isSelected && hasSelectedChildren}
                        icon={checkboxIcon}
                        onChange={() => onToggleSelect(theme.id, true)}
                        sx={{ padding: '4px' }}
                        onClick={(e: any) => {
                            e.stopPropagation();
                        }}
                    />
                </TableCell>
                
                <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', pl: level * 3 }}>
                        {children.length > 0 && (
                            <IconButton 
                                size="small" 
                                onClick={() => onToggleExpand(theme.id)}
                                sx={{ mr: 0.5 }}
                            >
                                {expanded ? <ExpandMoreIcon /> : <ChevronRightIcon />}
                            </IconButton>
                        )}
                        {children.length > 0 
                            ? (expanded ? <FolderOpenIcon sx={{ mr: 1 }} /> : <FolderIcon sx={{ mr: 1 }} />)
                            : <Box sx={{ width: '24px', mr: 1 }} />
                        }
                        <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                            {editingThemeId === theme.id ? (
                                <InlineEditor 
                                    value={theme.path} 
                                    onSave={(newPath) => { 
                                        appStore.updateTheme(theme.id, { path: newPath }); 
                                        setEditingThemeId(null); 
                                    }} 
                                />
                            ) : (
                                <Typography 
                                    onDoubleClick={() => setEditingThemeId(theme.id)}
                                    sx={{ cursor: 'text' }}
                                >
                                    {theme.path}
                                </Typography>
                            )}
                            {theme.usageCount !== undefined && theme.usageCount > 0 && (
                                <Chip 
                                    label={`使用 ${theme.usageCount} 次`} 
                                    size="small" 
                                    variant="outlined" 
                                />
                            )}
                            {theme.status === 'inactive' && (
                                <Chip 
                                    label="归档" 
                                    size="small" 
                                    color="default" 
                                    icon={<ArchiveIcon />}
                                />
                            )}
                        </Box>
                    </Box>
                </TableCell>
                
                <TableCell align="center">
                    {editingThemeId === theme.id ? (
                        <InlineEditor 
                            value={theme.icon || ''} 
                            onSave={(newIcon) => { 
                                appStore.updateTheme(theme.id, { icon: newIcon }); 
                                setEditingThemeId(null); 
                            }} 
                        />
                    ) : (
                        <Typography>{theme.icon || ' '}</Typography>
                    )}
                </TableCell>
                
                {blocks.map(block => {
                    const override = overridesMap.get(`${theme.id}:${block.id}`);
                    let cellIcon, cellTitle;
                    if (override) {
                        if (override.status === 'disabled') {
                            cellIcon = <CancelIcon sx={{ fontSize: '1.4rem', color: 'error.main' }} />;
                            cellTitle = '已禁用';
                        } else {
                            cellIcon = <EditIcon sx={{ fontSize: '1.4rem', color: 'primary.main' }} />;
                            cellTitle = '已覆写';
                        }
                    } else {
                        cellIcon = <TaskAltIcon sx={{ fontSize: '1.4rem', color: 'success.main' }} />;
                        cellTitle = '继承';
                    }
                    return (
                        <TableCell 
                            key={block.id} 
                            align="center" 
                            onClick={() => handleCellClick(block, theme)} 
                            sx={{ cursor: 'pointer' }}
                        >
                            <Tooltip title={cellTitle}><span>{cellIcon}</span></Tooltip>
                        </TableCell>
                    );
                })}
                
                <TableCell align="center">
                    <IconButton
                        size="small"
                        onClick={(e) => onContextMenu(e as any, theme)}
                    >
                        <MoreVertIcon />
                    </IconButton>
                </TableCell>
            </TableRow>
            
            {expanded && children.map(child => (
                <ThemeTreeNodeRow
                    key={child.theme.id}
                    node={child}
                    blocks={blocks}
                    overridesMap={overridesMap}
                    handleCellClick={handleCellClick}
                    editingThemeId={editingThemeId}
                    setEditingThemeId={setEditingThemeId}
                    appStore={appStore}
                    selectedThemes={selectedThemes}
                    onToggleSelect={onToggleSelect}
                    onToggleExpand={onToggleExpand}
                    onContextMenu={onContextMenu}
                />
            ))}
        </div>
    );
}
