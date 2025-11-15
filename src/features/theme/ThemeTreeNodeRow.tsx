/** @jsxImportSource preact */
import { h } from 'preact';
import {
    Box, TableRow, TableCell, IconButton, Tooltip,
    Typography, Checkbox, Chip
} from '@mui/material';
// HACK: Cast all MUI components to `any` to resolve Preact/React type conflicts.
const AnyTableRow = TableRow as any;
const AnyTableCell = TableCell as any;
const AnyIconButton = IconButton as any;
const AnyTooltip = Tooltip as any;
const AnyTypography = Typography as any;
const AnyCheckbox = Checkbox as any;
const AnyChip = Chip as any;
const AnyBox = Box as any;
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import TaskAltIcon from '@mui/icons-material/TaskAlt';
import CancelIcon from '@mui/icons-material/Cancel';
import EditIcon from '@mui/icons-material/Edit';
import { useState } from 'preact/hooks';
import { InlineEditor } from './InlineEditor';
import type { EditorState } from './useThemeMatrixEditor';
import type { BlockTemplate, ThemeDefinition, ThemeOverride } from '@core/types/domain/schema';
import type { AppStore } from '@core/stores/AppStore';
import type { ThemeTreeNode } from './props.types';

// Define new props inline for now
interface NewThemeTreeNodeRowProps {
    node: ThemeTreeNode;
    blocks: BlockTemplate[];
    overridesMap: Map<string, ThemeOverride>;
    appStore: AppStore;
    onCellClick: (block: BlockTemplate, theme: ThemeDefinition) => void;
    onToggleExpand: (themeId: string) => void;
    editorState: EditorState;
    onSelectionChange: (type: 'theme' | 'block', id: string, isSelected: boolean) => void;
}

export function ThemeTreeNodeRow({ 
    node, 
    blocks, 
    overridesMap, 
    onCellClick, 
    appStore,
    onToggleExpand,
    editorState,
    onSelectionChange
}: NewThemeTreeNodeRowProps) {
    const { theme, children, expanded, level } = node;
    const [isEditingPath, setIsEditingPath] = useState(false);
    const [isEditingIcon, setIsEditingIcon] = useState(false);

    const isEditMode = editorState.mode === 'edit';
    const isThemeSelected = editorState.selectedThemes.has(theme.id);
    const isThemeSelectionMode = editorState.selectionType === 'theme' || editorState.selectionType === 'none';
    const isBlockSelectionMode = editorState.selectionType === 'block' || editorState.selectionType === 'none';
    
    return (
        <>
            <AnyTableRow
                hover
                sx={{ 
                    opacity: theme.status === 'inactive' ? 0.6 : 1,
                    backgroundColor: isThemeSelected ? 'action.selected' : 'inherit'
                }}
            >
                <AnyTableCell>
                    <AnyBox sx={{ display: 'flex', alignItems: 'center', pl: level * 2 }}>
                        {children.length > 0 && (
                            <AnyIconButton 
                                size="small" 
                                onClick={() => onToggleExpand(theme.id)}
                                sx={{ mr: 0.5 }}
                            >
                                {expanded ? <ExpandMoreIcon /> : <ChevronRightIcon />}
                            </AnyIconButton>
                        )}
                        {children.length === 0 && <AnyBox sx={{ width: '28px' }} />}
                        
                        <AnyBox sx={{ flex: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                            {isEditingIcon ? (
                                <InlineEditor 
                                    value={theme.icon || ''} 
                                    onSave={(newIcon: string) => { 
                                        appStore.updateTheme(theme.id, { icon: newIcon });
                                        setIsEditingIcon(false);
                                    }}
                                />
                            ) : (
                                <AnyTypography sx={{ cursor: 'text', width: '24px', textAlign: 'center' }} onDoubleClick={() => setIsEditingIcon(true)}>
                                    {theme.icon || ' '}
                                </AnyTypography>
                            )}
                            {isEditingPath ? (
                                <InlineEditor 
                                    value={theme.path} 
                                    onSave={(newPath: string) => { 
                                        appStore.updateTheme(theme.id, { path: newPath }); 
                                        setIsEditingPath(false);
                                    }}
                                />
                            ) : (
                                <AnyTypography 
                                    onDoubleClick={() => setIsEditingPath(true)}
                                    sx={{ cursor: 'text' }}
                                >
                                    {theme.path.split('/').pop()}
                                </AnyTypography>
                            )}
                        </AnyBox>
                    </AnyBox>
                </AnyTableCell>

                <AnyTableCell align="center" sx={{ width: '100px' }}>
                    {isEditMode ? (
                        <input
                            type="checkbox"
                            checked={isThemeSelected}
                            onChange={(e) => {
                                console.log('【调试】主题 Checkbox 点击', { themeId: theme.id, checked: (e.target as HTMLInputElement).checked });
                                onSelectionChange('theme', theme.id, (e.target as HTMLInputElement).checked);
                            }}
                            style={{ 
                                margin: 0, 
                                cursor: 'pointer',
                                transform: 'scale(1.2)'
                            }}
                        />
                    ) : (
                        <AnyChip 
                            label={theme.status === 'active' ? '激活' : '归档'}
                            size="small"
                            color={theme.status === 'active' ? 'success' : 'default'}
                        />
                    )}
                </AnyTableCell>
                
                {blocks.map(block => {
                    const cellId = `${theme.id}:${block.id}`;
                    const isCellSelected = editorState.selectedCells.has(cellId);
                    
                    if (isEditMode) {
                        return (
                            <AnyTableCell key={block.id} align="center" sx={{ p: 0, width: '60px' }}>
                                <input
                                    type="checkbox"
                                    checked={isCellSelected}
                                    onChange={(e) => {
                                        console.log('【调试】单元格 Checkbox 点击', { cellId, checked: (e.target as HTMLInputElement).checked });
                                        onSelectionChange('block', cellId, (e.target as HTMLInputElement).checked);
                                    }}
                                    style={{ 
                                        margin: 0, 
                                        cursor: 'pointer',
                                        transform: 'scale(1.2)'
                                    }}
                                />
                            </AnyTableCell>
                        );
                    }

                    const override = overridesMap.get(cellId);
                    let cellIcon, cellTitle;
                    if (override) {
                        if (override.disabled) {
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
                        <AnyTableCell 
                            key={block.id} 
                            align="center" 
                            onClick={() => onCellClick(block, theme)}
                            sx={{ cursor: 'pointer', '&:hover': { backgroundColor: 'action.hover' }, width: '60px' }}
                        >
                            <AnyTooltip title={cellTitle}>
                                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    {cellIcon}
                                </span>
                            </AnyTooltip>
                        </AnyTableCell>
                    );
                })}
            </AnyTableRow>
            
            {expanded && children.map((child: ThemeTreeNode) => (
                <ThemeTreeNodeRow
                    key={child.theme.id}
                    node={child}
                    blocks={blocks}
                    overridesMap={overridesMap}
                    onCellClick={onCellClick}
                    appStore={appStore}
                    onToggleExpand={onToggleExpand}
                    editorState={editorState}
                    onSelectionChange={onSelectionChange}
                />
            ))}
        </>
    );
}
