/** @jsxImportSource preact */
import { h, type ComponentChildren } from 'preact';
import { Checkbox, Collapse, IconButton, ListItemButton, Typography } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import type { ThemePathTreeNode as ThemeTreeNode } from '@core/public';

import { ThemeTreeNodeLabel } from '../../ui/components/ThemeTreeNodeLabel';

export interface ThemeTreeNodeItemProps {
    node: ThemeTreeNode;
    expandedIds: Set<string>;
    selectedPaths: string[];
    selectedThemeId: string | null | undefined;
    multiSelect: boolean;
    onToggleExpand: (nodeId: string, e?: Event) => void;
    onSingleSelect: (node: ThemeTreeNode) => void;
    onMultiSelect: (node: ThemeTreeNode) => void;
    onSelectWithChildren: (node: ThemeTreeNode) => void;
    renderLabel?: (node: ThemeTreeNode) => ComponentChildren;
}

export function ThemeTreeNodeItem({
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
    const isSelected = multiSelect ? selectedPaths.includes(node.path) : node.themeId === selectedThemeId;

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
                    // 缩进逻辑统一下沉到 ThemeTreeNodeLabel
                    pl: 0,
                    py: 0.5,
                    minHeight: 32,
                }}
            >
                <ThemeTreeNodeLabel
                    depth={node.depth}
                    hasChildren={hasChildren}
                    expanded={isExpanded}
                    onToggleExpand={(e: any) => onToggleExpand(node.id, e)}
                    placeholderWidthPx={24}
                    basePadding={1}
                    indentUnit={2}
                    sx={{ width: '100%' }}
                >
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
                </ThemeTreeNodeLabel>
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
