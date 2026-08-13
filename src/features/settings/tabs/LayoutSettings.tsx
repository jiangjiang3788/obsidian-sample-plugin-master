// src/features/settings/tabs/LayoutSettings.tsx
/** @jsxImportSource preact */
import { h } from 'preact';
import { useMemo, useCallback, useState } from 'preact/hooks';
import { useSelector, selectLayouts, useUseCases } from '@/app/public';
import type { UseCases } from '@/app/public';
import { ThinkButton, ThinkIcon, ThinkIconButton } from '@shared/ui/public';
import type { Layout } from '@core/types/public';
import { arrayMove } from '@core/utils/public';
import { DEFAULT_NAMES } from '@core/types/public';
import { DndContext, closestCenter } from '@dnd-kit/core';
import { useSortable, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { LayoutEditorPanel } from '@/features/settings/components/LayoutEditorPanel';
import { NamePromptModal } from '@/platform/obsidian/modals/NamePromptModal';

function SortableLayoutItem({ layout, useCases, isExpanded, onToggle }: {
  layout: Layout; useCases: UseCases; isExpanded: boolean; onToggle: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: layout.id });
  const style = { transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined, transition };
  const handleDelete = useCallback(() => {
    if (confirm(`确认删除布局 "${layout.name}" 吗？\n相关的引用可能会失效。`)) void useCases.layout.deleteLayout(layout.id);
  }, [layout.id, layout.name, useCases.layout]);
  const handleDuplicate = useCallback(() => void useCases.layout.duplicateLayout(layout.id), [layout.id, useCases.layout]);
  const handleRename = useCallback(() => {
    const newName = prompt('请输入新的布局名称', layout.name);
    if (newName?.trim()) void useCases.layout.updateLayout(layout.id, { name: newName.trim() });
  }, [layout.id, layout.name, useCases.layout]);
  const dragHandleProps = { ...attributes, ...listeners } as any;

  return (
    <div ref={setNodeRef as any} style={style} className="think-layout-list__item think-object-frame">
      <div className="think-layout-list__item-header">
        <button type="button" {...dragHandleProps} className="think-layout-list__drag-handle" aria-label="拖动排序">
          <ThinkIcon name="grip-vertical" />
        </button>
        <ThinkIconButton label={isExpanded ? '收起布局' : '展开布局'} icon={<ThinkIcon name={isExpanded ? 'chevron-up' : 'chevron-down'} />} size="sm" onClick={onToggle} className="think-layout-list__toggle" />
        <button type="button" className="think-layout-list__item-title" onClick={handleRename}>{layout.name}</button>
        <ThinkIconButton label="复制" icon={<ThinkIcon name="copy" />} size="sm" onClick={handleDuplicate} />
        <ThinkIconButton label="删除" icon={<ThinkIcon name="trash-2" />} size="sm" tone="danger" onClick={handleDelete} />
      </div>
      {isExpanded && <LayoutEditorPanel layoutId={layout.id} useCases={useCases} />}
    </div>
  );
}

export function LayoutSettings({ app }: { app: any }) {
  const useCases = useUseCases();
  const layouts = useSelector(selectLayouts);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const onAddLayout = useCallback(() => {
    const modal = new NamePromptModal(app, { title: '创建新布局', placeholder: '请输入新布局的名称...', defaultValue: DEFAULT_NAMES.NEW_LAYOUT, ctaText: '创建' });
    modal.openAndGetValue().then((newName) => { if (newName) void useCases.layout.addLayout(newName, null); });
  }, [app, useCases.layout]);
  const toggleExpand = useCallback((id: string) => setExpandedIds((previous) => {
    const next = new Set(previous); if (next.has(id)) next.delete(id); else next.add(id); return next;
  }), []);
  const handleDragEnd = useCallback((event: any) => {
    const { active, over } = event;
    if (!active || !over || active.id === over.id) return;
    const oldIndex = layouts.findIndex((layout) => layout.id === active.id);
    const newIndex = layouts.findIndex((layout) => layout.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    void useCases.layout.reorderLayouts(arrayMove(layouts, oldIndex, newIndex).map((layout) => layout.id));
  }, [layouts, useCases.layout]);
  const layoutIds = useMemo(() => layouts.map((layout) => layout.id), [layouts]);

  return (
    <div className="think-layout-list">
      <header className="think-layout-list__header">
        <ThinkButton onClick={onAddLayout} leadingIcon={<ThinkIcon name="plus" />} variant="secondary" size="sm">添加布局</ThinkButton>
      </header>
      <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={layoutIds} strategy={verticalListSortingStrategy}>
          {layouts.map((layout) => (
            <SortableLayoutItem key={layout.id} layout={layout} useCases={useCases} isExpanded={expandedIds.has(layout.id)} onToggle={() => toggleExpand(layout.id)} />
          ))}
        </SortableContext>
      </DndContext>
      {layouts.length === 0 && <div className="think-settings-centered-empty">暂无布局</div>}
    </div>
  );
}
