/** @jsxImportSource preact */
import { h } from 'preact';
import type { ComponentChildren } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { useDraggable } from '@dnd-kit/core';
import type { FreeformLayoutConfig, ViewName, ViewPlacement } from '@core/types/public';
import { getFreeformVisualHeight, resizeViewPlacement } from '@core/layout/public';

export interface FreeformLayoutItemRenderProps {
  dragHandleProps: Record<string, unknown>;
  isDragging: boolean;
  isResizing: boolean;
  editing: boolean;
  selected: boolean;
  placement: ViewPlacement;
  onBringToFront: () => void;
  onToggleLocked: () => void;
  onToggleCollapsed: () => void;
  onRemoveFromLayout: () => void;
}

export interface FreeformLayoutItemProps {
  id: string;
  label: string;
  viewType?: ViewName;
  placement: ViewPlacement;
  editing: boolean;
  selected: boolean;
  index: number;
  canvasWidth: number;
  keyboardStep: number;
  config?: FreeformLayoutConfig;
  onSelect: (viewId: string) => void;
  onDeselect: () => void;
  onBringToFront: (viewId: string) => void;
  onToggleLocked: (viewId: string) => void;
  onToggleCollapsed: (viewId: string) => void;
  onRemoveFromLayout: (viewId: string) => void;
  onKeyboardChange: (
    viewId: string,
    delta: { x: number; y: number },
    resize: boolean
  ) => void;
  onResizePreview: (placement: ViewPlacement | null) => void;
  onResizeEnd: (placement: ViewPlacement) => void;
  children: (props: FreeformLayoutItemRenderProps) => ComponentChildren;
}

interface ResizeSession {
  pointerId: number;
  startClientX: number;
  startClientY: number;
  startPlacement: ViewPlacement;
  latestPlacement: ViewPlacement;
  target: HTMLElement;
}

function hasSizeChanged(a: ViewPlacement, b: ViewPlacement): boolean {
  return a.width !== b.width || a.height !== b.height;
}

function getArrowDelta(key: string, step: number): { x: number; y: number } | null {
  if (key === 'ArrowLeft') return { x: -step, y: 0 };
  if (key === 'ArrowRight') return { x: step, y: 0 };
  if (key === 'ArrowUp') return { x: 0, y: -step };
  if (key === 'ArrowDown') return { x: 0, y: step };
  return null;
}

export function FreeformLayoutItem({
  id,
  label,
  viewType,
  placement,
  editing,
  selected,
  index,
  canvasWidth,
  keyboardStep,
  config,
  onSelect,
  onDeselect,
  onBringToFront,
  onToggleLocked,
  onToggleCollapsed,
  onRemoveFromLayout,
  onKeyboardChange,
  onResizePreview,
  onResizeEnd,
  children,
}: FreeformLayoutItemProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id,
    disabled: !editing || !!placement.locked,
  });
  const [isResizing, setIsResizing] = useState(false);
  const resizeSessionRef = useRef<ResizeSession | null>(null);
  const onResizePreviewRef = useRef(onResizePreview);

  useEffect(() => {
    onResizePreviewRef.current = onResizePreview;
  }, [onResizePreview]);

  useEffect(() => () => {
    resizeSessionRef.current = null;
    onResizePreviewRef.current(null);
  }, []);

  const dragHandleProps = editing && !placement.locked
    ? ({ ...attributes, ...listeners } as Record<string, unknown>)
    : {};

  const handleResizePointerDown = (event: PointerEvent) => {
    if (!editing || placement.locked || placement.collapsed || event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    onSelect(id);

    const target = event.currentTarget as HTMLElement;
    target.setPointerCapture?.(event.pointerId);
    resizeSessionRef.current = {
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startPlacement: placement,
      latestPlacement: placement,
      target,
    };
    setIsResizing(true);
    onResizePreview(placement);
  };

  const handleResizePointerMove = (event: PointerEvent) => {
    const session = resizeSessionRef.current;
    if (!session || session.pointerId !== event.pointerId) return;
    event.preventDefault();
    event.stopPropagation();

    const next = resizeViewPlacement(
      session.startPlacement,
      {
        x: event.clientX - session.startClientX,
        y: event.clientY - session.startClientY,
      },
      canvasWidth,
      config
    );
    session.latestPlacement = next;
    onResizePreview(next);
  };

  const finishResize = (event: PointerEvent, commit: boolean) => {
    const session = resizeSessionRef.current;
    if (!session || session.pointerId !== event.pointerId) return;
    event.preventDefault();
    event.stopPropagation();

    try {
      session.target.releasePointerCapture?.(event.pointerId);
    } catch {
      // Pointer capture may already be released by the host environment.
    }
    resizeSessionRef.current = null;
    setIsResizing(false);
    onResizePreview(null);

    if (commit && hasSizeChanged(session.startPlacement, session.latestPlacement)) {
      onResizeEnd(session.latestPlacement);
    }
  };

  const handleItemKeyDown = (event: KeyboardEvent) => {
    if (!editing || event.target !== event.currentTarget) return;
    const delta = getArrowDelta(event.key, keyboardStep);
    if (delta) {
      event.preventDefault();
      if (!placement.locked) onKeyboardChange(id, delta, event.shiftKey);
      return;
    }

    const key = event.key.toLowerCase();
    if (key === 'escape') {
      event.preventDefault();
      onDeselect();
    } else if (key === 'pageup') {
      event.preventDefault();
      onBringToFront(id);
    } else if (key === 'l') {
      event.preventDefault();
      onToggleLocked(id);
    } else if (key === 'c') {
      event.preventDefault();
      onToggleCollapsed(id);
    }
  };

  const handleResizeKeyDown = (event: KeyboardEvent) => {
    const delta = getArrowDelta(event.key, keyboardStep);
    if (!delta || placement.locked || placement.collapsed) return;
    event.preventDefault();
    event.stopPropagation();
    onSelect(id);
    const next = resizeViewPlacement(placement, delta, canvasWidth, config);
    if (hasSizeChanged(placement, next)) onResizeEnd(next);
  };

  const visualHeight = getFreeformVisualHeight(placement);
  const style = {
    left: `${placement.x}px`,
    top: `${placement.y}px`,
    width: `${placement.width}px`,
    height: `${visualHeight}px`,
    zIndex: isDragging || isResizing ? 100000 : (placement.zIndex ?? index + 1),
    transform: transform
      ? `translate3d(${Math.round(transform.x)}px, ${Math.round(transform.y)}px, 0)`
      : undefined,
  };

  return (
    <div
      ref={setNodeRef as any}
      class={`think-freeform-item${editing ? ' is-editing' : ''}${selected ? ' is-selected' : ''}${placement.locked ? ' is-locked' : ''}${placement.collapsed ? ' is-collapsed' : ''}${isDragging ? ' is-dragging' : ''}${isResizing ? ' is-resizing' : ''}`}
      style={style as any}
      data-view-instance-id={id}
      data-view-type={viewType}
      data-layout-locked={placement.locked ? 'true' : 'false'}
      role={editing ? 'group' : undefined}
      aria-label={editing ? `自由布局卡片：${label}` : undefined}
      data-layout-selected={selected ? 'true' : 'false'}
      aria-keyshortcuts={editing ? 'ArrowUp ArrowDown ArrowLeft ArrowRight Shift+ArrowUp Shift+ArrowDown Shift+ArrowLeft Shift+ArrowRight PageUp L C Escape' : undefined}
      tabIndex={editing ? 0 : undefined}
      onKeyDown={handleItemKeyDown as any}
      onPointerDown={((event: PointerEvent) => {
        if (editing && event.button === 0) onSelect(id);
      }) as any}
      onFocus={() => {
        if (editing) onSelect(id);
      }}
    >
      {children({
        dragHandleProps,
        isDragging,
        isResizing,
        editing,
        selected,
        placement,
        onBringToFront: () => onBringToFront(id),
        onToggleLocked: () => onToggleLocked(id),
        onToggleCollapsed: () => onToggleCollapsed(id),
        onRemoveFromLayout: () => onRemoveFromLayout(id),
      })}
      {editing && !placement.locked && !placement.collapsed && (
        <span
          class="think-freeform-resize-handle"
          role="button"
          tabIndex={0}
          aria-label={`调整“${label}”尺寸`}
          aria-keyshortcuts="ArrowUp ArrowDown ArrowLeft ArrowRight"
          title={`拖动或使用方向键调整尺寸（${Math.round(placement.width)} × ${Math.round(placement.height)}）`}
          onKeyDown={handleResizeKeyDown as any}
          onPointerDown={handleResizePointerDown as any}
          onPointerMove={handleResizePointerMove as any}
          onPointerUp={((event: PointerEvent) => finishResize(event, true)) as any}
          onPointerCancel={((event: PointerEvent) => finishResize(event, false)) as any}
        />
      )}
      {isResizing && (
        <span class="think-freeform-size-indicator" aria-hidden="true">
          {Math.round(placement.width)} × {Math.round(placement.height)}
        </span>
      )}
    </div>
  );
}
