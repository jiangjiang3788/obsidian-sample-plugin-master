// src/core/settings/ui/components/SettingsTreeView.tsx
/** @jsxImportSource preact */
import { h, ComponentChild, Fragment } from 'preact';
// [修正] 从 preact/hooks 中导入 useEffect
import { useState, useEffect } from 'preact/hooks';
import { Box, Stack, Typography, IconButton, Tooltip, TextField, Collapse, Button } from '@mui/material';
import FolderIcon from '@mui/icons-material/Folder';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import ArrowRightIcon from '@mui/icons-material/ArrowRight';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import DriveFileMoveOutlinedIcon from '@mui/icons-material/DriveFileMoveOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import DeleteForeverOutlinedIcon from '@mui/icons-material/DeleteForeverOutlined';

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
}

const Node = ({ node, children, ...props }: { node: TreeItem, children: ComponentChild } & any) => {
    const { onUpdateItemName, onDeleteItem, onMoveItem } = props;
    const [isEditing, setIsEditing] = useState(false);
    const [name, setName] = useState(node.name);

    // 当外部 props 的 name 变化时，同步内部 state
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
                {node.isGroup ? (
                    <IconButton size="small" onClick={props.onToggle} sx={{ mr: 0.5 }}>
                        {props.isExpanded ? <ArrowDropDownIcon /> : <ArrowRightIcon />}
                    </IconButton>
                ) : (
                    // 对于配置项，也提供一个展开/折叠按钮
                    <IconButton size="small" onClick={props.onToggle} sx={{ mr: 0.5, visibility: 'visible' }}>
                        {props.isExpanded ? <ArrowDropDownIcon /> : <ArrowRightIcon />}
                    </IconButton>
                )}
                
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
                        sx={{ flexGrow: 1, cursor: 'pointer', fontWeight: node.isGroup ? 600 : 500 }}
                    >
                        {node.isGroup && (props.isExpanded ? <FolderOpenIcon sx={{ fontSize: '1rem', verticalAlign: 'middle', mr: 0.5 }}/> : <FolderIcon sx={{ fontSize: '1rem', verticalAlign: 'middle', mr: 0.5 }}/>)}
                        {node.name}
                    </Typography>
                )}

                <Stack direction="row" className="actions" sx={{ opacity: 0, transition: 'opacity 0.2s' }}>
                    <Tooltip title="移动"><IconButton size="small" onClick={() => onMoveItem(node)}><DriveFileMoveOutlinedIcon fontSize="small"/></IconButton></Tooltip>
                    <Tooltip title="重命名"><IconButton size="small" onClick={() => setIsEditing(true)}><EditOutlinedIcon fontSize="small"/></IconButton></Tooltip>
                    <Tooltip title="删除"><IconButton size="small" onClick={() => onDeleteItem(node)} sx={{color: 'text.secondary', '&:hover': {color: 'error.main'}}}><DeleteForeverOutlinedIcon fontSize="small"/></IconButton></Tooltip>
                </Stack>
            </Stack>
            {children}
        </Box>
    );
};


export function SettingsTreeView({
    groups, items, allGroups, parentId, level = 0,
    renderItem, onAddItem, onAddGroup, onDeleteItem, onUpdateItemName
}: SettingsTreeViewProps) {

    const [collapsedState, setCollapsedState] = useState<Record<string, boolean>>({});
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
            {childGroups.map(group => {
                const isExpanded = !collapsedState[group.id];
                const treeItem: TreeItem = { ...group, isGroup: true };
                return (
                    <Box key={group.id} sx={{ borderBottom: '1px solid rgba(0,0,0,0.08)' }}>
                        <Node
                            node={treeItem}
                            isExpanded={isExpanded}
                            level={level}
                            onToggle={() => toggleCollapse(group.id)}
                            onUpdateItemName={onUpdateItemName}
                            onDeleteItem={onDeleteItem}
                            onMoveItem={setMovingItem}
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
                                />
                            </Collapse>
                        </Node>
                    </Box>
                );
            })}
            
            {childItems.map(item => {
                const isExpanded = !collapsedState[item.id];
                return (
                    <Box key={item.id} sx={{ borderBottom: '1px solid rgba(0,0,0,0.08)' }}>
                        <Node
                            node={item}
                            isExpanded={isExpanded}
                            level={level}
                            onToggle={() => toggleCollapse(item.id)}
                            onUpdateItemName={onUpdateItemName}
                            onDeleteItem={onDeleteItem}
                            onMoveItem={setMovingItem}
                        >
                            <Collapse in={isExpanded}>
                                <Box sx={{ bgcolor: 'action.hover', borderTop: '1px solid rgba(0,0,0,0.05)' }}>
                                    {renderItem(item)}
                                </Box>
                            </Collapse>
                        </Node>
                    </Box>
                );
            })}
            
            {/* 只在根节点显示“添加”按钮 */}
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