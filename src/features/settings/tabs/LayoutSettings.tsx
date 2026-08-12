// src/features/settings/ui/LayoutSettings.tsx
/** @jsxImportSource preact */
/**
 * LayoutSettings - 布局设置页面
 *
 * 布局详情统一复用 LayoutEditorPanel，避免设置页与悬浮设置窗维护两套逻辑。
 */
import { h } from 'preact';
import { useMemo, useCallback, useState } from 'preact/hooks';
import { useSelector, selectLayouts, useUseCases } from '@/app/public';
import type { UseCases } from '@/app/public';
import {
  AddCircleOutlineIcon,
  Box,
  Button,
  ContentCopyIcon,
  DeleteOutlineIcon,
  DragIndicatorIcon,
  ExpandLessIcon,
  ExpandMoreIcon,
  IconAction,
  IconButton,
  Stack,
  Typography,
} from '@shared/ui/public';
import type { Layout } from '@core/types/public';
import { arrayMove } from '@core/utils/public';
import { DEFAULT_NAMES } from '@core/types/public';
import { DndContext, closestCenter } from '@dnd-kit/core';
import { useSortable, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { LayoutEditorPanel } from '@/features/settings/components/LayoutEditorPanel';
import { NamePromptModal } from '@/platform/obsidian/modals/NamePromptModal';

function SortableLayoutItem({
    layout,
    useCases,
    isExpanded,
    onToggle,
}: {
    layout: Layout;
    useCases: UseCases;
    isExpanded: boolean;
    onToggle: () => void;
}) {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: layout.id });

    const style = {
        transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
        transition,
    };

    const handleDelete = useCallback(() => {
        if (confirm(`确认删除布局 "${layout.name}" 吗？\n相关的引用可能会失效。`)) {
            void useCases.layout.deleteLayout(layout.id);
        }
    }, [layout.id, layout.name, useCases.layout]);

    const handleDuplicate = useCallback(() => {
        void useCases.layout.duplicateLayout(layout.id);
    }, [layout.id, useCases.layout]);

    const handleRename = useCallback(() => {
        const newName = prompt('请输入新的布局名称', layout.name);
        if (newName && newName.trim()) {
            void useCases.layout.updateLayout(layout.id, { name: newName.trim() });
        }
    }, [layout.id, layout.name, useCases.layout]);

    const dragHandleProps = { ...attributes, ...listeners } as any;

    return (
        <Box ref={setNodeRef as any} style={style} className="think-layout-list__item">
            <Stack direction="row" alignItems="center" className="think-layout-list__item-header">
                <div
                    {...dragHandleProps}
                    className="think-layout-list__drag-handle"
                >
                    <DragIndicatorIcon fontSize="small" />
                </div>

                <IconButton size="small" onClick={onToggle} className="think-layout-list__toggle">
                    {isExpanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
                </IconButton>

                <Typography className="think-layout-list__item-title" onClick={handleRename}>
                    {layout.name}
                </Typography>

                <IconAction label="复制" onClick={handleDuplicate} icon={<ContentCopyIcon fontSize="small" />} />
                <IconAction label="删除" onClick={handleDelete} color="error" icon={<DeleteOutlineIcon fontSize="small" />} />
            </Stack>

            {isExpanded && <LayoutEditorPanel layoutId={layout.id} useCases={useCases} />}
        </Box>
    );
}

export function LayoutSettings({ app }: { app: any }) {
    const useCases = useUseCases();
    const layouts = useSelector(selectLayouts);
    const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

    const onAddLayout = useCallback(() => {
        const modal = new NamePromptModal(app, {
            title: '创建新布局',
            placeholder: '请输入新布局的名称...',
            defaultValue: DEFAULT_NAMES.NEW_LAYOUT,
            ctaText: '创建',
        });

        modal.openAndGetValue().then((newName) => {
            if (!newName) return;
            void useCases.layout.addLayout(newName, null);
        });
    }, [app, useCases.layout]);

    const toggleExpand = useCallback((id: string) => {
        setExpandedIds((previous) => {
            const next = new Set(previous);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    }, []);

    const handleDragEnd = useCallback((event: any) => {
        const { active, over } = event;
        if (!active || !over || active.id === over.id) return;

        const oldIndex = layouts.findIndex((layout) => layout.id === active.id);
        const newIndex = layouts.findIndex((layout) => layout.id === over.id);
        if (oldIndex === -1 || newIndex === -1) return;

        const orderedIds = arrayMove(layouts, oldIndex, newIndex).map((layout) => layout.id);
        void useCases.layout.reorderLayouts(orderedIds);
    }, [layouts, useCases.layout]);

    const layoutIds = useMemo(() => layouts.map((layout) => layout.id), [layouts]);

    return (
        <Box className="think-layout-list">
            <Stack direction="row" alignItems="center" justifyContent="space-between" className="think-layout-list__header">
                <Typography variant="h6">管理布局</Typography>
                <Button
                    onClick={onAddLayout}
                    startIcon={<AddCircleOutlineIcon />}
                    variant="outlined"
                    size="small"
                >
                    添加布局
                </Button>
            </Stack>

            <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={layoutIds} strategy={verticalListSortingStrategy}>
                    {layouts.map((layout) => (
                        <SortableLayoutItem
                            key={layout.id}
                            layout={layout}
                            useCases={useCases}
                            isExpanded={expandedIds.has(layout.id)}
                            onToggle={() => toggleExpand(layout.id)}
                        />
                    ))}
                </SortableContext>
            </DndContext>

            {layouts.length === 0 && (
                <Typography color="text.secondary" className="think-settings-centered-empty">
                    暂无布局，点击"添加布局"创建第一个
                </Typography>
            )}
        </Box>
    );
}
