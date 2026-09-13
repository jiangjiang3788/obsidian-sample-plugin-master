/** @jsxImportSource preact */
import { h } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import type { WhiteboardAnnotation as WhiteboardAnnotationData, WhiteboardPosition } from '@core/whiteboard/public';
import { ThinkButton, ThinkTextarea } from '@shared/ui/public';
import { WHITEBOARD_DRAG_THRESHOLD_PX } from './WhiteboardDragModel';

type Props = {
  annotation: WhiteboardAnnotationData;
  zoom: number;
  autoEdit?: boolean;
  onUpdate: (annotationId: string, text: string) => void | boolean | Promise<void | boolean>;
  onMove: (annotationId: string, position: WhiteboardPosition) => void | boolean | Promise<void | boolean>;
  onRemove: (annotationId: string) => void | boolean | Promise<void | boolean>;
  onAutoEditConsumed?: (annotationId: string) => void;
};

type DragSession = { pointerId: number; clientX: number; clientY: number; x: number; y: number };

export function WhiteboardAnnotation({ annotation, zoom, autoEdit = false, onUpdate, onMove, onRemove, onAutoEditConsumed }: Props) {
  const [editing, setEditing] = useState(autoEdit);
  const [draft, setDraft] = useState(annotation.text);
  const [preview, setPreview] = useState<WhiteboardPosition | null>(null);
  const dragRef = useRef<DragSession | null>(null);
  const previewRef = useRef<WhiteboardPosition | null>(null);
  const dragTargetRef = useRef<HTMLElement | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);
  useEffect(() => { if (!editing) setDraft(annotation.text); }, [annotation.text, editing]);
  useEffect(() => { if (!autoEdit) return; setEditing(true); onAutoEditConsumed?.(annotation.id); }, [annotation.id, autoEdit, onAutoEditConsumed]);
  useEffect(() => () => cleanupRef.current?.(), []);

  const commit = (value = draft) => { const next = value.trim(); if (!next && annotation.text === '') { void onRemove(annotation.id); setEditing(false); return; } void onUpdate(annotation.id, next); setEditing(false); };
  const cancel = () => { setDraft(annotation.text); setEditing(false); if (!annotation.text) void onRemove(annotation.id); };
  const beginDrag = (event: PointerEvent) => {
    if (editing || (event.pointerType === 'mouse' && event.button !== 0)) return;
    event.stopPropagation(); cleanupRef.current?.();
    const safeZoom = Number.isFinite(zoom) && zoom > 0 ? zoom : 1;
    const session = { pointerId: event.pointerId, clientX: event.clientX, clientY: event.clientY, x: annotation.x, y: annotation.y }; dragRef.current = session;
    dragTargetRef.current = event.currentTarget as HTMLElement;
    dragTargetRef.current.setPointerCapture?.(event.pointerId);
    const move = (next: PointerEvent) => { if (dragRef.current?.pointerId !== next.pointerId) return; const dx = next.clientX - session.clientX; const dy = next.clientY - session.clientY;
      if (Math.hypot(dx, dy) < WHITEBOARD_DRAG_THRESHOLD_PX) return; next.preventDefault(); next.stopPropagation(); const position = { x: session.x + dx / safeZoom, y: session.y + dy / safeZoom, zIndex: annotation.zIndex }; previewRef.current = position; setPreview(position); };
    const finish = (next: PointerEvent, cancelled: boolean) => { if (dragRef.current?.pointerId !== next.pointerId) return; next.stopPropagation(); dragRef.current = null; cleanupRef.current?.(); cleanupRef.current = null;
      try { dragTargetRef.current?.releasePointerCapture?.(next.pointerId); } catch { /* Host may have released capture already. */ } dragTargetRef.current = null;
      const committed = previewRef.current; previewRef.current = null; setPreview(null); if (!cancelled && committed) { next.preventDefault(); void onMove(annotation.id, committed); } };
    const up = (next: PointerEvent) => finish(next, false); const cancelPointer = (next: PointerEvent) => finish(next, true);
    window.addEventListener('pointermove', move, true); window.addEventListener('pointerup', up, true); window.addEventListener('pointercancel', cancelPointer, true);
    cleanupRef.current = () => { window.removeEventListener('pointermove', move, true); window.removeEventListener('pointerup', up, true); window.removeEventListener('pointercancel', cancelPointer, true); };
  };
  const position = preview ?? annotation;
  return (
    <article class={`think-whiteboard-annotation is-${annotation.kind}${editing ? ' is-editing' : ''}${preview ? ' is-dragging' : ''}`} data-whiteboard-annotation-id={annotation.id}
      style={`left:${position.x}px;top:${position.y}px;z-index:${position.zIndex ?? 2};`} onPointerDown={beginDrag as never} onDblClick={((event: Event) => { event.preventDefault(); event.stopPropagation(); setEditing(true); }) as never}>
      {editing ? <ThinkTextarea autoFocus className="think-whiteboard-annotation__editor" value={draft} placeholder={annotation.kind === 'sticky' ? '写下便签…' : '输入文字标注…'}
        onPointerDown={((event: Event) => event.stopPropagation()) as never} onInput={((event: Event) => setDraft((event.currentTarget as HTMLTextAreaElement).value)) as never}
        onBlur={((event: FocusEvent) => commit((event.currentTarget as HTMLTextAreaElement).value)) as never} onKeyDown={((event: KeyboardEvent) => { if (event.key === 'Escape') { event.preventDefault(); cancel(); } else if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) { event.preventDefault(); commit((event.currentTarget as HTMLTextAreaElement).value); } }) as never} />
        : <div class="think-whiteboard-annotation__text">{annotation.text || (annotation.kind === 'sticky' ? '双击编辑便签' : '双击编辑文字')}</div>}
      {!editing && <ThinkButton size="sm" variant="ghost" className="think-whiteboard-annotation__remove" aria-label="删除标注" title="删除标注"
        onPointerDown={((event: Event) => event.stopPropagation()) as never} onClick={((event: Event) => { event.preventDefault(); event.stopPropagation(); void onRemove(annotation.id); }) as never}>×</ThinkButton>}
    </article>
  );
}
