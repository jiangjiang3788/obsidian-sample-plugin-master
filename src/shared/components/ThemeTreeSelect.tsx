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
    Paper,
    Popper,
    ClickAwayListener,
    List,
} from '@mui/material';
import type { ThemeDefinition } from '@core/public';
import { 
    ThemePathTreeBuilder as ThemeTreeBuilder, 
    ThemePathTreeNode as ThemeTreeNode, 
    buildThemePathTree as buildThemeTree,
    searchThemePathTree as searchThemeTree,
} from '@core/public';

import { SearchBox } from './ThemeTreeSelect/SearchBox';
import { MultiSelectToolbar } from './ThemeTreeSelect/MultiSelectToolbar';
import { SelectedPathsChips } from './ThemeTreeSelect/SelectedPathsChips';
import { ThemeTreeSelectTrigger } from './ThemeTreeSelect/Trigger';
import { ThemeTreeNodeItem } from './ThemeTreeSelect/ThemeTreeNodeItem';
import { ThemeTreeNodeItem } from './ThemeTreeSelect/ThemeTreeNodeItem';

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
            <ThemeTreeSelectTrigger
                anchorRef={anchorRef}
                open={open}
                onToggleOpen={() => setOpen(!open)}
                displayText={displayText}
                hasSelection={hasSelection}
                allowClear={allowClear}
                disabled={disabled}
                size={size}
                onClear={handleClear}
            />

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
                        {searchable && <SearchBox value={searchTerm} onChange={setSearchTerm} />}

                        {/* 多选操作栏 */}
                        {multiSelect && (
                            <MultiSelectToolbar themeTree={themeTree} onSelectMultiple={onSelectMultiple} />
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
            {multiSelect && (
                <SelectedPathsChips
                    selectedPaths={selectedPaths}
                    onRemovePath={(path) => onSelectMultiple?.(selectedPaths.filter(p => p !== path))}
                />
            )}
        </Box>
    );
}

export default ThemeTreeSelect;
