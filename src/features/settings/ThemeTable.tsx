/** @jsxImportSource preact */
import { h } from 'preact';
import {
    Table,
    TableHead,
    TableRow,
    TableCell,
    TableBody,
    Typography,
    Box,
} from '@mui/material';
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
}

const AnyTable = Table as any;
const AnyTableHead = TableHead as any;
const AnyTableRow = TableRow as any;
const AnyTableCell = TableCell as any;
const AnyTableBody = TableBody as any;
const AnyTypography = Typography as any;
const AnyBox = Box as any;

function buildGroups(nodes: ThemeTreeNode[]) {
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
}: ThemeTableProps) {
    const isEditMode = editorState.mode === 'edit';
    const isThemeSelection = editorState.selectionType === 'theme';
    const isBlockSelection = editorState.selectionType === 'block';

    const allVisibleThemes = showArchived ? [...activeThemes, ...archivedThemes] : activeThemes;
    const allVisibleThemeIds = allVisibleThemes
        .map(node => node.themeId)
        .filter((id): id is string => typeof id === 'string' && id.length > 0);

    const selectedVisibleThemeCount = allVisibleThemeIds.filter(id => editorState.selectedThemes.has(id)).length;
    const totalVisibleThemeCount = allVisibleThemeIds.length;

    const areAllThemesSelected = totalVisibleThemeCount > 0 && selectedVisibleThemeCount === totalVisibleThemeCount;
    const areSomeThemesSelected = selectedVisibleThemeCount > 0 && selectedVisibleThemeCount < totalVisibleThemeCount;

    const activeGroups = buildGroups(activeThemes);
    const archivedGroups = buildGroups(archivedThemes);

    const firstColWidth = 280;
    const statusColWidth = 92;
    const blockColWidth = 74;
    const tableWidth = firstColWidth + statusColWidth + blocks.length * blockColWidth;

    const renderGroupRows = (groups: ThemeTreeNode[][]) => {
        const rows: h.JSX.Element[] = [];

        groups.forEach((group, groupIndex) => {
            if (groupIndex > 0) {
                rows.push(
                    <AnyTableRow key={`spacer-${groupIndex}`}>
                        <AnyTableCell colSpan={blocks.length + 2} sx={{ borderBottom: 'none', p: 0, height: 14 }} />
                    </AnyTableRow>
                );
            }

            group.forEach((node, rowIndex) => {
                rows.push(
                    <ThemeTreeNodeRow
                        key={node.id}
                        node={node}
                        groupNodes={group}
                        rowIndex={rowIndex}
                        blocks={blocks}
                        overridesMap={overridesMap}
                        onCellClick={onCellClick}
                        useCases={useCases}
                        onToggleExpand={onToggleExpand}
                        editorState={editorState}
                        onSelectionChange={onSelectionChange}
                    />
                );
            });
        });

        return rows;
    };

    return (
        <AnyBox sx={{ width: '100%', overflowX: 'auto', pb: 1 }}>
            <AnyTable
                size="small"
                sx={{
                    width: tableWidth,
                    minWidth: tableWidth,
                    tableLayout: 'fixed',
                    borderCollapse: 'separate',
                    borderSpacing: '0 0',
                    '& th, & td': {
                        borderBottom: 'none',
                        whiteSpace: 'nowrap',
                        px: 0.75,
                        py: 0.35,
                    },
                }}
            >
                <colgroup>
                    <col style={{ width: `${firstColWidth}px` }} />
                    <col style={{ width: `${statusColWidth}px` }} />
                    {blocks.map((b) => <col key={`col-${b.id}`} style={{ width: `${blockColWidth}px` }} />)}
                </colgroup>
                <AnyTableHead>
                    <AnyTableRow>
                        <AnyTableCell sx={{ fontWeight: 700, color: 'text.secondary', pb: 1.5 }}>
                            主题路径
                        </AnyTableCell>
                        <AnyTableCell align="center" sx={{ fontWeight: 700, color: 'text.secondary', pb: 1.5 }}>
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
                                            opacity: isBlockSelection ? 0.5 : 1,
                                        }}
                                    />
                                )}
                                状态
                            </div>
                        </AnyTableCell>
                        {blocks.map((b) => {
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
                                    sx={{ fontWeight: 700, color: 'text.secondary', pb: 1.5 }}
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
                                                opacity: isThemeSelection ? 0.5 : 1,
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
                    {renderGroupRows(activeGroups)}
                    {showArchived && archivedGroups.length > 0 && (
                        <>
                            <AnyTableRow>
                                <AnyTableCell colSpan={blocks.length + 2} sx={{ pt: 2.5, pb: 1, borderBottom: 'none' }}>
                                    <AnyTypography variant="body2" sx={{ color: 'text.secondary', fontWeight: 700 }}>
                                        归档主题
                                    </AnyTypography>
                                </AnyTableCell>
                            </AnyTableRow>
                            {renderGroupRows(archivedGroups)}
                        </>
                    )}
                </AnyTableBody>
            </AnyTable>
        </AnyBox>
    );
}
