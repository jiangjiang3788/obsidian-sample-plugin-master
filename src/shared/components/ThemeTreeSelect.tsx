/**
 * ThemeTreeSelect - 统一主题树选择组件
 * 
 * 可被 QuickInput、ThemeMatrix、AI Chat 等模块共用
 */
/** @jsxImportSource preact */
import { h } from 'preact';
import { useState, useMemo, useCallback, useRef, useEffect } from 'preact/hooks';
import {
    Box,
    Typography,
    IconButton,
    TextField,
    Button,
    Checkbox,
    Chip,
    Paper,
    Popper,
    ClickAwayListener,
    InputAdornment,
    List,
    ListItemButton,
    Collapse,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import type { ThemeDefinition } from '@core/public';
import { 
    ThemePathTreeBuilder as ThemeTreeBuilder, 
    ThemePathTreeNode as ThemeTreeNode, 
    buildThemePathTree as buildThemeTree,
    searchThemePathTree as searchThemeTree,
} from '@core/public';

// ============== 类型定义 ==============

export interface ThemeTreeSelectProps {
    /** 主题列表 */
    themes: ThemeDefinition[];
    /** 已选中的主题 ID 或路径（单选模式） */
    selectedThemeId?: string | null;
    /** 已选中的主题路径列表（多选模式） */
    selectedPaths?: string[];
    /** 选中变化回调（单选模式） */
    onSelect?: (themeId: string | null, path: string | null) => void;
    /** 选中变化回调（多选模式） */
    onSelectMultiple?: (paths: string[]) => void;
    /** 是否多选模式 */
    multiSelect?: boolean;
    /** 是否允许清空 */
    allowClear?: boolean;
    /** 是否启用搜索 */
    searchable?: boolean;
    /** 默认展开的节点 ID 列表 */
    defaultExpandedIds?: string[];
    /** 默认展开全部 */
    defaultExpandAll?: boolean;
    /** 展开到已选节点 */
    expandToSelected?: boolean;
    /** 自定义标签渲染 */
    renderLabel?: (node: ThemeTreeNode) => preact.ComponentChildren;
    /** 占位符文本 */
    placeholder?: string;
    /** 禁用状态 */
    disabled?: boolean;
    /** 尺寸 */
    size?: 'small' | 'medium';
    /** 样式覆盖 */
    sx?: Record<string, any>;
    /** 下拉面板最大高度 */
    maxDropdownHeight?: number;
}

// ============== 主组件 ==============

export function ThemeTreeSelect({
    themes,
    selectedThemeId,
    selectedPaths = [],
    onSelect,
    onSelectMultiple,
    multiSelect = false,
    allowClear = true,
    searchable = true,
    defaultExpandedIds = [],
    defaultExpandAll = false,
    expandToSelected = true,
    renderLabel,
    placeholder = '选择主题',
    disabled = false,
    size = 'small',
    sx = {},
    maxDropdownHeight = 300,
}: ThemeTreeSelectProps) {
    // 下拉状态
    const [open, setOpen] = useState(false);
    const anchorRef = useRef<HTMLDivElement>(null);

    // 搜索状态
    const [searchTerm, setSearchTerm] = useState('');

    // 展开状态
    const [expandedIds, setExpandedIds] = useState<Set<string>>(() => {
        const initial = new Set(defaultExpandedIds);
        if (defaultExpandAll) {
            // 将在树构建后展开全部
        }
        return initial;
    });

    // 构建主题树
    const themeTree = useMemo(() => {
        return buildThemeTree(themes);
    }, [themes]);

    // 初始化展开状态：展开到已选节点
    useEffect(() => {
        if (!expandToSelected) return;
        
        const pathsToExpand: string[] = [];
        
        if (multiSelect && selectedPaths.length > 0) {
            selectedPaths.forEach(path => {
                pathsToExpand.push(...ThemeTreeBuilder.getAncestorPaths(path));
            });
        } else if (selectedThemeId) {
            const selectedPath = ThemeTreeBuilder.getThemePath(themeTree, selectedThemeId);
            if (selectedPath) {
                pathsToExpand.push(...ThemeTreeBuilder.getAncestorPaths(selectedPath));
            }
        }

        if (pathsToExpand.length > 0) {
            setExpandedIds(prev => {
                const next = new Set(prev);
                pathsToExpand.forEach(p => next.add(p));
                return next;
            });
        }
    }, [themeTree, selectedThemeId, selectedPaths, multiSelect, expandToSelected]);

    // 默认展开全部
    useEffect(() => {
        if (defaultExpandAll && themeTree.length > 0) {
            const allIds: string[] = [];
            const collect = (nodes: ThemeTreeNode[]) => {
                nodes.forEach(n => {
                    allIds.push(n.id);
                    collect(n.children);
                });
            };
            collect(themeTree);
            setExpandedIds(new Set(allIds));
        }
    }, [defaultExpandAll, themeTree]);

    // 过滤后的树
    const filteredTree = useMemo(() => {
        if (!searchTerm.trim()) {
            return themeTree;
        }
        return searchThemeTree(themeTree, searchTerm);
    }, [themeTree, searchTerm]);

    // 切换展开
    const toggleExpand = useCallback((nodeId: string, e?: Event) => {
        e?.stopPropagation();
        setExpandedIds(prev => {
            const next = new Set(prev);
            if (next.has(nodeId)) {
                next.delete(nodeId);
            } else {
                next.add(nodeId);
            }
            return next;
        });
    }, []);

    // 单选处理
    const handleSingleSelect = useCallback((node: ThemeTreeNode) => {
        if (onSelect) {
            onSelect(node.themeId, node.path);
        }
        setOpen(false);
        setSearchTerm('');
    }, [onSelect]);

    // 多选处理
    const handleMultiSelect = useCallback((node: ThemeTreeNode) => {
        if (!onSelectMultiple) return;

        const path = node.path;
        const isSelected = selectedPaths.includes(path);
        
        if (isSelected) {
            // 取消选择：移除该节点及其所有子节点
            const descendantPaths = ThemeTreeBuilder.getDescendantPaths(node);
            const toRemove = new Set([path, ...descendantPaths]);
            onSelectMultiple(selectedPaths.filter(p => !toRemove.has(p)));
        } else {
            // 选择：添加该节点
            onSelectMultiple([...selectedPaths, path]);
        }
    }, [selectedPaths, onSelectMultiple]);

    // 选择包含子节点
    const handleSelectWithChildren = useCallback((node: ThemeTreeNode) => {
        if (!onSelectMultiple) return;

        const descendantPaths = ThemeTreeBuilder.getDescendantPaths(node);
        const allPaths = [node.path, ...descendantPaths];
        const hasAll = allPaths.every(p => selectedPaths.includes(p));

        if (hasAll) {
            // 全部取消
            const toRemove = new Set(allPaths);
            onSelectMultiple(selectedPaths.filter(p => !toRemove.has(p)));
        } else {
            // 全部添加
            onSelectMultiple([...new Set([...selectedPaths, ...allPaths])]);
        }
    }, [selectedPaths, onSelectMultiple]);

    // 清空选择
    const handleClear = useCallback((e: Event) => {
        e.stopPropagation();
        if (multiSelect && onSelectMultiple) {
            onSelectMultiple([]);
        } else if (onSelect) {
            onSelect(null, null);
        }
    }, [multiSelect, onSelect, onSelectMultiple]);

    // 获取显示文本
    const displayText = useMemo(() => {
        if (multiSelect) {
            if (selectedPaths.length === 0) return placeholder;
            if (selectedPaths.length === 1) {
                return selectedPaths[0].split('/').pop() || selectedPaths[0];
            }
            return `${selectedPaths.length} 个主题`;
        } else {
            if (!selectedThemeId) return placeholder;
            const node = ThemeTreeBuilder.findNodeByThemeId(themeTree, selectedThemeId);
            return node?.label || selectedThemeId;
        }
    }, [multiSelect, selectedPaths, selectedThemeId, themeTree, placeholder]);

    // 是否有选中
    const hasSelection = multiSelect ? selectedPaths.length > 0 : !!selectedThemeId;

    return (
        <Box sx={{ position: 'relative', ...sx }}>
            {/* 触发按钮 */}
            <Box
                ref={anchorRef}
                onClick={() => !disabled && setOpen(!open)}
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.5,
                    px: 1.5,
                    py: size === 'small' ? 0.5 : 1,
                    border: '1px solid var(--background-modifier-border)',
                    borderRadius: 1,
                    cursor: disabled ? 'not-allowed' : 'pointer',
                    opacity: disabled ? 0.5 : 1,
                    bgcolor: 'background.paper',
                    '&:hover': disabled ? {} : {
                        borderColor: 'primary.main',
                    },
                }}
            >
                <Typography
                    variant="body2"
                    sx={{
                        flex: 1,
                        color: hasSelection ? 'text.primary' : 'text.secondary',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                    }}
                >
                    {displayText}
                </Typography>
                {allowClear && hasSelection && !disabled && (
                    <IconButton size="small" onClick={handleClear} sx={{ p: 0.25 }}>
                        <ClearIcon fontSize="small" />
                    </IconButton>
                )}
                <IconButton size="small" sx={{ p: 0.25 }}>
                    {open ? <ExpandMoreIcon fontSize="small" /> : <ChevronRightIcon fontSize="small" />}
                </IconButton>
            </Box>

            {/* 下拉面板 */}
            <Popper
                open={open}
                anchorEl={anchorRef.current}
                placement="bottom-start"
                sx={{ zIndex: 1300, minWidth: anchorRef.current?.offsetWidth }}
            >
                <ClickAwayListener onClickAway={() => setOpen(false)}>
                    <Paper
                        sx={{
                            mt: 0.5,
                            border: '1px solid var(--background-modifier-border)',
                            boxShadow: 2,
                        }}
                    >
                        {/* 搜索框 */}
                        {searchable && (
                            <Box sx={{ p: 1, borderBottom: '1px solid var(--background-modifier-border)' }}>
                                <TextField
                                    fullWidth
                                    size="small"
                                    placeholder="搜索主题..."
                                    value={searchTerm}
                                    onChange={(e: any) => setSearchTerm(e.target.value)}
                                    InputProps={{
                                        startAdornment: (
                                            <InputAdornment position="start">
                                                <SearchIcon fontSize="small" />
                                            </InputAdornment>
                                        ),
                                        endAdornment: searchTerm && (
                                            <InputAdornment position="end">
                                                <IconButton size="small" onClick={() => setSearchTerm('')}>
                                                    <ClearIcon fontSize="small" />
                                                </IconButton>
                                            </InputAdornment>
                                        ),
                                    }}
                                    onKeyDown={(e: KeyboardEvent) => e.stopPropagation()}
                                />
                            </Box>
                        )}

                        {/* 多选操作栏 */}
                        {multiSelect && (
                            <Box sx={{ 
                                display: 'flex', 
                                gap: 1, 
                                p: 1,
                                borderBottom: '1px solid var(--background-modifier-border)',
                            }}>
                                <Button
                                    size="small"
                                    onClick={() => {
                                        const allPaths = ThemeTreeBuilder.getLeafNodes(themeTree).map(n => n.path);
                                        onSelectMultiple?.(allPaths);
                                    }}
                                >
                                    全选
                                </Button>
                                <Button size="small" onClick={() => onSelectMultiple?.([])}>
                                    清空
                                </Button>
                            </Box>
                        )}

                        {/* 树列表 */}
                        <Box sx={{ maxHeight: maxDropdownHeight, overflow: 'auto' }}>
                            {filteredTree.length === 0 ? (
                                <Box sx={{ p: 2, textAlign: 'center' }}>
                                    <Typography variant="body2" color="text.secondary">
                                        {themes.length === 0 ? '暂无主题' : '无匹配结果'}
                                    </Typography>
                                </Box>
                            ) : (
                                <List dense disablePadding>
                                    {filteredTree.map(node => (
                                        <ThemeTreeNodeItem
                                            key={node.id}
                                            node={node}
                                            expandedIds={expandedIds}
                                            selectedPaths={multiSelect ? selectedPaths : []}
                                            selectedThemeId={multiSelect ? null : selectedThemeId}
                                            multiSelect={multiSelect}
                                            onToggleExpand={toggleExpand}
                                            onSingleSelect={handleSingleSelect}
                                            onMultiSelect={handleMultiSelect}
                                            onSelectWithChildren={handleSelectWithChildren}
                                            renderLabel={renderLabel}
                                        />
                                    ))}
                                </List>
                            )}
                        </Box>
                    </Paper>
                </ClickAwayListener>
            </Popper>

            {/* 多选时显示已选标签 */}
            {multiSelect && selectedPaths.length > 0 && (
                <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 0.5 }}>
                    {selectedPaths.slice(0, 3).map(path => (
                        <Chip
                            key={path}
                            size="small"
                            label={path.split('/').pop()}
                            onDelete={() => {
                                onSelectMultiple?.(selectedPaths.filter(p => p !== path));
                            }}
                            sx={{ height: 22 }}
                        />
                    ))}
                    {selectedPaths.length > 3 && (
                        <Chip
                            size="small"
                            label={`+${selectedPaths.length - 3}`}
                            sx={{ height: 22 }}
                        />
                    )}
                </Box>
            )}
        </Box>
    );
}

// ============== 树节点项组件 ==============

interface ThemeTreeNodeItemProps {
    node: ThemeTreeNode;
    expandedIds: Set<string>;
    selectedPaths: string[];
    selectedThemeId: string | null | undefined;
    multiSelect: boolean;
    onToggleExpand: (nodeId: string, e?: Event) => void;
    onSingleSelect: (node: ThemeTreeNode) => void;
    onMultiSelect: (node: ThemeTreeNode) => void;
    onSelectWithChildren: (node: ThemeTreeNode) => void;
    renderLabel?: (node: ThemeTreeNode) => preact.ComponentChildren;
}

function ThemeTreeNodeItem({
    node,
    expandedIds,
    selectedPaths,
    selectedThemeId,
    multiSelect,
    onToggleExpand,
    onSingleSelect,
    onMultiSelect,
    onSelectWithChildren,
    renderLabel,
}: ThemeTreeNodeItemProps) {
    const hasChildren = node.children.length > 0;
    const isExpanded = expandedIds.has(node.id);
    const isSelected = multiSelect 
        ? selectedPaths.includes(node.path)
        : node.themeId === selectedThemeId;

    const handleClick = () => {
        if (multiSelect) {
            onMultiSelect(node);
        } else {
            // 单选模式：只有叶子节点（有 themeId）才可选
            if (node.themeId) {
                onSingleSelect(node);
            } else if (hasChildren) {
                // 非叶子节点，切换展开
                onToggleExpand(node.id);
            }
        }
    };

    return (
        <>
            <ListItemButton
                onClick={handleClick}
                selected={isSelected}
                sx={{
                    pl: 1 + node.depth * 2,
                    py: 0.5,
                    minHeight: 32,
                }}
            >
                {/* 展开/折叠按钮 */}
                {hasChildren ? (
                    <IconButton
                        size="small"
                        onClick={(e: any) => onToggleExpand(node.id, e)}
                        sx={{ p: 0.25, mr: 0.5 }}
                    >
                        {isExpanded ? (
                            <ExpandMoreIcon fontSize="small" />
                        ) : (
                            <ChevronRightIcon fontSize="small" />
                        )}
                    </IconButton>
                ) : (
                    <Box sx={{ width: 24, mr: 0.5 }} />
                )}

                {/* 多选复选框 */}
                {multiSelect && (
                    <Checkbox
                        size="small"
                        checked={isSelected}
                        onClick={(e: any) => e.stopPropagation()}
                        onChange={() => onMultiSelect(node)}
                        sx={{ p: 0.25, mr: 0.5 }}
                    />
                )}

                {/* 标签 */}
                <Typography
                    variant="body2"
                    sx={{
                        flex: 1,
                        fontWeight: node.themeId ? 400 : 500, // 虚节点加粗
                        color: node.themeId ? 'text.primary' : 'text.secondary',
                    }}
                >
                    {renderLabel ? renderLabel(node) : node.label}
                </Typography>

                {/* 多选时：包含子节点按钮 */}
                {multiSelect && hasChildren && (
                    <IconButton
                        size="small"
                        onClick={(e: any) => {
                            e.stopPropagation();
                            onSelectWithChildren(node);
                        }}
                        sx={{ p: 0.25, opacity: 0.6, '&:hover': { opacity: 1 } }}
                        title="包含子主题"
                    >
                        <ExpandMoreIcon fontSize="small" />
                    </IconButton>
                )}
            </ListItemButton>

            {/* 子节点 */}
            {hasChildren && (
                <Collapse in={isExpanded}>
                    {node.children.map(child => (
                        <ThemeTreeNodeItem
                            key={child.id}
                            node={child}
                            expandedIds={expandedIds}
                            selectedPaths={selectedPaths}
                            selectedThemeId={selectedThemeId}
                            multiSelect={multiSelect}
                            onToggleExpand={onToggleExpand}
                            onSingleSelect={onSingleSelect}
                            onMultiSelect={onMultiSelect}
                            onSelectWithChildren={onSelectWithChildren}
                            renderLabel={renderLabel}
                        />
                    ))}
                </Collapse>
            )}
        </>
    );
}

export default ThemeTreeSelect;
