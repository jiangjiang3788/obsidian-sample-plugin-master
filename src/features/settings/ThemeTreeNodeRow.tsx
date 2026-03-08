/** @jsxImportSource preact */
import { h } from 'preact';
import { Box, TableRow, TableCell, Tooltip, Typography } from '@mui/material';
import { ThemeTreeNodeLabel } from '@shared/public';
import TaskAltIcon from '@mui/icons-material/TaskAlt';
import CancelIcon from '@mui/icons-material/Cancel';
import EditIcon from '@mui/icons-material/Edit';
import { useState } from 'preact/hooks';
import { InlineEditor } from './InlineEditor';
import type { EditorState } from './useThemeMatrixEditor';
import type { BlockTemplate, ThemeDefinition, ThemeOverride } from '@core/public';
import { getCategoryColor, devLog } from '@core/public';
import type { UseCases } from '@/app/public';
import type { ThemePathTreeFlatNode as ThemeTreeNode } from '@core/public';

const AnyTableRow = TableRow as any;
const AnyTableCell = TableCell as any;
const AnyTooltip = Tooltip as any;
const AnyTypography = Typography as any;
const AnyBox = Box as any;

interface ThemeTreeNodeRowProps {
    node: ThemeTreeNode;
    groupNodes: ThemeTreeNode[];
    rowIndex: number;
    blocks: BlockTemplate[];
    overridesMap: Map<string, ThemeOverride>;
    useCases: UseCases;
    onCellClick: (block: BlockTemplate, theme: ThemeDefinition) => void;
    onToggleExpand: (themeId: string) => void;
    editorState: EditorState;
    onSelectionChange: (type: 'theme' | 'block', id: string, isSelected: boolean) => void;
}

type CellState = 'inherit' | 'override' | 'disabled';

function hexToRgb(hex: string) {
    const normalized = hex.replace('#', '');
    const safe = normalized.length === 3
        ? normalized.split('').map(ch => ch + ch).join('')
        : normalized;
    const value = parseInt(safe, 16);
    return {
        r: (value >> 16) & 255,
        g: (value >> 8) & 255,
        b: value & 255,
    };
}

function alpha(hex: string, opacity: number) {
    const { r, g, b } = hexToRgb(hex || '#cccccc');
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

function getGroupKey(node: ThemeTreeNode) {
    return node.theme?.path?.split('/')?.[0] || node.theme?.path || '';
}

function getBlockState(themeId: string, blockId: string, overridesMap: Map<string, ThemeOverride>): CellState {
    const override = overridesMap.get(`${themeId}:${blockId}`);
    if (!override) return 'inherit';
    return override.disabled ? 'disabled' : 'override';
}

function getStateVisual(state: CellState) {
    switch (state) {
        case 'override':
            return {
                bg: 'rgba(126, 87, 194, 0.16)',
                border: 'rgba(126, 87, 194, 0.22)',
                icon: <EditIcon sx={{ fontSize: '1rem', color: '#7E57C2' }} />,
                title: '已覆写',
            };
        case 'disabled':
            return {
                bg: 'rgba(229, 57, 53, 0.12)',
                border: 'rgba(229, 57, 53, 0.18)',
                icon: <CancelIcon sx={{ fontSize: '1rem', color: '#D32F2F' }} />,
                title: '已禁用',
            };
        default:
            return {
                bg: 'rgba(46, 125, 50, 0.10)',
                border: 'rgba(46, 125, 50, 0.16)',
                icon: <TaskAltIcon sx={{ fontSize: '1rem', color: '#2E7D32' }} />,
                title: '继承',
            };
    }
}

function getShape(prevSame: boolean, nextSame: boolean) {
    if (prevSame && nextSame) {
        return {
            borderRadius: '0px',
            mt: 0,
            mb: 0,
        };
    }
    if (!prevSame && nextSame) {
        return {
            borderRadius: '8px 8px 0 0',
            mt: 0,
            mb: 0,
        };
    }
    if (prevSame && !nextSame) {
        return {
            borderRadius: '0 0 8px 8px',
            mt: 0,
            mb: 0,
        };
    }
    return {
        borderRadius: '8px',
        mt: 0,
        mb: 0,
    };
}

export function ThemeTreeNodeRow({
    node,
    groupNodes,
    rowIndex,
    blocks,
    overridesMap,
    onCellClick,
    useCases,
    onToggleExpand,
    editorState,
    onSelectionChange,
}: ThemeTreeNodeRowProps) {
    const theme = node.theme;
    if (!theme) return null;

    const children = node.children ?? [];
    const expanded = !!node.expanded;
    const level = node.depth;
    const isRoot = level === 0;

    const [isEditingPath, setIsEditingPath] = useState(false);
    const [isEditingIcon, setIsEditingIcon] = useState(false);

    const isEditMode = editorState.mode === 'edit';
    const isThemeSelected = editorState.selectedThemes.has(theme.id);

    const groupColor = getCategoryColor(getGroupKey(node));
    const pathBg = isRoot ? alpha(groupColor, 0.28) : alpha(groupColor, 0.08);
    const pathTextColor = '#1f2937';

    const prevNode = rowIndex > 0 ? groupNodes[rowIndex - 1] : null;
    const nextNode = rowIndex < groupNodes.length - 1 ? groupNodes[rowIndex + 1] : null;
    const statusValue = theme.status === 'active' ? 'active' : 'inactive';
    const prevStatusSame = !!prevNode && (prevNode.theme?.status === theme.status);
    const nextStatusSame = !!nextNode && (nextNode.theme?.status === theme.status);
    const statusShape = getShape(prevStatusSame, nextStatusSame);

    return (
        <AnyTableRow sx={{ opacity: theme.status === 'inactive' ? 0.62 : 1 }}>
            <AnyTableCell sx={{ py: 0.35, px: 0.75, borderBottom: 'none' }}>
                <AnyBox
                    sx={{
                        minHeight: 56,
                        display: 'flex',
                        alignItems: 'center',
                        px: 1.25,
                        backgroundColor: pathBg,
                        borderRadius: isRoot ? '10px' : '8px',
                        boxShadow: isThemeSelected ? `inset 0 0 0 1px ${alpha(groupColor, 0.45)}` : 'none',
                    }}
                >
                    <ThemeTreeNodeLabel
                        depth={level}
                        hasChildren={children.length > 0}
                        expanded={expanded}
                        onToggleExpand={() => onToggleExpand(theme.id)}
                        basePadding={0}
                        indentUnit={1.5}
                        placeholderWidthPx={24}
                    >
                        <AnyBox sx={{ flex: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                            {isEditingIcon ? (
                                <InlineEditor
                                    value={theme.icon || ''}
                                    onSave={(newIcon: string) => {
                                        useCases.theme.updateTheme(theme.id, { icon: newIcon });
                                        setIsEditingIcon(false);
                                    }}
                                />
                            ) : (
                                <AnyTypography sx={{ cursor: 'text', width: '20px', textAlign: 'center', color: pathTextColor }} onDoubleClick={() => setIsEditingIcon(true)}>
                                    {theme.icon || ' '}
                                </AnyTypography>
                            )}
                            {isEditingPath ? (
                                <InlineEditor
                                    value={theme.path}
                                    onSave={(newPath: string) => {
                                        useCases.theme.updateTheme(theme.id, { path: newPath });
                                        setIsEditingPath(false);
                                    }}
                                />
                            ) : (
                                <AnyTypography
                                    onDoubleClick={() => setIsEditingPath(true)}
                                    sx={{ cursor: 'text', color: pathTextColor, fontWeight: isRoot ? 700 : 500, letterSpacing: 0 }}
                                >
                                    {theme.path.split('/').pop()}
                                </AnyTypography>
                            )}
                        </AnyBox>
                    </ThemeTreeNodeLabel>
                </AnyBox>
            </AnyTableCell>

            <AnyTableCell align="center" sx={{ py: 0.35, px: 0.75, borderBottom: 'none' }}>
                {isEditMode ? (
                    <input
                        type="checkbox"
                        checked={isThemeSelected}
                        onChange={(e) => {
                            devLog('【调试】主题 Checkbox 点击', { themeId: theme.id, checked: (e.target as HTMLInputElement).checked });
                            onSelectionChange('theme', theme.id, (e.target as HTMLInputElement).checked);
                        }}
                        style={{ margin: 0, cursor: 'pointer', transform: 'scale(1.1)' }}
                    />
                ) : (
                    <AnyBox
                        sx={{
                            height: 56,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: statusValue === 'active' ? 'rgba(46, 125, 50, 0.10)' : 'rgba(120, 120, 120, 0.10)',
                            color: statusValue === 'active' ? '#2E7D32' : 'text.secondary',
                            border: `1px solid ${statusValue === 'active' ? 'rgba(46, 125, 50, 0.14)' : 'rgba(120, 120, 120, 0.12)'}`,
                            fontSize: '0.82rem',
                            fontWeight: 600,
                            ...statusShape,
                        }}
                    >
                        {theme.status === 'active' ? '激活' : '归档'}
                    </AnyBox>
                )}
            </AnyTableCell>

            {blocks.map((block) => {
                const cellId = `${theme.id}:${block.id}`;
                const isCellSelected = editorState.selectedCells.has(cellId);

                if (isEditMode) {
                    return (
                        <AnyTableCell key={block.id} align="center" sx={{ py: 0.35, px: 0.75, borderBottom: 'none' }}>
                            <AnyBox
                                sx={{
                                    height: 56,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    backgroundColor: isCellSelected ? alpha(groupColor, 0.18) : 'rgba(148, 163, 184, 0.06)',
                                    borderRadius: '8px',
                                }}
                            >
                                <input
                                    type="checkbox"
                                    checked={isCellSelected}
                                    onChange={(e) => {
                                        devLog('【调试】单元格 Checkbox 点击', { cellId, checked: (e.target as HTMLInputElement).checked });
                                        onSelectionChange('block', cellId, (e.target as HTMLInputElement).checked);
                                    }}
                                    style={{ margin: 0, cursor: 'pointer', transform: 'scale(1.1)' }}
                                />
                            </AnyBox>
                        </AnyTableCell>
                    );
                }

                const state = getBlockState(theme.id, block.id, overridesMap);
                const prevState = prevNode?.theme ? getBlockState(prevNode.theme.id, block.id, overridesMap) : null;
                const nextState = nextNode?.theme ? getBlockState(nextNode.theme.id, block.id, overridesMap) : null;
                const shape = getShape(prevState === state, nextState === state);
                const visual = getStateVisual(state);

                return (
                    <AnyTableCell key={block.id} align="center" sx={{ py: 0.35, px: 0.75, borderBottom: 'none' }}>
                        <AnyTooltip title={visual.title}>
                            <AnyBox
                                onClick={() => onCellClick(block, theme)}
                                sx={{
                                    height: 56,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    backgroundColor: visual.bg,
                                    border: `1px solid ${visual.border}`,
                                    cursor: 'pointer',
                                    ...shape,
                                }}
                            >
                                {visual.icon}
                            </AnyBox>
                        </AnyTooltip>
                    </AnyTableCell>
                );
            })}
        </AnyTableRow>
    );
}
