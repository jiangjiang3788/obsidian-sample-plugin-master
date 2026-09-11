/** @jsxImportSource preact */
import { h } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { WHITEBOARD_DRAG_THRESHOLD_PX } from './WhiteboardDragModel';
import type { WhiteboardSemanticLayoutGuide } from './WhiteboardSemanticLayoutModel';

interface Props {
  guides: readonly WhiteboardSemanticLayoutGuide[];
  zoom?: number;
  onSelectItems?: (itemIds: readonly string[]) => void;
  onMoveGuide?: (guideId: string, position: { x: number; y: number }) => void;
}

type GuideDragPreview = { guideId: string; dx: number; dy: number };

export function WhiteboardSemanticLayoutOverlay({ guides, zoom = 1, onSelectItems, onMoveGuide }: Props) {
  const [dragPreview, setDragPreview] = useState<GuideDragPreview | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);
  const suppressClickUntilRef = useRef(0);
  useEffect(() => () => cleanupRef.current?.(), []);
  if (guides.length === 0) return null;

  const beginGuideDrag = (event: PointerEvent, guide: WhiteboardSemanticLayoutGuide) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    event.stopPropagation(); cleanupRef.current?.();
    const pointerId = event.pointerId; const startX = event.clientX; const startY = event.clientY; let moved = false;
    const safeZoom = Number.isFinite(zoom) && zoom > 0 ? zoom : 1;
    const move = (next: PointerEvent) => {
      if (next.pointerId !== pointerId) return;
      const sx = next.clientX - startX; const sy = next.clientY - startY;
      if (!moved && Math.hypot(sx, sy) < WHITEBOARD_DRAG_THRESHOLD_PX) return;
      moved = true; next.preventDefault(); next.stopPropagation(); setDragPreview({ guideId: guide.id, dx: sx / safeZoom, dy: sy / safeZoom });
    };
    const finish = (next: PointerEvent, cancelled: boolean) => {
      if (next.pointerId !== pointerId) return;
      cleanupRef.current?.(); cleanupRef.current = null;
      const sx = next.clientX - startX; const sy = next.clientY - startY; setDragPreview(null);
      if (!moved || cancelled) return;
      next.preventDefault(); next.stopPropagation(); suppressClickUntilRef.current = Date.now() + 350;
      onMoveGuide?.(guide.id, { x: guide.x + sx / safeZoom, y: guide.y + sy / safeZoom });
    };
    const up = (next: PointerEvent) => finish(next, false); const cancel = (next: PointerEvent) => finish(next, true);
    window.addEventListener('pointermove', move, true); window.addEventListener('pointerup', up, true); window.addEventListener('pointercancel', cancel, true);
    cleanupRef.current = () => { window.removeEventListener('pointermove', move, true); window.removeEventListener('pointerup', up, true); window.removeEventListener('pointercancel', cancel, true); };
  };

  return <div class="think-whiteboard-layout-overlay" aria-label="目标类型时间布局参考线">
    {guides.map((guide) => {
      const shift = dragPreview?.guideId === guide.id ? dragPreview : null;
      const x = guide.x + (shift?.dx ?? 0); const y = guide.y + (shift?.dy ?? 0);
      return <div key={guide.id} class={`think-whiteboard-layout-guide think-whiteboard-layout-guide--${guide.kind}${shift ? ' is-dragging' : ''}`} data-whiteboard-layout-guide-id={guide.id} style={`left:${x}px;top:${y}px;width:${guide.width}px;height:${guide.height}px;`}>
        <button type="button" class="think-whiteboard-layout-guide__label" title={`拖动可移动“${guide.label}”标注与边框；点击选择 ${guide.itemIds.length} 张卡片`}
          onPointerDown={((event: PointerEvent) => beginGuideDrag(event, guide)) as never}
          onClick={((event: Event) => { event.stopPropagation(); if (Date.now() >= suppressClickUntilRef.current) onSelectItems?.(guide.itemIds); }) as never}>{guide.label}</button>
      </div>;
    })}
  </div>;
}
