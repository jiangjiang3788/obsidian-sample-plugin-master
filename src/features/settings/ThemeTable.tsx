/** @jsxImportSource preact */
import { h } from 'preact';
import {
    Table,
    TableHead,
    TableRow,
    TableCell,
    TableBody,
    Typography,
} from '@mui/material';
import { useRef, useState } from 'preact/hooks';
import { ThemeTreeNodeRow } from './ThemeTreeNodeRow';
import type { EditorState } from './useThemeMatrixEditor';
import type { BlockTemplate, ThemeDefinition, ThemeOverride } from '@core/public';
import type { UseCases } from '@/app/public';
import type { ThemePathTreeFlatNode as ThemeTreeNode } from '@core/public';

interface ThemeTableProps {
    blocks: BlockTemplate[];
    activeThemes: ThemeTreeNode[];
    archivedThemes: ThemeTreeNode[];
    showArchived: boolean;
    overridesMap: Map<string, ThemeOverride>;
    editorState: EditorState;
    useCases: UseCases;
    onCellClick: (block: BlockTemplate, theme: ThemeDefinition) => void;
    onToggleExpand: (themeId: string) => void;
    onSelectionChange: (type: 'theme' | 'block', id: string, isSelected: boolean) => void;
    onSelectAllThemes: (isSelected: boolean) => void;
    onSelectBlockColumn: (blockId: string, isSelected: boolean) => void;
    onReorderThemeSiblings: (orderedThemeIds: string[], parentKey?: string) => void | Promise<void>;
}

const AnyTable = Table as any;
const AnyTableHead = TableHead as any;
const AnyTableRow = TableRow as any;
const AnyTableCell = TableCell as any;
const AnyTableBody = TableBody as any;
const AnyTypography = Typography as any;

const PATH_COL_WIDTH = 250;
const STATUS_COL_WIDTH = 78;
const BLOCK_COL_WIDTH = 58;

type DropPosition = 'before' | 'after';

function splitByRoot(nodes: ThemeTreeNode[]): ThemeTreeNode[][] {
    const groups: ThemeTreeNode[][] = [];
    let current: ThemeTreeNode[] = [];

    nodes.forEach((node) => {
        if (node.depth === 0) {
            if (current.length > 0) groups.push(current);
            current = [node];
        } else if (current.length > 0) {
            current.push(node);
        } else {
            current = [node];
        }
    });

    if (current.length > 0) groups.push(current);
    return groups;
}

function getNodeParentKey(node: ThemeTreeNode): string {
    return node.parentId ?? '__root__';
}

function canDropOnNode(dragged: ThemeTreeNode | null, target: ThemeTreeNode): boolean {
    if (!dragged || !dragged.themeId || !target.themeId) return false;
    if (dragged.themeId === target.themeId) return false;
    return dragged.depth === target.depth && getNodeParentKey(dragged) === getNodeParentKey(target);
}

function reorderIds(ids: string[], draggedId: string, targetId: string, position: DropPosition): string[] {
    const withoutDragged = ids.filter(id => id !== draggedId);
    const targetIndex = withoutDragged.indexOf(targetId);
    if (targetIndex < 0) return ids;

    const insertIndex = position === 'after' ? targetIndex + 1 : targetIndex;
    const next = [...withoutDragged];
    next.splice(insertIndex, 0, draggedId);
    return next;
}

export function ThemeTable({
    blocks,
    activeThemes,
    archivedThemes,
    showArchived,
    overridesMap,
    editorState,
    useCases,
    onCellClick,
    onToggleExpand,
    onSelectionChange,
    onSelectAllThemes,
    onSelectBlockColumn,
    onReorderThemeSiblings,
}: ThemeTableProps) {
    const isEditMode = editorState.mode === 'edit';
    const isThemeSelection = editorState.selectionType === 'theme';
    const isBlockSelection = editorState.selectionType === 'block';

    const [draggedNode, setDraggedNode] = useState<ThemeTreeNode | null>(null);
    const [dropTarget, setDropTarget] = useState<{ themeId: string; position: DropPosition } | null>(null);
    const draggedNodeRef = useRef<ThemeTreeNode | null>(null);
    const dropTargetRef = useRef<{ themeId: string; position: DropPosition } | null>(null);

    const allVisibleThemes = showArchived ? [...activeThemes, ...archivedThemes] : activeThemes;
    const allVisibleThemeIds = allVisibleThemes
        .map(node => node.themeId)
        .filter((id): id is string => typeof id === 'string' && id.length > 0);

    const selectedVisibleThemeCount = allVisibleThemeIds.filter(id => editorState.selectedThemes.has(id)).length;
    const totalVisibleThemeCount = allVisibleThemeIds.length;
    const areAllThemesSelected = totalVisibleThemeCount > 0 && selectedVisibleThemeCount === totalVisibleThemeCount;
    const areSomeThemesSelected = selectedVisibleThemeCount > 0 && selectedVisibleThemeCount < totalVisibleThemeCount;

    const activeGroups = splitByRoot(activeThemes);

    const clearDragState = () => {
        draggedNodeRef.current = null;
        dropTargetRef.current = null;
        setDraggedNode(null);
        setDropTarget(null);
    };

    const handleDragStart = (node: ThemeTreeNode) => {
        if (!node.themeId) return;
        draggedNodeRef.current = node;
        dropTargetRef.current = null;
        setDraggedNode(node);
        setDropTarget(null);
    };

    const handleDragOverRow = (node: ThemeTreeNode, event: DragEvent) => {
        const currentDragged = draggedNodeRef.current;
        if (!canDropOnNode(currentDragged, node)) {
            if (dropTargetRef.current !== null) {
                dropTargetRef.current = null;
                setDropTarget(null);
            }
            return;
        }

        event.preventDefault();
        if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';

        const row = event.currentTarget as HTMLElement | null;
        const rect = row?.getBoundingClientRect();
        const position: DropPosition = rect && event.clientY > rect.top + rect.height / 2 ? 'after' : 'before';
        const nextTarget = { themeId: node.themeId!, position };
        const prevTarget = dropTargetRef.current;

        // dragover 高频触发。只有目标行或 before/after 真变化时才更新状态，避免子主题拖动卡顿。
        if (!prevTarget || prevTarget.themeId !== nextTarget.themeId || prevTarget.position !== nextTarget.position) {
            dropTargetRef.current = nextTarget;
            setDropTarget(nextTarget);
        }
    };

    const handleDropRow = async (node: ThemeTreeNode) => {
        const currentDragged = draggedNodeRef.current;
        const currentDropTarget = dropTargetRef.current;

        if (!currentDragged?.themeId || !node.themeId || !currentDropTarget || currentDropTarget.themeId !== node.themeId) {
            clearDragState();
            return;
        }

        if (!canDropOnNode(currentDragged, node)) {
            clearDragState();
            return;
        }

        const parentKey = getNodeParentKey(node);
        const siblings = allVisibleThemes.filter(candidate =>
            candidate.themeId &&
            candidate.depth === node.depth &&
            getNodeParentKey(candidate) === parentKey
        );
        const siblingIds = siblings.map(candidate => candidate.themeId).filter((id): id is string => !!id);
        const orderedIds = reorderIds(siblingIds, currentDragged.themeId, node.themeId, currentDropTarget.position);

        clearDragState();

        if (orderedIds.join('|') !== siblingIds.join('|')) {
            await onReorderThemeSiblings(orderedIds, parentKey);
        }
    };

    const handleDragEnd = () => {
        clearDragState();
    };

    const renderGroupRows = (group: ThemeTreeNode[], groupIndex: number) => {
        const rows: h.JSX.Element[] = [];
        if (groupIndex > 0) {
            rows.push(
                <AnyTableRow key={`spacer-${groupIndex}`}>
                    <AnyTableCell
                        colSpan={blocks.length + 2}
                        sx={{
                            border: 0,
                            p: 0,
                            height: 10,
                            background: 'transparent',
                        }}
                    />
                </AnyTableRow>
            );
        }

        group.forEach((node, index) => {
            const isDropTarget = !!dropTarget && dropTarget.themeId === node.themeId;
            rows.push(
                <ThemeTreeNodeRow
                    key={node.id}
                    node={node}
                    blocks={blocks}
                    overridesMap={overridesMap}
                    onCellClick={onCellClick}
                    useCases={useCases}
                    onToggleExpand={onToggleExpand}
                    editorState={editorState}
                    onSelectionChange={onSelectionChange}
                    groupNodes={group}
                    rowIndexInGroup={index}
                    dragEnabled={!isEditMode}
                    isDragging={!!draggedNode?.themeId && draggedNode.themeId === node.themeId}
                    isDropTarget={isDropTarget}
                    dropPosition={isDropTarget ? dropTarget!.position : null}
                    onDragStartTheme={handleDragStart}
                    onDragOverTheme={handleDragOverRow}
                    onDropTheme={handleDropRow}
                    onDragEndTheme={handleDragEnd}
                />
            );
        });
        return rows;
    };

    return (
        <AnyTable
            size="small"
            sx={{
                tableLayout: 'fixed',
                width: 'max-content',
                minWidth: '100%',
                borderCollapse: 'separate',
                borderSpacing: '0 0',
                '& th': {
                    whiteSpace: 'nowrap',
                    py: 0.5,
                    px: 0.75,
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                },
                '& td': {
                    whiteSpace: 'nowrap',
                    py: 0,
                    px: 0.5,
                    borderBottom: 'none',
                }
            }}
        >
            <AnyTableHead>
                <AnyTableRow>
                    <AnyTableCell sx={{ fontWeight: 'bold', width: PATH_COL_WIDTH }}>
                        主题路径
                    </AnyTableCell>
                    <AnyTableCell align="center" sx={{ fontWeight: 'bold', width: STATUS_COL_WIDTH }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                            {isEditMode && (
                                <input
                                    type="checkbox"
                                    disabled={isBlockSelection}
                                    ref={(el) => {
                                        if (el) el.indeterminate = areSomeThemesSelected;
                                    }}
                                    checked={areAllThemesSelected}
                                    onChange={(e) => onSelectAllThemes((e.target as HTMLInputElement).checked)}
                                    style={{
                                        margin: 0,
                                        cursor: isBlockSelection ? 'not-allowed' : 'pointer',
                                        transform: 'scale(1.1)',
                                        opacity: isBlockSelection ? 0.5 : 1
                                    }}
                                />
                            )}
                            状态
                        </div>
                    </AnyTableCell>
                    {blocks.map(b => {
                        const allCellIdsForBlock = allVisibleThemeIds.map(themeId => `${themeId}:${b.id}`);
                        const selectedCellCountForBlock = allCellIdsForBlock.filter(cellId =>
                            editorState.selectedCells.has(cellId)
                        ).length;
                        const totalCellCountForBlock = allVisibleThemeIds.length;
                        const areAllWindowsBlockSelected =
                            totalCellCountForBlock > 0 && selectedCellCountForBlock === totalCellCountForBlock;
                        const areSomeWindowsBlockSelected =
                            selectedCellCountForBlock > 0 && selectedCellCountForBlock < totalCellCountForBlock;

                        return (
                            <AnyTableCell
                                key={b.id}
                                align="center"
                                sx={{ fontWeight: 'bold', width: BLOCK_COL_WIDTH, minWidth: BLOCK_COL_WIDTH }}
                            >
                                {isEditMode && (
                                    <input
                                        type="checkbox"
                                        disabled={isThemeSelection}
                                        ref={(el) => {
                                            if (el) el.indeterminate = areSomeWindowsBlockSelected;
                                        }}
                                        checked={areAllWindowsBlockSelected}
                                        onChange={(e) => onSelectBlockColumn(b.id, (e.target as HTMLInputElement).checked)}
                                        style={{
                                            margin: '0 4px 0 0',
                                            cursor: isThemeSelection ? 'not-allowed' : 'pointer',
                                            transform: 'scale(1.1)',
                                            opacity: isThemeSelection ? 0.5 : 1
                                        }}
                                    />
                                )}
                                {b.name}
                            </AnyTableCell>
                        );
                    })}
                </AnyTableRow>
            </AnyTableHead>
            <AnyTableBody>
                {activeGroups.length > 0 ? activeGroups.flatMap(renderGroupRows) : (
                    <AnyTableRow>
                        <AnyTableCell colSpan={blocks.length + 2} sx={{ py: 2 }}>
                            <AnyTypography variant="body2" color="text.secondary">
                                暂无主题
                            </AnyTypography>
                        </AnyTableCell>
                    </AnyTableRow>
                )}
            </AnyTableBody>
        </AnyTable>
    );
}
