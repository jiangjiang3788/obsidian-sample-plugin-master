/** @jsxImportSource preact */
import { h } from 'preact';
import { Box, TableRow, TableCell, Tooltip, Typography, Chip } from '@mui/material';
import { ThemeTreeNodeLabel } from '@shared/public';
import TaskAltIcon from '@mui/icons-material/TaskAlt';
import CancelIcon from '@mui/icons-material/Cancel';
import EditIcon from '@mui/icons-material/Edit';
import { useState } from 'preact/hooks';
import { InlineEditor } from './InlineEditor';
import type { EditorState } from './useThemeMatrixEditor';
import type { BlockTemplate, ThemeDefinition, ThemeOverride } from '@core/public';
import type { UseCases } from '@/app/public';
import type { ThemePathTreeFlatNode as ThemeTreeNode } from '@core/public';

const AnyTableRow = TableRow as any;
const AnyTableCell = TableCell as any;
const AnyTooltip = Tooltip as any;
const AnyTypography = Typography as any;
const AnyChip = Chip as any;
const AnyBox = Box as any;

interface ThemeTreeNodeRowProps {
    node: ThemeTreeNode;
    blocks: BlockTemplate[];
    overridesMap: Map<string, ThemeOverride>;
    useCases: UseCases;
    onCellClick: (block: BlockTemplate, theme: ThemeDefinition) => void;
    onToggleExpand: (themeId: string) => void;
    editorState: EditorState;
    onSelectionChange: (type: 'theme' | 'block', id: string, isSelected: boolean) => void;
    groupNodes: ThemeTreeNode[];
    rowIndexInGroup: number;
}

type CellKind = 'inherit' | 'override' | 'disabled' | 'active' | 'archived';

const PATH_COL_WIDTH = 250;
const STATUS_COL_WIDTH = 78;
const BLOCK_COL_WIDTH = 58;
const SEGMENT_HEIGHT = 40;
const SEGMENT_RADIUS = 8;

function getBlockKind(themeId: string, blockId: string, overridesMap: Map<string, ThemeOverride>): CellKind {
    const override = overridesMap.get(`${themeId}:${blockId}`);
    if (!override) return 'inherit';
    return override.disabled ? 'disabled' : 'override';
}

function getSurfaceForKind(kind: CellKind) {
    switch (kind) {
        case 'override':
            return { bg: 'rgba(137, 99, 255, 0.16)', color: '#7b4ce2' };
        case 'disabled':
            return { bg: 'rgba(220, 76, 76, 0.14)', color: '#c83b3b' };
        case 'active':
            return { bg: 'rgba(88, 160, 103, 0.14)', color: '#2d8a43' };
        case 'archived':
            return { bg: 'rgba(120, 120, 120, 0.12)', color: 'text.secondary' };
        default:
            return { bg: 'rgba(96, 160, 96, 0.12)', color: '#2d8a43' };
    }
}

function getSegmentRadius(prevSame: boolean, nextSame: boolean) {
    if (prevSame && nextSame) return '0';
    if (prevSame && !nextSame) return `0 0 ${SEGMENT_RADIUS}px ${SEGMENT_RADIUS}px`;
    if (!prevSame && nextSame) return `${SEGMENT_RADIUS}px ${SEGMENT_RADIUS}px 0 0`;
    return `${SEGMENT_RADIUS}px`;
}

export function ThemeTreeNodeRow({
    node,
    blocks,
    overridesMap,
    onCellClick,
    useCases,
    onToggleExpand,
    editorState,
    onSelectionChange,
    groupNodes,
    rowIndexInGroup,
}: ThemeTreeNodeRowProps) {
    const theme = node.theme;
    if (!theme) return null;

    const children = node.children ?? [];
    const expanded = !!node.expanded;
    const level = node.depth;
    const prevNode = rowIndexInGroup > 0 ? groupNodes[rowIndexInGroup - 1] : null;
    const nextNode = rowIndexInGroup < groupNodes.length - 1 ? groupNodes[rowIndexInGroup + 1] : null;
    const isRoot = level === 0;

    const [isEditingPath, setIsEditingPath] = useState(false);
    const [isEditingIcon, setIsEditingIcon] = useState(false);

    const isEditMode = editorState.mode === 'edit';
    const isThemeSelected = editorState.selectedThemes.has(theme.id);

    const themeCellBg = isRoot
        ? 'rgba(122, 94, 230, 0.22)'
        : 'rgba(122, 94, 230, 0.07)';

    const stateKind: CellKind = theme.status === 'active' ? 'active' : 'archived';
    const prevStateKind: CellKind | null = prevNode?.theme ? (prevNode.theme.status === 'active' ? 'active' : 'archived') : null;
    const nextStateKind: CellKind | null = nextNode?.theme ? (nextNode.theme.status === 'active' ? 'active' : 'archived') : null;

    const renderSegment = (kind: CellKind, prevSame: boolean, nextSame: boolean, content: h.JSX.Element, onClick?: () => void) => {
        const surface = getSurfaceForKind(kind);
        return (
            <AnyBox
                onClick={onClick}
                sx={{
                    height: `${SEGMENT_HEIGHT}px`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: surface.bg,
                    color: surface.color,
                    borderRadius: getSegmentRadius(prevSame, nextSame),
                    cursor: onClick ? 'pointer' : 'default',
                    userSelect: 'none',
                    mx: '2px',
                }}
            >
                {content}
            </AnyBox>
        );
    };

    return (
        <AnyTableRow
            sx={{
                opacity: theme.status === 'inactive' ? 0.6 : 1,
                backgroundColor: isThemeSelected ? 'action.selected' : 'transparent',
            }}
        >
            <AnyTableCell sx={{ width: PATH_COL_WIDTH, px: 0.5, py: 0.25 }}>
                <AnyBox
                    sx={{
                        minHeight: `${SEGMENT_HEIGHT}px`,
                        display: 'flex',
                        alignItems: 'center',
                        borderRadius: 2,
                        backgroundColor: themeCellBg,
                        px: isRoot ? 1 : 0.75,
                    }}
                >
                    <ThemeTreeNodeLabel
                        depth={level}
                        hasChildren={children.length > 0}
                        expanded={expanded}
                        onToggleExpand={() => onToggleExpand(theme.id)}
                        basePadding={0}
                        indentUnit={1.5}
                        placeholderWidthPx={22}
                    >
                        <AnyBox sx={{ flex: 1, display: 'flex', alignItems: 'center', gap: 0.75, minWidth: 0 }}>
                            {isEditingIcon ? (
                                <InlineEditor
                                    value={theme.icon || ''}
                                    onSave={(newIcon: string) => {
                                        useCases.theme.updateTheme(theme.id, { icon: newIcon });
                                        setIsEditingIcon(false);
                                    }}
                                />
                            ) : (
                                <AnyTypography
                                    sx={{ cursor: 'text', width: '20px', textAlign: 'center', flexShrink: 0 }}
                                    onDoubleClick={() => setIsEditingIcon(true)}
                                >
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
                                    sx={{
                                        cursor: 'text',
                                        fontWeight: isRoot ? 700 : 500,
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap',
                                    }}
                                >
                                    {theme.path.split('/').pop()}
                                </AnyTypography>
                            )}
                        </AnyBox>
                    </ThemeTreeNodeLabel>
                </AnyBox>
            </AnyTableCell>

            <AnyTableCell align="center" sx={{ width: STATUS_COL_WIDTH, px: 0.25, py: 0 }}>
                {isEditMode ? (
                    <input
                        type="checkbox"
                        checked={isThemeSelected}
                        onChange={(e) => onSelectionChange('theme', theme.id, (e.target as HTMLInputElement).checked)}
                        style={{ margin: 0, cursor: 'pointer', transform: 'scale(1.1)' }}
                    />
                ) : renderSegment(
                    stateKind,
                    prevStateKind === stateKind,
                    nextStateKind === stateKind,
                    <AnyChip
                        label={theme.status === 'active' ? '激活' : '归档'}
                        size="small"
                        sx={{
                            fontWeight: 700,
                            backgroundColor: 'transparent',
                            color: 'inherit',
                            height: '24px',
                            '& .MuiChip-label': { px: 0 },
                        }}
                    />
                )}
            </AnyTableCell>

            {blocks.map(block => {
                const cellId = `${theme.id}:${block.id}`;
                const isCellSelected = editorState.selectedCells.has(cellId);
                const kind = getBlockKind(theme.id, block.id, overridesMap);
                const prevKind = prevNode?.theme ? getBlockKind(prevNode.theme.id, block.id, overridesMap) : null;
                const nextKind = nextNode?.theme ? getBlockKind(nextNode.theme.id, block.id, overridesMap) : null;

                if (isEditMode) {
                    return (
                        <AnyTableCell key={block.id} align="center" sx={{ p: 0, width: BLOCK_COL_WIDTH }}>
                            <input
                                type="checkbox"
                                checked={isCellSelected}
                                onChange={(e) => onSelectionChange('block', cellId, (e.target as HTMLInputElement).checked)}
                                style={{ margin: 0, cursor: 'pointer', transform: 'scale(1.1)' }}
                            />
                        </AnyTableCell>
                    );
                }

                let cellIcon: h.JSX.Element;
                let cellTitle = '继承';
                if (kind === 'disabled') {
                    cellIcon = <CancelIcon sx={{ fontSize: '1rem', color: 'inherit' }} />;
                    cellTitle = '已禁用';
                } else if (kind === 'override') {
                    cellIcon = <EditIcon sx={{ fontSize: '1rem', color: 'inherit' }} />;
                    cellTitle = '已覆写';
                } else {
                    cellIcon = <TaskAltIcon sx={{ fontSize: '1rem', color: 'inherit' }} />;
                }

                return (
                    <AnyTableCell key={block.id} align="center" sx={{ width: BLOCK_COL_WIDTH, px: 0.25, py: 0 }}>
                        <AnyTooltip title={cellTitle}>
                            {renderSegment(
                                kind,
                                prevKind === kind,
                                nextKind === kind,
                                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{cellIcon}</span>,
                                () => onCellClick(block, theme)
                            )}
                        </AnyTooltip>
                    </AnyTableCell>
                );
            })}
        </AnyTableRow>
    );
}
