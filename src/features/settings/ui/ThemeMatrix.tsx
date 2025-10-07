// src/features/settings/ui/ThemeMatrix.tsx
/** @jsxImportSource preact */
import { h } from 'preact';
import { useStore, AppStore } from '@state/AppStore';
import { 
    Box, Table, TableHead, TableRow, TableCell, TableBody, IconButton, Tooltip, 
    TextField, Button, Stack, Typography, Checkbox, Menu, MenuItem, Chip,
    Collapse, Paper, Alert, Dialog, DialogTitle, DialogContent, DialogActions,
    FormControlLabel, Switch
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
import { useState, useMemo, useEffect } from 'preact/hooks';
import { TemplateEditorModal } from './components/TemplateEditorModal';
import type { BlockTemplate, ThemeDefinition, ThemeOverride } from '@core/domain/schema';
import { DndContext, closestCenter } from '@dnd-kit/core';
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ThemeManager } from '@core/services/ThemeManager';

// 扩展的主题定义
interface ExtendedTheme extends ThemeDefinition {
    status?: 'active' | 'inactive';
    source?: 'predefined' | 'discovered';
    usageCount?: number;
    lastUsed?: number;
    parentId?: string | null;
}

// 主题树节点
interface ThemeTreeNode {
    theme: ExtendedTheme;
    children: ThemeTreeNode[];
    expanded: boolean;
    level: number;
}

// 内联编辑器组件
function InlineEditor({ value, onSave }: { value: string, onSave: (newValue: string) => void }) {
    const [current, setCurrent] = useState(value);
    const handleBlur = () => { if (current.trim() !== value) { onSave(current.trim()); }};
    const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
        if (e.key === 'Escape') { setCurrent(value); (e.target as HTMLInputElement).blur(); }
    };
    return ( 
        <TextField 
            autoFocus 
            fullWidth 
            variant="standard" 
            value={current} 
            onChange={e => setCurrent((e.target as HTMLInputElement).value)} 
            onBlur={handleBlur} 
            onKeyDown={handleKeyDown} 
            sx={{ '& .MuiInput-input': { py: '4px' } }}
        />
    );
}

// 批量操作对话框
function BatchOperationDialog({ 
    open, 
    onClose, 
    selectedCount, 
    onConfirm 
}: { 
    open: boolean;
    onClose: () => void;
    selectedCount: number;
    onConfirm: (operation: 'activate' | 'archive' | 'delete') => void;
}) {
    const [operation, setOperation] = useState<'activate' | 'archive' | 'delete'>('activate');
    
    return (
        <Dialog open={open} onClose={onClose}>
            <DialogTitle>批量操作</DialogTitle>
            <DialogContent>
                <Typography variant="body2" sx={{ mb: 2 }}>
                    已选择 {selectedCount} 个主题
                </Typography>
                <Stack spacing={2}>
                    <FormControlLabel
                        control={<Switch checked={operation === 'activate'} onChange={() => setOperation('activate')} />}
                        label="批量激活"
                    />
                    <FormControlLabel
                        control={<Switch checked={operation === 'archive'} onChange={() => setOperation('archive')} />}
                        label="批量归档"
                    />
                    <FormControlLabel
                        control={<Switch checked={operation === 'delete'} onChange={() => setOperation('delete')} />}
                        label="批量删除（仅限非预定义主题）"
                    />
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>取消</Button>
                <Button onClick={() => { onConfirm(operation); onClose(); }} variant="contained">
                    确认
                </Button>
            </DialogActions>
        </Dialog>
    );
}

// 主题树节点组件
function ThemeTreeNodeRow({ 
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
}: { 
    node: ThemeTreeNode;
    blocks: BlockTemplate[];
    overridesMap: Map<string, ThemeOverride>;
    handleCellClick: (block: BlockTemplate, theme: ThemeDefinition) => void;
    editingThemeId: string | null;
    setEditingThemeId: (id: string | null) => void;
    appStore: AppStore;
    selectedThemes: Set<string>;
    onToggleSelect: (themeId: string, includeChildren: boolean) => void;
    onToggleExpand: (themeId: string) => void;
    onContextMenu: (event: MouseEvent, theme: ExtendedTheme) => void;
}) {
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

// 主组件
export function ThemeMatrix({ appStore }: { appStore: AppStore }) {
    const { blocks, themes, overrides } = useStore(state => state.settings.inputSettings);
    const [newThemePath, setNewThemePath] = useState('');
    const [editingThemeId, setEditingThemeId] = useState<string | null>(null);
    const [modalOpen, setModalOpen] = useState(false);
    const [modalData, setModalData] = useState<{ block: BlockTemplate; theme: ThemeDefinition; override: ThemeOverride | null } | null>(null);
    const [selectedThemes, setSelectedThemes] = useState<Set<string>>(new Set());
    const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
    const [contextMenu, setContextMenu] = useState<{ x: number; y: number; theme: ExtendedTheme } | null>(null);
    const [showArchived, setShowArchived] = useState(false);
    const [batchDialogOpen, setBatchDialogOpen] = useState(false);
    
    // 初始化 ThemeManager - 注意：ThemeManager 不需要 appStore 参数
    const themeManager = useMemo(() => new ThemeManager(), []);
    
    // 获取扩展的主题信息
    const extendedThemes = useMemo(() => {
        return themes.map(theme => {
            const themeData = themeManager.getThemeByPath(theme.path);
            return {
                ...theme,
                status: themeData?.status || 'active',
                source: 'predefined' as const,
                usageCount: themeData?.usageCount || 0,
                lastUsed: themeData?.lastUsed
            } as ExtendedTheme;
        });
    }, [themes, themeManager]);
    
    // 构建主题树
    const themeTree = useMemo(() => {
        const buildTree = (themes: ExtendedTheme[], parentPath: string = '', level: number = 0): ThemeTreeNode[] => {
            const nodes: ThemeTreeNode[] = [];
            const directChildren = themes.filter(theme => {
                const path = theme.path;
                if (parentPath === '') {
                    return !path.includes('/');
                }
                return path.startsWith(parentPath + '/') && 
                       path.slice(parentPath.length + 1).indexOf('/') === -1;
            });
            
            directChildren.forEach(theme => {
                const children = buildTree(
                    themes.filter(t => t.path.startsWith(theme.path + '/')),
                    theme.path,
                    level + 1
                );
                
                nodes.push({
                    theme,
                    children,
                    expanded: expandedNodes.has(theme.id),
                    level
                });
            });
            
            return nodes;
        };
        
        return buildTree(extendedThemes);
    }, [extendedThemes, expandedNodes]);
    
    // 分组主题（激活和归档）
    const { activeThemes, archivedThemes } = useMemo(() => {
        const active: ThemeTreeNode[] = [];
        const archived: ThemeTreeNode[] = [];
        
        themeTree.forEach(node => {
            if (node.theme.status === 'active') {
                active.push(node);
            } else {
                archived.push(node);
            }
        });
        
        return { activeThemes: active, archivedThemes: archived };
    }, [themeTree]);
    
    const overridesMap = useMemo(() => {
        const map = new Map<string, ThemeOverride>();
        overrides.forEach(o => map.set(`${o.themeId}:${o.blockId}`, o));
        return map;
    }, [overrides]);
    
    // 处理主题选择
    const handleToggleSelect = (themeId: string, includeChildren: boolean) => {
        const newSelected = new Set(selectedThemes);
        
        const toggleNode = (nodeId: string) => {
            if (newSelected.has(nodeId)) {
                newSelected.delete(nodeId);
            } else {
                newSelected.add(nodeId);
            }
        };
        
        toggleNode(themeId);
        
        if (includeChildren) {
            const findAndToggleChildren = (nodes: ThemeTreeNode[]) => {
                nodes.forEach(node => {
                    if (node.theme.id === themeId || newSelected.has(node.theme.id)) {
                        node.children.forEach(child => {
                            toggleNode(child.theme.id);
                            findAndToggleChildren([child]);
                        });
                    }
                });
            };
            findAndToggleChildren(themeTree);
        }
        
        setSelectedThemes(newSelected);
    };
    
    // 处理全选/取消全选
    const handleSelectAll = () => {
        if (selectedThemes.size === extendedThemes.length) {
            setSelectedThemes(new Set());
        } else {
            setSelectedThemes(new Set(extendedThemes.map(t => t.id)));
        }
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
    
    // 处理批量操作
    const handleBatchOperation = (operation: 'activate' | 'archive' | 'delete') => {
        selectedThemes.forEach(themeId => {
            const theme = extendedThemes.find(t => t.id === themeId);
            if (theme) {
                if (operation === 'activate') {
                    themeManager.activateTheme(theme.path);
                } else if (operation === 'archive') {
                    themeManager.deactivateTheme(theme.path);
                } else if (operation === 'delete' && theme.source !== 'predefined') {
                    appStore.deleteTheme(themeId);
                }
            }
        });
        setSelectedThemes(new Set());
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
            <Paper sx={{ p: 2, mb: 2 }}>
                <Stack direction="row" spacing={2} alignItems="center">
                    <Button 
                        variant="outlined" 
                        onClick={handleSelectAll}
                        startIcon={selectedThemes.size === extendedThemes.length ? <CheckBoxIcon /> : <CheckBoxOutlineBlankIcon />}
                    >
                        {selectedThemes.size === extendedThemes.length ? '取消全选' : '全选'}
                    </Button>
                    
                    {selectedThemes.size > 0 && (
                        <div style={{ display: 'contents' }}>
                            <Button
                                variant="outlined" 
                                onClick={() => setBatchDialogOpen(true)}
                            >
                                批量操作 ({selectedThemes.size})
                            </Button>
                            <Button 
                                variant="outlined" 
                                color="error"
                                onClick={() => setSelectedThemes(new Set())}
                            >
                                清除选择
                            </Button>
                        </div>
                    )}
                    
                    <Box sx={{ flex: 1 }} />
                    
                    <FormControlLabel
                        control={<Switch checked={showArchived} onChange={(e) => setShowArchived((e.target as any).checked)} />}
                        label="显示归档主题"
                    />
                </Stack>
            </Paper>
            
            {/* 主题表格 */}
            <Table size="small" sx={{ '& th, & td': { whiteSpace: 'nowrap', py: 1, px: 1.5 } }}>
                <TableHead>
                    <TableRow>
                        <TableCell sx={{ width: '40px' }}>
                            <Checkbox
                                checked={selectedThemes.size === extendedThemes.length}
                                indeterminate={selectedThemes.size > 0 && selectedThemes.size < extendedThemes.length}
                                onChange={handleSelectAll}
                                sx={{ padding: '4px' }}
                            />
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
                                    handleCellClick={handleCellClick}
                                    editingThemeId={editingThemeId}
                                    setEditingThemeId={setEditingThemeId}
                                    appStore={appStore}
                                    selectedThemes={selectedThemes}
                                    onToggleSelect={handleToggleSelect}
                                    onToggleExpand={handleToggleExpand}
                                    onContextMenu={handleContextMenu}
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
                                    handleCellClick={handleCellClick}
                                    editingThemeId={editingThemeId}
                                    setEditingThemeId={setEditingThemeId}
                                    appStore={appStore}
                                    selectedThemes={selectedThemes}
                                    onToggleSelect={handleToggleSelect}
                                    onToggleExpand={handleToggleExpand}
                                    onContextMenu={handleContextMenu}
                                />
                            ))}
                        </div>
                    )}
                </TableBody>
            </Table>
            
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
                        themeManager.deactivateTheme(contextMenu.theme.path);
                        setContextMenu(null);
                    }}>
                        <ArchiveIcon sx={{ mr: 1 }} /> 归档
                    </MenuItem>
                ) : (
                    <MenuItem onClick={() => {
                        themeManager.activateTheme(contextMenu!.theme.path);
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
                onConfirm={handleBatchOperation}
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
