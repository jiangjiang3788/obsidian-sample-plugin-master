/** @jsxImportSource preact */
import { h } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import type { WhiteboardAnnotation, WhiteboardGroup, WhiteboardGroupPosition, WhiteboardItem } from '@core/whiteboard/public';
import { ThinkButton, ThinkIconButton, ThinkInput } from '@shared/ui/public';
import {
  createWhiteboardWorkbenchDragSession,
  getWhiteboardWorkbenchFrame,
  resolveWhiteboardWorkbenchDragPreview,
  type WhiteboardWorkbenchDragSession,
} from './WhiteboardWorkbenchModel';

export interface WhiteboardWorkbenchGroupProps {
  group: WhiteboardGroup;
  items: readonly WhiteboardItem[];
  annotations?: readonly WhiteboardAnnotation[];
  groups?: readonly WhiteboardGroup[];
  zoom: number;
  previewPosition?: WhiteboardGroupPosition | null;
  dropTarget?: boolean;
  findActive?: boolean;
  onPreviewChange: (groupId: string, position: WhiteboardGroupPosition | null) => void;
  onMove: (groupId: string, position: WhiteboardGroupPosition) => void | Promise<void>;
  onRename: (groupId: string, title: string) => void | Promise<void>;
  onToggleCollapsed: (groupId: string, collapsed: boolean) => void | Promise<void>;
  onDissolve: (groupId: string) => void | Promise<void>;
  onEnter?: (groupId: string) => void;
}

export function WhiteboardWorkbenchGroup({
  group,
  items,
  annotations = [],
  groups = [],
  zoom,
  previewPosition = null,
  dropTarget = false,
  findActive = false,
  onPreviewChange,
  onMove,
  onRename,
  onToggleCollapsed,
  onDissolve,
  onEnter,
}: WhiteboardWorkbenchGroupProps) {
  const dragRef = useRef<WhiteboardWorkbenchDragSession | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);
  const previewRef = useRef<WhiteboardGroupPosition | null>(null);
  const [editing, setEditing] = useState(false);
  const [draftTitle, setDraftTitle] = useState(group.title);
  const [moving, setMoving] = useState(false);
  const visibleGroup = previewPosition ? { ...group, ...previewPosition } : group;
  const frame = getWhiteboardWorkbenchFrame(visibleGroup, items, groups);
  const memberCount = items.filter((item) => item.groupId === group.id).length;
  const annotationCount = annotations.filter((entry) => entry.groupId === group.id).length;
  const childGroupCount = groups.filter((candidate) => candidate.parentGroupId === group.id).length;
  const style = `left:${frame.x}px;top:${frame.y}px;width:${frame.width}px;height:${frame.height}px;`;

  useEffect(() => setDraftTitle(group.title), [group.title]);
  useEffect(() => () => cleanupRef.current?.(), []);

  const clearListeners = () => { cleanupRef.current?.(); cleanupRef.current = null; };
  const finishDrag = (event: PointerEvent, cancelled: boolean) => {
    const session = dragRef.current;
    if (!session || session.pointerId !== event.pointerId) return;
    event.preventDefault(); event.stopPropagation(); dragRef.current = null; clearListeners();
    const preview = previewRef.current; previewRef.current = null;
    if (cancelled || !preview) { onPreviewChange(group.id, null); return; }
    setMoving(true);
    void Promise.resolve(onMove(group.id, preview)).finally(() => { onPreviewChange(group.id, null); setMoving(false); });
  };
  const beginDrag = (event: PointerEvent) => {
    if (moving || editing || (event.pointerType === 'mouse' && event.button !== 0)) return;
    event.preventDefault(); event.stopPropagation(); clearListeners();
    dragRef.current = createWhiteboardWorkbenchDragSession({ group, pointerId: event.pointerId, clientX: event.clientX, clientY: event.clientY, zoom });
    const move = (next: PointerEvent) => {
      const session = dragRef.current; if (!session || session.pointerId !== next.pointerId) return;
      next.preventDefault(); next.stopPropagation(); const preview = resolveWhiteboardWorkbenchDragPreview(session, next.clientX, next.clientY);
      if (!preview) return; previewRef.current = preview; onPreviewChange(group.id, preview);
    };
    const up = (next: PointerEvent) => finishDrag(next, false);
    const cancel = (next: PointerEvent) => finishDrag(next, true);
    window.addEventListener('pointermove', move, true); window.addEventListener('pointerup', up, true); window.addEventListener('pointercancel', cancel, true);
    cleanupRef.current = () => { window.removeEventListener('pointermove', move, true); window.removeEventListener('pointerup', up, true); window.removeEventListener('pointercancel', cancel, true); };
  };
  const stopPointer = (event: Event) => event.stopPropagation();
  const saveTitle = () => {
    const next = draftTitle.trim();
    if (!next) { setDraftTitle(group.title); setEditing(false); return; }
    setEditing(false); void onRename(group.id, next);
  };

  return (
    <section
      class={`think-whiteboard-workbench${group.collapsed ? ' is-collapsed' : ''}${dropTarget ? ' is-drop-target' : ''}${findActive ? ' is-find-active' : ''}${previewPosition ? ' is-dragging' : ''}`}
      style={style}
      data-whiteboard-group-id={group.id}
      data-whiteboard-group-collapsed={group.collapsed ? 'true' : 'false'}
    >
      <header class="think-whiteboard-workbench__header" onPointerDown={beginDrag as never} title="拖动标题栏或手柄可整组移动">
        <ThinkIconButton
          size="sm"
          label={group.collapsed ? '展开工作台' : '折叠工作台'}
          icon={<span aria-hidden="true">{group.collapsed ? '›' : '⌄'}</span>}
          onPointerDown={stopPointer as never}
          onClick={() => void onToggleCollapsed(group.id, !group.collapsed)}
        />
        <span class="think-whiteboard-workbench__drag-handle" title="拖动整组" aria-hidden="true">⠿</span>
        {editing ? (
          <ThinkInput
            className="think-whiteboard-workbench__title-input"
            value={draftTitle}
            aria-label="工作台名称"
            onPointerDown={stopPointer as never}
            onInput={(event: Event) => setDraftTitle((event.currentTarget as HTMLInputElement).value)}
            onBlur={saveTitle}
            onKeyDown={((event: KeyboardEvent) => {
              if (event.key === 'Enter') { event.preventDefault(); saveTitle(); }
              if (event.key === 'Escape') { event.preventDefault(); setDraftTitle(group.title); setEditing(false); }
            }) as never}
          />
        ) : (
          <button type="button" class="think-whiteboard-workbench__title" onPointerDown={stopPointer as never} onDblClick={() => setEditing(true)}>{group.title}</button>
        )}
        <span class="think-whiteboard-workbench__count">{memberCount} 张{annotationCount > 0 ? ` · ${annotationCount} 标注` : ''}{childGroupCount > 0 ? ` · ${childGroupCount} 子工作台` : ''}</span>
        {onEnter && <ThinkButton size="sm" variant="ghost" aria-label="全屏进入工作台" title="全屏进入工作台子画布" onPointerDown={stopPointer as never} onClick={() => onEnter(group.id)}>⛶ 全屏</ThinkButton>}
        <ThinkButton size="sm" variant="ghost" onPointerDown={stopPointer as never} onClick={() => setEditing(true)}>重命名</ThinkButton>
        <ThinkButton size="sm" variant="ghost" onPointerDown={stopPointer as never} onClick={() => void onDissolve(group.id)}>解散</ThinkButton>
      </header>
      {!group.collapsed && memberCount === 0 && annotationCount === 0 && childGroupCount === 0 && <div class="think-whiteboard-workbench__empty" aria-hidden="true">拖卡片到这里加入工作台</div>}
    </section>
  );
}
