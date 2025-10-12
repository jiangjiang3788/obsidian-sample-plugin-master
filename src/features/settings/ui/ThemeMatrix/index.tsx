// src/features/settings/ui/ThemeMatrix/index.tsx
/** @jsxImportSource preact */
import { h } from 'preact';
import { useStore, AppStore } from '@state/AppStore';
import { 
    Box, Table, TableHead, TableRow, TableCell, TableBody, IconButton, Tooltip, 
    TextField, Button, Stack, Typography, Checkbox, Menu, MenuItem, Chip,
    Collapse, Paper, Alert, Dialog, DialogTitle, DialogContent, DialogActions,
    FormControlLabel, Switch, Divider
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import TaskAltIcon from '@mui/icons-material/TaskAlt';
import CancelIcon from '@mui/icons-material/Cancel';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import FolderIcon from '@mui/icons-material/Folder';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import ArchiveIcon from '@mui/icons-material/Archive';
import UnarchiveIcon from '@mui/icons-material/Unarchive';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import CheckBoxIcon from '@mui/icons-material/CheckBox';
import CheckBoxOutlineBlankIcon from '@mui/icons-material/CheckBoxOutlineBlank';
import IndeterminateCheckBoxIcon from '@mui/icons-material/IndeterminateCheckBox';
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted';
import { useState, useMemo, useEffect } from 'preact/hooks';
import { TemplateEditorModal } from '../components/TemplateEditorModal';
import type { BlockTemplate, ThemeDefinition, ThemeOverride } from '@core/domain/schema';
import { DndContext, closestCenter } from '@dnd-kit/core';
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ThemeManager } from '@core/services/ThemeManager';

// 导入服务
import { ThemeMatrixService } from './services/ThemeMatrixService';

// 导入类型
import type {
    ExtendedTheme,
    ThemeTreeNode,
    InlineEditorProps,
    BatchOperationDialogProps,
    ThemeTreeNodeRowProps,
    ThemeMatrixProps
} from './types';

// 导入工具函数
import { buildThemeTree } from './utils/themeTreeBuilder';
import { 
    handleThemeSelection,
    handleBatchOperation,
    getAllChildIds
} from './utils/themeOperations';

// 导入组件
import { InlineEditor } from './components/InlineEditor';
import { BatchOperationDialog } from './components/BatchOperationDialog';
import { ThemeTreeNodeRow } from './components/ThemeTreeNodeRow';
import { ThemeToolbar } from './components/ThemeToolbar';
import { ThemeTable } from './components/ThemeTable';
import { SelectionModeToggle } from './components/SelectionModeToggle';

// 导入新的Hooks
import { useSelectionMode } from './hooks/useSelectionMode';
import { useBatchOperations } from './hooks/useBatchOperations';

// 主组件
export function ThemeMatrix({ appStore }: ThemeMatrixProps) {
    const { blocks, themes, overrides } = useStore(state => state.settings.inputSettings);
    const [newThemePath, setNewThemePath] = useState('');
    const [editingThemeId, setEditingThemeId] = useState<string | null>(null);
    const [modalOpen, setModalOpen] = useState(false);
    const [modalData, setModalData] = useState<{ block: BlockTemplate; theme: ThemeDefinition; override: ThemeOverride | null } | null>(null);
    const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
    const [contextMenu, setContextMenu] = useState<{ x: number; y: number; theme: ExtendedTheme } | null>(null);
    const [showArchived, setShowArchived] = useState(false);
    const [batchDialogOpen, setBatchDialogOpen] = useState(false);
    const [iconInputDialogOpen, setIconInputDialogOpen] = useState(false);
    const [iconInput, setIconInput] = useState('');
    
    // 初始化服务
    const themeManager = useMemo(() => new ThemeManager(), []);
    const themeService = useMemo(() => new ThemeMatrixService({ appStore, themeManager }), [appStore, themeManager]);
    
    // 获取扩展的主题信息
    const extendedThemes = useMemo(() => {
        return themeService.getExtendedThemes(themes);
    }, [themes, themeService]);
    
    // 构建主题树
    const themeTree = useMemo(() => {
        return buildThemeTree(extendedThemes, expandedNodes);
    }, [extendedThemes, expandedNodes]);
    
    // 使用新的选择模式Hook
    const {
        selectionState,
        selectionStats,
        mode: selectionMode,
        setMode: setSelectionMode,
        toggleThemeSelection,
        toggleBlockSelection,
        toggleCellSelection,
        selectAll,
        clearSelection,
        isSelected,
        isPartiallySelected,
        getSelectedThemeIds
    } = useSelectionMode(themeTree);
    
    // 使用批量操作Hook
    const {
        isProcessing,
        executeBatchOperation,
        batchActivate,
        batchArchive,
        batchDelete,
        batchSetIcon,
        batchSetBlockInherit,
        batchSetBlockOverride,
        batchSetBlockDisabled
    } = useBatchOperations({
        appStore,
        themeManager,
        selectionState,
        onOperationComplete: () => {
            clearSelection();
        }
    });
    
    // 分组主题（激活和归档）
    const { activeThemes, archivedThemes } = useMemo(() => {
        return themeService.groupThemesByStatus(themeTree);
    }, [themeTree, themeService]);
    
    const overridesMap = useMemo(() => {
        const map = new Map<string, ThemeOverride>();
        overrides.forEach(o => map.set(`${o.themeId}:${o.blockId}`, o));
        return map;
    }, [overrides]);
    
    // 处理主题选择（使用新的Hook）
    const handleToggleSelect = (themeId: string, includeChildren: boolean, event?: any) => {
        if (selectionMode === 'theme') {
            toggleThemeSelection(themeId, includeChildren, event);
        }
    };
    
    // 处理全选/取消全选
    const handleSelectAll = () => {
        selectAll();
    };
    
    // 处理节点展开/折叠
    const handleToggleExpand = (themeId: string) => {
        const newExpanded = new Set(expandedNodes);
        if (newExpanded.has(themeId)) {
            newExpanded.delete(themeId);
        } else {
            newExpanded.add(themeId);
        }
        setExpandedNodes(newExpanded);
    };
    
    // 处理右键菜单
    const handleContextMenu = (event: MouseEvent, theme: ExtendedTheme) => {
        event.preventDefault();
        setContextMenu({ x: event.clientX, y: event.clientY, theme });
    };
    
    // 处理批量操作确认
    const handleBatchOperationConfirm = async (operation: 'activate' | 'archive' | 'delete') => {
        if (operation === 'activate') {
            await batchActivate();
        } else if (operation === 'archive') {
            await batchArchive();
        } else if (operation === 'delete') {
            await batchDelete();
        }
    };
    
    const handleAddTheme = () => {
        const path = newThemePath.trim();
        if (path && !themes.some(t => t.path === path)) {
            appStore.addTheme(path);
            setNewThemePath('');
        }
    };
    
    const handleCellClick = (block: BlockTemplate, theme: ThemeDefinition) => {
        if (editingThemeId) return;
        const override = overridesMap.get(`${theme.id}:${block.id}`) || null;
        setModalData({ block, theme, override });
        setModalOpen(true);
    };
    
    return (
        <Box sx={{ maxWidth: '1200px', mx: 'auto' }}>
            <Typography variant="h6" gutterBottom>主题配置矩阵</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                管理不同主题对各类Block的配置。支持树状管理、批量操作和激活/归档功能。
            </Typography>
            
            {/* 工具栏 */}
            <ThemeToolbar
                selectedCount={selectedThemes.size}
                totalCount={extendedThemes.length}
                showArchived={showArchived}
                onSelectAll={handleSelectAll}
                onBatchOperation={() => setBatchDialogOpen(true)}
                onClearSelection={() => setSelectedThemes(new Set())}
                onToggleArchived={setShowArchived}
            />
            
            {/* 主题表格 */}
            <ThemeTable
                blocks={blocks}
                activeThemes={activeThemes}
                archivedThemes={archivedThemes}
                showArchived={showArchived}
                overridesMap={overridesMap}
                selectedThemes={selectedThemes}
                editingThemeId={editingThemeId}
                appStore={appStore}
                onCellClick={handleCellClick}
                onToggleSelect={handleToggleSelect}
                onToggleExpand={handleToggleExpand}
                onContextMenu={handleContextMenu}
                onSetEditingThemeId={setEditingThemeId}
            />
            
            {/* 添加新主题 */}
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 2 }}>
                <TextField 
                    placeholder="新主题路径 (如: 个人/习惯)" 
                    value={newThemePath} 
                    onChange={e => setNewThemePath((e.target as HTMLInputElement).value)} 
                    onKeyDown={e => e.key === 'Enter' && handleAddTheme()} 
                    size="small" 
                    variant="outlined" 
                    sx={{ flexGrow: 1, maxWidth: '400px' }} 
                />
                <Button onClick={handleAddTheme} variant="outlined" size="small" startIcon={<AddIcon />}>
                    添加主题
                </Button>
            </Stack>
            
            {/* 右键菜单 */}
            <Menu
                open={Boolean(contextMenu)}
                onClose={() => setContextMenu(null)}
                anchorReference="anchorPosition"
                anchorPosition={contextMenu ? { top: contextMenu.y, left: contextMenu.x } : undefined}
            >
                {contextMenu?.theme.status === 'active' ? (
                    <MenuItem onClick={() => {
                        themeService.getThemeManager().deactivateTheme(contextMenu.theme.path);
                        setContextMenu(null);
                    }}>
                        <ArchiveIcon sx={{ mr: 1 }} /> 归档
                    </MenuItem>
                ) : (
                    <MenuItem onClick={() => {
                        themeService.getThemeManager().activateTheme(contextMenu!.theme.path);
                        setContextMenu(null);
                    }}>
                        <UnarchiveIcon sx={{ mr: 1 }} /> 激活
                    </MenuItem>
                )}
                <MenuItem onClick={() => {
                    setEditingThemeId(contextMenu!.theme.id);
                    setContextMenu(null);
                }}>
                    <EditIcon sx={{ mr: 1 }} /> 编辑
                </MenuItem>
                <MenuItem onClick={() => {
                    if (confirm(`确定删除主题 "${contextMenu!.theme.path}" 吗？`)) {
                        appStore.deleteTheme(contextMenu!.theme.id);
                    }
                    setContextMenu(null);
                }}>
                    <DeleteIcon sx={{ mr: 1 }} /> 删除
                </MenuItem>
            </Menu>
            
            {/* 批量操作对话框 */}
            <BatchOperationDialog
                open={batchDialogOpen}
                onClose={() => setBatchDialogOpen(false)}
                selectedCount={selectedThemes.size}
                onConfirm={handleBatchOperationConfirm}
            />
            
            {/* 模板编辑器模态框 */}
            {modalData && (
                <TemplateEditorModal 
                    isOpen={modalOpen} 
                    onClose={() => setModalOpen(false)} 
                    block={modalData.block} 
                    theme={modalData.theme} 
                    existingOverride={modalData.override} 
                    appStore={appStore}
                />
            )}
        </Box>
    );
}
