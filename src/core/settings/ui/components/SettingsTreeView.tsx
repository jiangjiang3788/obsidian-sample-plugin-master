// src/core/settings/ui/components/SettingsTreeView.tsx
/** @jsxImportSource preact */
import { h, ComponentChild, Fragment } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import { Box, Stack, Typography, IconButton, Tooltip, TextField, Collapse, Button } from '@mui/material';
// [视觉优化] 不再需要导入 FolderIcon 和 FolderOpenIcon
import ArrowRightIcon from '@mui/icons-material/ArrowRight';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import DriveFileMoveOutlinedIcon from '@mui/icons-material/DriveFileMoveOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import DeleteForeverOutlinedIcon from '@mui/icons-material/DeleteForeverOutlined';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';

import type { Group, Groupable } from '@core/domain/schema';
import { AppStore } from '@state/AppStore';
import { MoveItemDialog } from '@shared/components/dialogs/MoveItemDialog';

export interface TreeItem extends Groupable {
    name: string;
    isGroup: boolean; 
}

interface SettingsTreeViewProps {
    groups: Group[];
    items: TreeItem[];
    allGroups: Group[];
    parentId: string | null;
    level?: number;
    renderItem: (item: any) => ComponentChild;
    onAddItem: (parentId: string | null) => void;
    onAddGroup: (parentId: string | null) => void;
    onDeleteItem: (item: TreeItem) => void;
    onUpdateItemName: (item: TreeItem, newName: string) => void;
    onMoveItem: (item: TreeItem, direction: 'up' | 'down') => void;
    onDuplicateItem: (item: TreeItem) => void;
}

const Node = ({ node, children, ...props }: { node: TreeItem, children: ComponentChild } & any) => {
    const { onUpdateItemName, onDeleteItem, onOpenMoveDialog, onMoveItem, onDuplicateItem, index, siblingCount } = props;
    const [isEditing, setIsEditing] = useState(false);
    const [name, setName] = useState(node.name);

    useEffect(() => { setName(node.name); }, [node.name]);

    const handleNameBlur = () => {
        if (name.trim() && name !== node.name) {
            onUpdateItemName(node, name);
        } else {
            setName(node.name);
        }
        setIsEditing(false);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
        if (e.key === 'Escape') {
            setName(node.name);
            setIsEditing(false);
        }
    };
    
    return (
        <Box>
            <Stack 
                direction="row" 
                alignItems="center" 
                sx={{ 
                    pl: props.level * 2, 
                    pr: 1, 
                    minHeight: 48,
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
                    <TextField 
                        autoFocus
                        size="small"
                        variant="standard"
                        value={name}
                        onChange={e => setName((e.target as HTMLInputElement).value)}
                        onBlur={handleNameBlur}
                        onKeyDown={handleKeyDown}
                        sx={{ flexGrow: 1 }}
                    />
                ) : (
                    <Typography 
                        onClick={props.onToggle}
                        onDblClick={() => setIsEditing(true)}
                        title="双击可重命名"
                        sx={{ 
                            flexGrow: 1, 
                            cursor: 'pointer', 
                            fontWeight: node.isGroup ? 600 : 500,
                            // [视觉优化] 分组使用蓝色，项目使用默认颜色
                            color: node.isGroup ? 'primary.main' : 'text.primary',
                        }}
                    >
                        {/* [视觉优化] 移除文件夹图标 */}
                        {node.name}
                    </Typography>
                )}

                <Stack direction="row" className="actions" sx={{ opacity: 0, transition: 'opacity 0.2s' }}>
                    <Tooltip title="上移"><span><IconButton size="small" disabled={index === 0} onClick={() => onMoveItem(node, 'up')}><ArrowUpwardIcon fontSize="small" /></IconButton></span></Tooltip>
                    <Tooltip title="下移"><span><IconButton size="small" disabled={index === siblingCount - 1} onClick={() => onMoveItem(node, 'down')}><ArrowDownwardIcon fontSize="small" /></IconButton></span></Tooltip>
                    <Tooltip title="复制"><span><IconButton size="small" onClick={() => onDuplicateItem(node)}><ContentCopyIcon fontSize="small" /></IconButton></span></Tooltip>
                    <Tooltip title="移动到..."><IconButton size="small" onClick={() => onOpenMoveDialog(node)}><DriveFileMoveOutlinedIcon fontSize="small"/></IconButton></Tooltip>
                    <Tooltip title="删除"><IconButton size="small" onClick={() => onDeleteItem(node)} sx={{color: 'text.secondary', '&:hover': {color: 'error.main'}}}><DeleteForeverOutlinedIcon fontSize="small"/></IconButton></Tooltip>
                </Stack>
            </Stack>
            {children}
        </Box>
    );
};


export function SettingsTreeView({
    groups, items, allGroups, parentId, level = 0,
    renderItem, onAddItem, onAddGroup, onDeleteItem, onUpdateItemName,
    onMoveItem, onDuplicateItem
}: SettingsTreeViewProps) {

    // [核心修改] 初始化 state，使所有节点默认为折叠状态 (true)
    const [collapsedState, setCollapsedState] = useState<Record<string, boolean>>(() => {
        const initialState: Record<string, boolean> = {};
        [...groups, ...items].forEach(node => {
            initialState[node.id] = true;
        });
        return initialState;
    });
    const [movingItem, setMovingItem] = useState<TreeItem | null>(null);

    const toggleCollapse = (itemId: string) => {
        setCollapsedState(prev => ({ ...prev, [itemId]: !prev[itemId] }));
    };
    
    const handleMoveConfirm = (targetParentId: string | null) => {
        if (movingItem) {
            AppStore.instance.moveItem(movingItem.id, targetParentId);
        }
    };
    
    const childGroups = groups.filter(g => g.parentId === parentId);
    const childItems = items.filter(i => i.parentId === parentId);

    return (
        <Box>
            {childGroups.map((group, index) => {
                const isExpanded = !collapsedState[group.id];
                const treeItem: TreeItem = { ...group, isGroup: true };
                return (
                    <Box key={group.id} sx={{ borderBottom: '1px solid rgba(0,0,0,0.08)' }}>
                        <Node
                            node={treeItem}
                            isExpanded={isExpanded}
                            level={level}
                            index={index}
                            siblingCount={childGroups.length + childItems.length}
                            onToggle={() => toggleCollapse(group.id)}
                            onUpdateItemName={onUpdateItemName}
                            onDeleteItem={onDeleteItem}
                            onOpenMoveDialog={setMovingItem}
                            onMoveItem={onMoveItem}
                            onDuplicateItem={onDuplicateItem}
                        >
                            <Collapse in={isExpanded}>
                                <SettingsTreeView
                                    groups={groups}
                                    items={items}
                                    allGroups={allGroups}
                                    parentId={group.id}
                                    level={level + 1}
                                    renderItem={renderItem}
                                    onAddItem={onAddItem}
                                    onAddGroup={onAddGroup}
                                    onDeleteItem={onDeleteItem}
                                    onUpdateItemName={onUpdateItemName}
                                    onMoveItem={onMoveItem}
                                    onDuplicateItem={onDuplicateItem}
                                />
                            </Collapse>
                        </Node>
                    </Box>
                );
            })}
            
            {childItems.map((item, index) => {
                const isExpanded = !collapsedState[item.id];
                return (
                    <Box key={item.id} sx={{ borderBottom: '1px solid rgba(0,0,0,0.08)' }}>
                        <Node
                            node={item}
                            isExpanded={isExpanded}
                            level={level}
                            index={index + childGroups.length}
                            siblingCount={childGroups.length + childItems.length}
                            onToggle={() => toggleCollapse(item.id)}
                            onUpdateItemName={onUpdateItemName}
                            onDeleteItem={onDeleteItem}
                            onOpenMoveDialog={setMovingItem}
                            onMoveItem={onMoveItem}
                            onDuplicateItem={onDuplicateItem}
                        >
                            <Collapse in={isExpanded}>
               A              <Box sx={{ bgcolor: 'action.hover', borderTop: '1px solid rgba(0,0,0,0.05)' }}>
                                    {renderItem(item)}
                                </Box>
                            </Collapse>
                        </Node>
                    </Box>
                );
            })}
            
            {level === 0 && (
                <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
                    <Button onClick={() => onAddItem(parentId)} startIcon={<AddCircleOutlineIcon />} size="small">添加新项</Button>
                    <Button onClick={() => onAddGroup(parentId)} startIcon={<AddCircleOutlineIcon />} size="small">添加分组</Button>
                </Stack>
            )}

            {movingItem && (
                <MoveItemDialog 
                    isOpen={!!movingItem}
                    onClose={() => setMovingItem(null)}
                    itemToMove={movingItem}
                    groups={allGroups}
                    onConfirm={handleMoveConfirm}
                />
            )}
        </Box>
    );
}