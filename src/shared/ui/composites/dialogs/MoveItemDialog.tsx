// src/shared/components/dialogs/MoveItemDialog.tsx
/** @jsxImportSource preact */
import { h, VNode } from 'preact';
import { useState, useMemo } from 'preact/hooks';
import { Button, Box, List, ListItemButton, ListItemText, Typography } from '@mui/material';
import { ActionDialog } from './ActionDialog';
import type { Group, Groupable } from '@core/types/domain/schema';

// 递归渲染的单个分组节点
const GroupNode = ({ group, allGroups, onSelect, selectedId, disabledIds, level = 0 }: {
    group: Group;
    allGroups: Group[];
    onSelect: (id: string | null) => void;
    selectedId: string | null;
    disabledIds: Set<string>;
    level?: number;
}) => {
    const children = allGroups.filter(g => g.parentId === group.id);
    const isDisabled = disabledIds.has(group.id);

    return (
        <div>
            <ListItemButton
                selected={selectedId === group.id}
                onClick={() => !isDisabled && onSelect(group.id)}
                disabled={isDisabled}
                sx={{ pl: 2 + level * 2 }} // 通过左边距实现缩进
            >
                <ListItemText primary={group.name} />
            </ListItemButton>
            {children.length > 0 && (
                <Box sx={{ pl: 2 }}>
                    {children.map(child => (
                        <GroupNode
                            key={child.id}
                            group={child}
                            allGroups={allGroups}
                            onSelect={onSelect}
                            selectedId={selectedId}
                            disabledIds={disabledIds}
                            level={level + 1}
                        />
                    ))}
                </Box>
            )}
        </div>
    );
};


interface MoveItemDialogProps {
    isOpen: boolean;
    onClose: () => void;
    // 要移动的项（或分组）
    itemToMove: Groupable; 
    // 所有可用的分组
    groups: Group[];
    // 确认移动后的回调
    onConfirm: (targetParentId: string | null) => void;
}

export function MoveItemDialog({ isOpen, onClose, itemToMove, groups, onConfirm }: MoveItemDialogProps) {
    const [selectedId, setSelectedId] = useState<string | null>(itemToMove.parentId);

    // 计算出哪些分组是禁止移动到的（自身及其所有子孙）
    const disabledIds = useMemo(() => {
        const result = new Set<string>();
        if (!itemToMove || !itemToMove.id.startsWith('group_')) {
            return result;
        }
        result.add(itemToMove.id);
        const findChildren = (parentId: string) => {
            groups.forEach(g => {
                if (g.parentId === parentId) {
                    result.add(g.id);
                    findChildren(g.id);
                }
            });
        };
        findChildren(itemToMove.id);
        return result;
    }, [itemToMove, groups]);

    const rootGroups = groups.filter(g => g.parentId === null);

    const handleConfirm = () => {
        onConfirm(selectedId);
        onClose();
    };

    const actions = (
        <Fragment>
            <Button onClick={onClose}>取消</Button>
            <Button onClick={handleConfirm} variant="contained" disabled={selectedId === itemToMove.parentId}>移动</Button>
        </Fragment>
    );

    return (
        <ActionDialog
            isOpen={isOpen}
            onClose={onClose}
            title="移动到..."
            actions={actions}
            maxWidth="xs"
        >
            <Typography variant="body2" sx={{ mb: 1 }}>请选择目标位置:</Typography>
            <List component="nav" dense sx={{ bgcolor: 'action.hover', borderRadius: 1, maxHeight: 300, overflowY: 'auto' }}>
                <ListItemButton
                    selected={selectedId === null}
                    onClick={() => setSelectedId(null)}
                >
                    <ListItemText primary="根目录 (未分组)" />
                </ListItemButton>

                {rootGroups.map(group => (
                    <GroupNode
                        key={group.id}
                        group={group}
                        allGroups={groups}
                        onSelect={setSelectedId}
                        selectedId={selectedId}
                        disabledIds={disabledIds}
                    />
                ))}
            </List>
        </ActionDialog>
    );
}