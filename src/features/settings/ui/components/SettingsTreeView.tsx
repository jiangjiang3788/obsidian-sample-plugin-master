// src/features/settings/ui/components/SettingsTreeView.tsx
/** @jsxImportSource preact */
import { h, ComponentChild } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import { Box, Stack, Typography, IconButton, Tooltip, TextField, Collapse, Button } from '@mui/material';
import ArrowRightIcon from '@mui/icons-material/ArrowRight';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import DriveFileMoveOutlinedIcon from '@mui/icons-material/DriveFileMoveOutlined';
import DeleteForeverOutlinedIcon from '@mui/icons-material/DeleteForeverOutlined';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import type { Group, Groupable } from '@core/types/domain/schema';
import { AppStore } from '@core/stores/AppStore';
import { MoveItemDialog } from '@shared/ui/composites/dialogs/MoveItemDialog';

export interface TreeItem extends Groupable {
    name: string;
    isGroup: boolean;
}

// 这个内部 Node 组件用于显示每一行
function Node({ node, children, ...props }: { node: TreeItem, children: ComponentChild } & any) {
    const { onUpdateItemName, onDeleteItem, onOpenMoveDialog, onDuplicateItem } = props;
    const [isEditing, setIsEditing] = useState(false);
    const [name, setName] = useState(node.name);

    useEffect(() => { setName(node.name); }, [node.name]);

    const handleNameBlur = () => {
        if (name.trim() && name !== node.name) { onUpdateItemName(node, name); }
        else { setName(node.name); }
        setIsEditing(false);
    };
    const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
        if (e.key === 'Escape') { setName(node.name); setIsEditing(false); }
    };

    return (
        <Box>
            <Stack
                direction="row"
                alignItems="center"
                sx={{
                    pl: props.level * 2, pr: 1, minHeight: 48,
                    '&:hover .actions': { opacity: 1 },
                    bgcolor: props.isExpanded && !node.isGroup ? 'action.hover' : 'transparent',
                    borderTopLeftRadius: props.isExpanded && !node.isGroup ? 8 : 0,
                    borderTopRightRadius: props.isExpanded && !node.isGroup ? 8 : 0,
                }}
            >
                <IconButton size="small" onClick={props.onToggle} sx={{ mr: 0.5 }}>
                    {props.isExpanded ? <ArrowDropDownIcon /> : <ArrowRightIcon />}
                </IconButton>

                {isEditing ? (
                    <TextField autoFocus size="small" variant="standard" value={name} onChange={e => setName((e.target as HTMLInputElement).value)} onBlur={handleNameBlur} onKeyDown={handleKeyDown} sx={{ flexGrow: 1 }} />
                ) : (
                    <Typography onClick={props.onToggle} onDblClick={() => setIsEditing(true)} title="单击展开/折叠，双击重命名" sx={{ flexGrow: 1, cursor: 'pointer', fontWeight: node.isGroup ? 600 : 500, color: node.isGroup ? 'primary.main' : 'text.primary' }}>
                        {node.name}
                    </Typography>
                )}

                <Stack direction="row" className="actions" sx={{ opacity: 0, transition: 'opacity 0.2s' }}>
                    <Tooltip title="复制"><span><IconButton size="small" onClick={() => onDuplicateItem(node)}><ContentCopyIcon fontSize="small" /></IconButton></span></Tooltip>
                    <Tooltip title="移动到..."><IconButton size="small" onClick={() => onOpenMoveDialog(node)}><DriveFileMoveOutlinedIcon fontSize="small" /></IconButton></Tooltip>
                    <Tooltip title="删除"><IconButton size="small" onClick={() => onDeleteItem(node)} sx={{ color: 'text.secondary', '&:hover': { color: 'error.main' } }}><DeleteForeverOutlinedIcon fontSize="small" /></IconButton></Tooltip>
                </Stack>
            </Stack>
            {children}
        </Box>
    );
}

// [修改 1] 组件 props 类型定义中增加 appStore
export function SettingsTreeView({ groups, items, allGroups, parentId, level = 0, renderItem, onAddItem, onAddGroup, onDeleteItem, onUpdateItemName, onDuplicateItem, appStore }: any) {
    // 这个状态管理确保所有节点初次加载时都是折叠的
    const [collapsedState, setCollapsedState] = useState<Record<string, boolean>>(() => {
        const initialState: Record<string, boolean> = {};
        [...groups, ...items].forEach(node => { initialState[node.id] = true; });
        return initialState;
    });
    const [movingItem, setMovingItem] = useState<TreeItem | null>(null);

    const toggleCollapse = (itemId: string) => setCollapsedState(prev => ({ ...prev, [itemId]: !prev[itemId] }));
    
    // [修改 2] 使用从 props 传入的 appStore 实例，而不是错误的 AppStore.instance
    const handleMoveConfirm = (targetParentId: string | null) => {
        if (movingItem && appStore) {
            appStore.moveItem(movingItem.id, targetParentId);
        }
    };

    const childGroups = groups.filter(g => g.parentId === parentId);
    const childItems = items.filter(i => i.parentId === parentId);

    return (
        <Box>
            {childGroups.map((group) => {
                const treeItem: TreeItem = { ...group, isGroup: true };
                const isExpanded = !collapsedState[group.id];
                return (
                    <Box key={group.id} sx={{ borderBottom: '1px solid rgba(0,0,0,0.08)' }}>
                        <Node node={treeItem} isExpanded={isExpanded} level={level} onToggle={() => toggleCollapse(group.id)} onUpdateItemName={onUpdateItemName} onDeleteItem={onDeleteItem} onOpenMoveDialog={setMovingItem} onDuplicateItem={onDuplicateItem}>
                            {/* [PERFORMANCE] unmountOnExit 确保折叠时，内部的递归组件被完全卸载 */}
                            <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                                {/* [修改 3] 在递归调用时，必须把 appStore 继续传递下去 */}
                                <SettingsTreeView {...{ groups, items, allGroups, renderItem, onAddItem, onAddGroup, onDeleteItem, onUpdateItemName, onDuplicateItem, appStore }} parentId={group.id} level={level + 1} />
                            </Collapse>
                        </Node>
                    </Box>
                );
            })}

            {childItems.map((item) => {
                const isExpanded = !collapsedState[item.id];
                const treeItem: TreeItem = { ...item, isGroup: false, name: (item as any).name || (item as any).title };
                return (
                    <Box key={item.id} sx={{ borderBottom: '1px solid rgba(0,0,0,0.08)' }}>
                        <Node node={treeItem} isExpanded={isExpanded} level={level} onToggle={() => toggleCollapse(item.id)} onUpdateItemName={onUpdateItemName} onDeleteItem={onDeleteItem} onOpenMoveDialog={setMovingItem} onDuplicateItem={onDuplicateItem}>
                            {/* [PERFORMANCE] unmountOnExit 确保折叠时，内部的编辑器组件被完全卸载 */}
                            <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                                <Box sx={{ bgcolor: 'action.hover', borderTop: '1px solid rgba(0,0,0,0.05)' }}>
                                    {renderItem(item)}
                                </Box>
                            </Collapse>
                        </Node>
                    </Box>
                );
            })}

            {level === 0 && (
                <Stack direction="row" spacing={1} sx={{ mt: 2, pl: 1 }}>
                    <Button onClick={() => onAddItem(parentId)} startIcon={<AddCircleOutlineIcon />} size="small">添加新项</Button>
                    <Button onClick={() => onAddGroup(parentId)} startIcon={<AddCircleOutlineIcon />} size="small">添加分组</Button>
                </Stack>
            )}

            {movingItem && (
                <MoveItemDialog isOpen={!!movingItem} onClose={() => setMovingItem(null)} itemToMove={movingItem} groups={allGroups} onConfirm={handleMoveConfirm} />
            )}
        </Box>
    );
}
