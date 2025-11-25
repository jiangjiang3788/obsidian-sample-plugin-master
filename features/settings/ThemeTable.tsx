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
} from '@mui/material';
import { ThemeTreeNodeRow } from './ThemeTreeNodeRow';
import type { ThemeTableProps } from './props.types';
import type { EditorState } from './useThemeMatrixEditor';
import type { BlockTemplate, ThemeDefinition, ThemeOverride } from '@/core/types/schema';
import type { AppStore } from '@/app/AppStore';
import type { ThemeTreeNode } from '@/core/theme-matrix/theme.types';

// Define new props inline for now
interface NewThemeTableProps {
    blocks: BlockTemplate[];
    activeThemes: ThemeTreeNode[];
    archivedThemes: ThemeTreeNode[];
    showArchived: boolean;
    overridesMap: Map<string, ThemeOverride>;
    editorState: EditorState;
    appStore: AppStore;
    onCellClick: (block: BlockTemplate, theme: ThemeDefinition) => void;
    onToggleExpand: (themeId: string) => void;
    onSelectionChange: (type: 'theme' | 'block', id: string, isSelected: boolean) => void;
    onSelectAllThemes: (isSelected: boolean) => void;
    onSelectBlockColumn: (blockId: string, isSelected: boolean) => void;
}


export function ThemeTable({
    blocks,
    activeThemes,
    archivedThemes,
    showArchived,
    overridesMap,
    editorState,
    appStore,
    onCellClick,
    onToggleExpand,
    onSelectionChange,
    onSelectAllThemes,
    onSelectBlockColumn,
}: NewThemeTableProps) {
    const isEditMode = editorState.mode === 'edit';
    const isThemeSelection = editorState.selectionType === 'theme';
    const isBlockSelection = editorState.selectionType === 'block';

    // Derived state for header checkboxes
    const allVisibleThemes = showArchived ? [...activeThemes, ...archivedThemes] : activeThemes;
    const allVisibleThemeIds = allVisibleThemes.map(node => node.theme.id);
    const selectedThemeCount = editorState.selectedThemes.size;
    const totalThemeCount = allVisibleThemeIds.length;
    const areAllThemesSelected = totalThemeCount > 0 && selectedThemeCount === totalThemeCount;
    const areSomeThemesSelected = selectedThemeCount > 0 && selectedThemeCount < totalThemeCount;

    // HACK: Cast all MUI components to `any` to resolve Preact/React type conflicts.
    const AnyTable = Table as any;
    const AnyTableHead = TableHead as any;
    const AnyTableRow = TableRow as any;
    const AnyTableCell = TableCell as any;
    const AnyTableBody = TableBody as any;
    const AnyTypography = Typography as any;
    const AnyCheckbox = Checkbox as any;

    const renderRows = () => {
        const rows: h.JSX.Element[] = [];

        if (activeThemes.length > 0) {
            rows.push(
                <AnyTableRow key="active-header">
                    <AnyTableCell colSpan={blocks.length + 2} sx={{ backgroundColor: 'action.hover', py: 0.5 }}>
                        <AnyTypography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                            激活主题 ({activeThemes.length})
                        </AnyTypography>
                    </AnyTableCell>
                </AnyTableRow>
            );
            activeThemes.forEach(node => {
                rows.push(
                    <ThemeTreeNodeRow
                        key={node.theme.id}
                        node={node}
                        blocks={blocks}
                        overridesMap={overridesMap}
                        onCellClick={onCellClick}
                        appStore={appStore}
                        onToggleExpand={onToggleExpand}
                        editorState={editorState}
                        onSelectionChange={onSelectionChange}
                    />
                );
            });
        }

        if (showArchived && archivedThemes.length > 0) {
            rows.push(
                <AnyTableRow key="archived-header">
                    <AnyTableCell colSpan={blocks.length + 2} sx={{ backgroundColor: 'action.hover', py: 0.5 }}>
                        <AnyTypography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                            归档主题 ({archivedThemes.length})
                        </AnyTypography>
                    </AnyTableCell>
                </AnyTableRow>
            );
            archivedThemes.forEach(node => {
                rows.push(
                    <ThemeTreeNodeRow
                        key={node.theme.id}
                        node={node}
                        blocks={blocks}
                        overridesMap={overridesMap}
                        onCellClick={onCellClick}
                        appStore={appStore}
                        onToggleExpand={onToggleExpand}
                        editorState={editorState}
                        onSelectionChange={onSelectionChange}
                    />
                );
            });
        }
        return rows;
    };

    return (
        <AnyTable size="small" sx={{ tableLayout: 'auto', '& th, & td': { whiteSpace: 'nowrap', py: 1, px: 1.5 } }}>
            <AnyTableHead>
                <AnyTableRow>
                    <AnyTableCell sx={{ fontWeight: 'bold', minWidth: '200px' }}>
                        主题路径
                    </AnyTableCell>
                    <AnyTableCell align="center" sx={{ fontWeight: 'bold', width: '100px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                            {isEditMode && (
                                <input
                                    type="checkbox"
                                    disabled={isBlockSelection}
                                    ref={(el) => {
                                        if (el) {
                                            el.indeterminate = areSomeThemesSelected;
                                        }
                                    }}
                                    checked={areAllThemesSelected}
                                    onChange={(e) => onSelectAllThemes((e.target as HTMLInputElement).checked)}
                                    style={{ 
                                        margin: 0, 
                                        cursor: isBlockSelection ? 'not-allowed' : 'pointer',
                                        transform: 'scale(1.2)',
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
                                sx={{ fontWeight: 'bold', width: '40px', minWidth: '40px' }}
                            >
                                {isEditMode && (
                                    <input
                                        type="checkbox"
                                        disabled={isThemeSelection}
                                        ref={(el) => {
                                            if (el) {
                                                el.indeterminate = areSomeWindowsBlockSelected;
                                            }
                                        }}
                                        checked={areAllWindowsBlockSelected}
                                        onChange={(e) => onSelectBlockColumn(b.id, (e.target as HTMLInputElement).checked)}
                                        style={{ 
                                            margin: '0 4px 0 0', 
                                            cursor: isThemeSelection ? 'not-allowed' : 'pointer',
                                            transform: 'scale(1.2)',
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
                {renderRows()}
            </AnyTableBody>
        </AnyTable>
    );
}
