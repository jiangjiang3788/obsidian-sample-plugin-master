// src/features/settings/ui/components/SettingsTreeView.tsx
/** @jsxImportSource preact */
import { h, ComponentChild, Fragment } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import { Box, Stack, Typography, IconButton, Tooltip, TextField, Collapse, Button } from '@mui/material';
import ArrowRightIcon from '@mui/icons-material/ArrowRight';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import DriveFileMoveOutlinedIcon from '@mui/icons-material/DriveFileMoveOutlined';
import DeleteForeverOutlinedIcon from '@mui/icons-material/DeleteForeverOutlined';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator'; // [NEW]
import type { Group, Groupable } from '@core/domain/schema';
import { AppStore } from '@state/AppStore';
import { MoveItemDialog } from '@shared/components/dialogs/MoveItemDialog';
// [NEW] Import dnd-kit hooks
import { useSortable, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

export interface TreeItem extends Groupable {
    name: string;
    isGroup: boolean; 
}

// [NEW] Create a SortableNode wrapper component
function SortableNode({ node, children, ...props }: { node: TreeItem, children: ComponentChild } & any) {
    const { onUpdateItemName, onDeleteItem, onOpenMoveDialog, onDuplicateItem } = props;
    const [isEditing, setIsEditing] = useState(false);
    const [name, setName] = useState(node.name);

    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
    } = useSortable({ id: node.id });
    
    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

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
        <div ref={setNodeRef} style={style}>
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
                <Tooltip title="拖动排序">
                    <Box component="span" {...attributes} {...listeners} sx={{ cursor: 'grab', display: 'flex', alignItems: 'center', color: 'text.disabled', px: 0.5 }}>
                        <DragIndicatorIcon fontSize="small" />
                    </Box>
                </Tooltip>
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
                    <Tooltip title="移动到..."><IconButton size="small" onClick={() => onOpenMoveDialog(node)}><DriveFileMoveOutlinedIcon fontSize="small"/></IconButton></Tooltip>
                    <Tooltip title="删除"><IconButton size="small" onClick={() => onDeleteItem(node)} sx={{color: 'text.secondary', '&:hover': {color: 'error.main'}}}><DeleteForeverOutlinedIcon fontSize="small"/></IconButton></Tooltip>
                </Stack>
            </Stack>
            {children}
        </div>
    );
}


export function SettingsTreeView({ groups, items, allGroups, parentId, level = 0, renderItem, onAddItem, onAddGroup, onDeleteItem, onUpdateItemName, onMoveItem, onDuplicateItem }: any) {
    const [collapsedState, setCollapsedState] = useState<Record<string, boolean>>(() => {
        const initialState: Record<string, boolean> = {};
        [...groups, ...items].forEach(node => { initialState[node.id] = true; });
        return initialState;
    });
    const [movingItem, setMovingItem] = useState<TreeItem | null>(null);

    const toggleCollapse = (itemId: string) => {
        setCollapsedState(prev => ({ ...prev, [itemId]: !prev[itemId] }));
    };
    
    const handleMoveConfirm = (targetParentId: string | null) => {
        if (movingItem) { AppStore.instance.moveItem(movingItem.id, targetParentId); }
    };
    
    const childGroups = groups.filter(g => g.parentId === parentId);
    const childItems = items.filter(i => i.parentId === parentId);
    // [NEW] Combine siblings for SortableContext
    const siblings = [...childGroups, ...childItems];

    return (
        <Box>
            <SortableContext items={siblings.map(s => s.id)} strategy={verticalListSortingStrategy}>
                {siblings.map((node, index) => {
                    const isGroup = 'type' in node;
                    const treeItem: TreeItem = { ...(node as any), isGroup, name: (node as any).name || (node as any).title };
                    const isExpanded = !collapsedState[node.id];

                    return (
                        <Box key={node.id} sx={{ borderBottom: '1px solid rgba(0,0,0,0.08)' }}>
                            <SortableNode
                                node={treeItem}
                                isExpanded={isExpanded}
                                level={level}
                                onToggle={() => toggleCollapse(node.id)}
                                onUpdateItemName={onUpdateItemName}
                                onDeleteItem={onDeleteItem}
                                onOpenMoveDialog={setMovingItem}
                                onDuplicateItem={onDuplicateItem}
                            >
                                <Collapse in={isExpanded}>
                                    {isGroup ? (
                                        <SettingsTreeView
                                            {...{groups, items, allGroups, renderItem, onAddItem, onAddGroup, onDeleteItem, onUpdateItemName, onMoveItem, onDuplicateItem}}
                                            parentId={node.id}
                                            level={level + 1}
                                        />
                                    ) : (
                                        <Box sx={{ bgcolor: 'action.hover', borderTop: '1px solid rgba(0,0,0,0.05)' }}>
                                            {renderItem(node)}
                                        </Box>
                                    )}
                                </Collapse>
                            </SortableNode>
                        </Box>
                    );
                })}
            </SortableContext>
            
            {level === 0 && (
                <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
                    <Button onClick={() => onAddItem(parentId)} startIcon={<AddCircleOutlineIcon />} size="small">添加新项</Button>
                    <Button onClick={() => onAddGroup(parentId)} startIcon={<AddCircleOutlineIcon />} size="small">添加分组</Button>
                </Stack>
            )}

            {movingItem && (
                <MoveItemDialog isOpen={!!movingItem} onClose={() => setMovingItem(null)} itemToMove={movingItem} groups={allGroups} onConfirm={handleMoveConfirm} />
            )}
        </Box>
    );
}