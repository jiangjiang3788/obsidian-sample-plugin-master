// src/features/dashboard/ui/ThemeFilter.tsx
/** @jsxImportSource preact */
import { h } from 'preact';
import { useState, useMemo } from 'preact/hooks';
import { 
    Popover, 
    FormGroup, 
    FormControlLabel, 
    Checkbox, 
    Button,
    Box,
    Typography,
    Chip,
    IconButton
} from '@mui/material';
import FilterListIcon from '@mui/icons-material/FilterList';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { useStore } from '@/app/AppStore';
import { buildThemeTree } from '@/core/theme-matrix/themeTreeBuilder';
import type { ThemeTreeNode } from '@core/theme-matrix';

// 解决 Preact 和 Material-UI 的类型兼容性问题
const AnyButton = Button as any;
const AnyPopover = Popover as any;
const AnyBox = Box as any;
const AnyTypography = Typography as any;
const AnyChip = Chip as any;
const AnyFormGroup = FormGroup as any;
const AnyFormControlLabel = FormControlLabel as any;
const AnyCheckbox = Checkbox as any;
const AnyIconButton = IconButton as any;

interface ThemeFilterProps {
    selectedThemes: string[];
    onSelectionChange: (themes: string[]) => void;
}

export function ThemeFilter({ selectedThemes, onSelectionChange }: ThemeFilterProps) {
    const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
    const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
    const themes = useStore(state => state.settings.inputSettings.themes);

    // 构建主题树
    const themeTree = useMemo(() => {
        const extendedThemes = themes.map(t => ({
            ...t,
            status: 'active' as const,
            source: 'predefined' as const,
            usageCount: 0
        }));
        return buildThemeTree(extendedThemes, expandedNodes);
    }, [themes, expandedNodes]);

    // 获取所有主题路径（用于全选）
    const allThemePaths = useMemo(() => {
        return themes.map(t => t.path);
    }, [themes]);

    const handleClick = (event: any) => {
        setAnchorEl(event.currentTarget);
    };

    const handleClose = () => {
        setAnchorEl(null);
    };

    // 获取节点及其所有子孙节点的主题路径
    const getNodeAndDescendantPaths = (node: ThemeTreeNode): string[] => {
        const paths = [node.theme.path];
        node.children.forEach(child => {
            paths.push(...getNodeAndDescendantPaths(child));
        });
        return paths;
    };

    // 在主题树中查找节点
    const findNodeInTree = (nodes: ThemeTreeNode[], themePath: string): ThemeTreeNode | null => {
        for (const node of nodes) {
            if (node.theme.path === themePath) {
                return node;
            }
            const found = findNodeInTree(node.children, themePath);
            if (found) {
                return found;
            }
        }
        return null;
    };

    const handleToggleTheme = (themePath: string) => {
        const node = findNodeInTree(themeTree, themePath);
        
        // 如果是有子主题的父主题，且当前是折叠状态，则批量选择
        if (node && node.children.length > 0 && !node.expanded) {
            const allPaths = getNodeAndDescendantPaths(node);
            const isSelected = selectedThemes.includes(themePath);
            
            let newSelection: string[];
            if (isSelected) {
                // 取消选择：移除该主题及所有子主题
                newSelection = selectedThemes.filter(t => !allPaths.includes(t));
            } else {
                // 选择：添加该主题及所有子主题
                newSelection = [...selectedThemes, ...allPaths.filter(p => !selectedThemes.includes(p))];
            }
            onSelectionChange(newSelection);
            return;
        }
        
        // 其他情况：正常切换单个主题
        const newSelection = selectedThemes.includes(themePath)
            ? selectedThemes.filter(t => t !== themePath)
            : [...selectedThemes, themePath];
        onSelectionChange(newSelection);
    };

    const handleSelectAll = () => {
        onSelectionChange(allThemePaths);
    };

    const handleClearAll = () => {
        onSelectionChange([]);
    };

    const handleToggleExpand = (themeId: string) => {
        const newExpanded = new Set(expandedNodes);
        if (newExpanded.has(themeId)) {
            newExpanded.delete(themeId);
        } else {
            newExpanded.add(themeId);
        }
        setExpandedNodes(newExpanded);
    };

    // 递归渲染主题树节点
    const renderThemeNode = (node: ThemeTreeNode): any => {
        const hasChildren = node.children.length > 0;
        const isExpanded = node.expanded;
        const indent = node.level * 16;

        return (
            <div key={node.theme.id}>
                <div style={{ display: 'flex', alignItems: 'center', paddingLeft: `${indent}px` }}>
                    {hasChildren && (
                        <AnyIconButton
                            size="small"
                            onClick={() => handleToggleExpand(node.theme.id)}
                            sx={{ padding: '2px', marginRight: '4px' }}
                            title="展开/折叠"
                        >
                            {isExpanded ? <ExpandMoreIcon fontSize="small" /> : <ChevronRightIcon fontSize="small" />}
                        </AnyIconButton>
                    )}
                    {!hasChildren && <div style={{ width: '28px' }} />}
                    <AnyFormControlLabel
                        control={
                            <AnyCheckbox
                                size="small"
                                checked={selectedThemes.includes(node.theme.path)}
                                onChange={() => handleToggleTheme(node.theme.path)}
                            />
                        }
                        label={
                            <span 
                                style={{ fontSize: '0.875rem' }}
                                title={hasChildren && !isExpanded ? `${node.theme.path} (折叠时点击选择所有子主题)` : node.theme.path}
                            >
                                {node.theme.icon && `${node.theme.icon} `}
                                {node.theme.path.split('/').pop() || node.theme.path}
                            </span>
                        }
                        sx={{ margin: 0, flex: 1 }}
                    />
                </div>
                {isExpanded && hasChildren && (
                    <div>
                        {node.children.map(child => renderThemeNode(child))}
                    </div>
                )}
            </div>
        );
    };

    const open = Boolean(anchorEl);
    const selectedCount = selectedThemes.length;
    const totalCount = allThemePaths.length;

    return (
        <div style={{ display: 'inline-flex', alignItems: 'center', marginLeft: '8px' }}>
            <AnyButton
                size="small"
                variant={selectedCount > 0 && selectedCount < totalCount ? 'contained' : 'outlined'}
                startIcon={<FilterListIcon />}
                onClick={handleClick}
                sx={{ textTransform: 'none' }}
            >
                主题筛选 {selectedCount > 0 && selectedCount < totalCount && `(${selectedCount}/${totalCount})`}
            </AnyButton>

            {selectedCount > 0 && selectedCount < totalCount && (
                <div style={{ marginLeft: '8px', display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                    {selectedThemes.slice(0, 3).map(themePath => {
                        const theme = themes.find(t => t.path === themePath);
                        return theme ? (
                            <AnyChip
                                key={themePath}
                                label={theme.path.split('/').pop() || theme.path}
                                size="small"
                                onDelete={() => handleToggleTheme(themePath)}
                                sx={{ height: '20px', fontSize: '0.75rem' }}
                            />
                        ) : null;
                    })}
                    {selectedThemes.length > 3 && (
                        <AnyChip
                            label={`+${selectedThemes.length - 3}`}
                            size="small"
                            sx={{ height: '20px', fontSize: '0.75rem' }}
                        />
                    )}
                </div>
            )}

            <AnyPopover
                open={open}
                anchorEl={anchorEl}
                onClose={handleClose}
                anchorOrigin={{
                    vertical: 'bottom',
                    horizontal: 'left',
                }}
                transformOrigin={{
                    vertical: 'top',
                    horizontal: 'left',
                }}
            >
                <AnyBox sx={{ p: 2, minWidth: '250px', maxWidth: '400px', maxHeight: '500px', overflowY: 'auto' }}>
                    <AnyTypography variant="subtitle2" gutterBottom>
                        选择要显示的主题
                    </AnyTypography>
                    
                    <AnyBox sx={{ mb: 1, display: 'flex', gap: 1 }}>
                        <AnyButton size="small" onClick={handleSelectAll}>
                            全选
                        </AnyButton>
                        <AnyButton size="small" onClick={handleClearAll}>
                            清空
                        </AnyButton>
                    </AnyBox>

                    {themeTree.length === 0 ? (
                        <AnyTypography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                            暂无主题
                        </AnyTypography>
                    ) : (
                        <div>
                            {themeTree.map(node => renderThemeNode(node))}
                        </div>
                    )}
                </AnyBox>
            </AnyPopover>
        </div>
    );
}
