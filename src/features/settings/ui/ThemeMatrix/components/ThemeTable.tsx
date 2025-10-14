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
import type { ThemeTableProps } from '../types'; // This will need to be updated
import type { EditorState } from '../hooks/useThemeMatrixEditor';
import type { BlockTemplate, ThemeDefinition, ThemeOverride } from '@core/domain/schema';
import type { AppStore } from '@state/AppStore';
import type { ThemeTreeNode } from '../types';

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
}: NewThemeTableProps) {
    const isEditMode = editorState.mode === 'edit';
    const isThemeSelection = editorState.selectionType === 'theme';
    const isBlockSelection = editorState.selectionType === 'block';

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
        <AnyTable size="small" sx={{ tableLayout: 'fixed', '& th, & td': { whiteSpace: 'nowrap', py: 1, px: 1.5 } }}>
            <AnyTableHead>
                <AnyTableRow>
                    <AnyTableCell sx={{ fontWeight: 'bold', width: '300px', minWidth: '300px' }}>
                        主题路径
                    </AnyTableCell>
                    <AnyTableCell align="center" sx={{ fontWeight: 'bold', width: '100px' }}>
                        {isEditMode ? (
                            <AnyCheckbox
                                size="small"
                                disabled={isBlockSelection}
                                // indeterminate={} // TODO: Add indeterminate state
                                // checked={} // TODO: Add checked state
                                // onChange={} // TODO: Add select all themes
                                sx={{ p: 0 }}
                            />
                        ) : '状态'}
                    </AnyTableCell>
                    {blocks.map(b => (
                        <AnyTableCell 
                            key={b.id} 
                            align="center" 
                            sx={{ fontWeight: 'bold', width: '80px', minWidth: '80px' }}
                        >
                            {isEditMode && (
                                <AnyCheckbox
                                    size="small"
                                    disabled={isThemeSelection}
                                    // checked={} // TODO
                                    // onChange={} // TODO
                                    sx={{ p: 0, mr: 0.5 }}
                                />
                            )}
                            {b.name}
                        </AnyTableCell>
                    ))}
                </AnyTableRow>
            </AnyTableHead>
            <AnyTableBody>
                {renderRows()}
            </AnyTableBody>
        </AnyTable>
    );
}
