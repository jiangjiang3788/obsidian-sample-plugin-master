/** @jsxImportSource preact */
import { h } from 'preact';
import type { ComponentChildren } from 'preact';
import { useCallback, useEffect, useMemo, useRef, useState } from 'preact/hooks';
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragMoveEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import type { Layout, ViewInstance, ViewPlacement } from '@core/types/public';
import {
  bringViewPlacementsToFront,
  calculateFreeformCanvasHeight,
  getDefaultFreeformItemSize,
  moveViewPlacement,
  normalizeFreeformLayoutConfig,
  resizeViewPlacement,
  resolveViewPlacements,
} from '@core/layout/public';
import { FreeformLayoutItem, type FreeformLayoutItemRenderProps } from './FreeformLayoutItem';

export interface FreeformCanvasProps {
  layout: Layout;
  viewInstances: ViewInstance[];
  editing: boolean;
  renderItem: (viewId: string, props: FreeformLayoutItemRenderProps) => ComponentChildren;
  onPlacementChange: (viewId: string, placement: ViewPlacement) => void;
  onPlacementsChange: (placements: Record<string, ViewPlacement>) => void;
  onRemoveView: (viewId: string) => void;
}

const FALLBACK_CANVAS_WIDTH = 960;

function mergePlacement(
  base: Record<string, ViewPlacement>,
  override: Record<string, ViewPlacement>
): Record<string, ViewPlacement> {
  return Object.keys(override).length > 0 ? { ...base, ...override } : base;
}

function isSamePlacement(left: ViewPlacement, right: ViewPlacement): boolean {
  return left.x === right.x
    && left.y === right.y
    && left.width === right.width
    && left.height === right.height
    && left.zIndex === right.zIndex
    && left.locked === right.locked
    && left.collapsed === right.collapsed;
}

export function FreeformCanvas({
  layout,
  viewInstances,
  editing,
  renderItem,
  onPlacementChange,
  onPlacementsChange,
  onRemoveView,
}: FreeformCanvasProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const previousPersistedPlacementsRef = useRef(layout.viewPlacements);
  const [canvasWidth, setCanvasWidth] = useState(FALLBACK_CANVAS_WIDTH);
  const [selectedViewId, setSelectedViewId] = useState<string | null>(null);
  const [localOverrides, setLocalOverrides] = useState<Record<string, ViewPlacement>>({});
  const [resizePreviews, setResizePreviews] = useState<Record<string, ViewPlacement>>({});
  const [dragPreview, setDragPreview] = useState<{ id: string; placement: ViewPlacement } | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    })
  );

  const config = useMemo(
    () => normalizeFreeformLayoutConfig(layout.freeformConfig),
    [layout.freeformConfig]
  );
  const keyboardStep = config.snapToGrid ? config.gridSize : 8;

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const updateWidth = () => {
      const measured = Math.max(
        config.minCanvasWidth,
        Math.floor(host.clientWidth || FALLBACK_CANVAS_WIDTH)
      );
      setCanvasWidth((current) => current === measured ? current : measured);
    };

    updateWidth();
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', updateWidth);
      return () => window.removeEventListener('resize', updateWidth);
    }

    const observer = new ResizeObserver(updateWidth);
    observer.observe(host);
    return () => observer.disconnect();
  }, [config.minCanvasWidth]);

  useEffect(() => {
    setSelectedViewId(null);
    setLocalOverrides({});
    setResizePreviews({});
    setDragPreview(null);
    previousPersistedPlacementsRef.current = layout.viewPlacements;
  }, [layout.id]);

  useEffect(() => {
    if (previousPersistedPlacementsRef.current === layout.viewPlacements) return;
    previousPersistedPlacementsRef.current = layout.viewPlacements;
    setLocalOverrides({});
  }, [layout.viewPlacements]);

  useEffect(() => {
    if (editing) return;
    setSelectedViewId(null);
    setResizePreviews({});
    setDragPreview(null);
  }, [editing]);

  useEffect(() => {
    if (selectedViewId && !layout.viewInstanceIds.includes(selectedViewId)) {
      setSelectedViewId(null);
    }
  }, [layout.viewInstanceIds, selectedViewId]);

  const viewById = useMemo(
    () => new Map(viewInstances.map((view) => [view.id, view])),
    [viewInstances]
  );

  const preferredSizes = useMemo(
    () => layout.viewInstanceIds.reduce<Record<string, { width: number; height: number }>>((result, viewId) => {
      result[viewId] = getDefaultFreeformItemSize(viewById.get(viewId)?.viewType, config);
      return result;
    }, {}),
    [config, layout.viewInstanceIds, viewById]
  );

  const resolvedPlacements = useMemo(
    () => resolveViewPlacements(
      layout.viewInstanceIds,
      layout.viewPlacements,
      canvasWidth,
      config,
      preferredSizes
    ),
    [canvasWidth, config, layout.viewInstanceIds, layout.viewPlacements, preferredSizes]
  );

  const placements = useMemo(
    () => mergePlacement(resolvedPlacements, localOverrides),
    [localOverrides, resolvedPlacements]
  );

  const displayedPlacements = useMemo(
    () => mergePlacement(placements, resizePreviews),
    [placements, resizePreviews]
  );

  const placementsForHeight = useMemo(() => {
    if (!dragPreview) return displayedPlacements;
    return {
      ...displayedPlacements,
      [dragPreview.id]: dragPreview.placement,
    };
  }, [displayedPlacements, dragPreview]);

  const canvasHeight = useMemo(
    () => calculateFreeformCanvasHeight(placementsForHeight, config),
    [config, placementsForHeight]
  );

  const commitPlacement = useCallback((viewId: string, placement: ViewPlacement) => {
    setLocalOverrides((current) => ({ ...current, [viewId]: placement }));
    onPlacementChange(viewId, placement);
  }, [onPlacementChange]);

  const commitPlacements = useCallback((next: Record<string, ViewPlacement>) => {
    setLocalOverrides(next);
    onPlacementsChange(next);
  }, [onPlacementsChange]);

  const handleDragStart = (event: DragStartEvent) => {
    if (!editing) return;
    setSelectedViewId(String(event.active.id));
  };

  const handleDragMove = (event: DragMoveEvent) => {
    const viewId = String(event.active.id);
    const current = placements[viewId];
    if (!editing || !current || current.locked) return;
    setDragPreview({
      id: viewId,
      placement: moveViewPlacement(current, event.delta, canvasWidth, config),
    });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const viewId = String(event.active.id);
    const current = placements[viewId];
    setDragPreview(null);
    if (!editing || !current || current.locked) return;
    if (event.delta.x === 0 && event.delta.y === 0) return;

    const next = moveViewPlacement(current, event.delta, canvasWidth, config);
    if (!isSamePlacement(current, next)) commitPlacement(viewId, next);
  };

  const handleBringToFront = (viewId: string) => {
    const next = bringViewPlacementsToFront(
      displayedPlacements,
      viewId,
      layout.viewInstanceIds
    );
    if (next === displayedPlacements) return;
    commitPlacements(next);
  };

  const handleToggleLocked = (viewId: string) => {
    const current = displayedPlacements[viewId];
    if (!current) return;
    commitPlacement(viewId, { ...current, locked: !current.locked });
  };

  const handleToggleCollapsed = (viewId: string) => {
    const current = displayedPlacements[viewId];
    if (!current) return;
    commitPlacement(viewId, { ...current, collapsed: !current.collapsed });
  };

  const handleKeyboardChange = (
    viewId: string,
    delta: { x: number; y: number },
    resize: boolean
  ) => {
    const current = displayedPlacements[viewId];
    if (!editing || !current || current.locked) return;
    const next = resize
      ? resizeViewPlacement(current, delta, canvasWidth, config)
      : moveViewPlacement(current, delta, canvasWidth, config);
    if (!isSamePlacement(current, next)) commitPlacement(viewId, next);
  };

  return (
    <div ref={hostRef} class="think-freeform-host">
      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragMove={handleDragMove}
        onDragCancel={() => setDragPreview(null)}
        onDragEnd={handleDragEnd}
      >
        <div
          class={`think-freeform-canvas${editing ? ' is-editing' : ''}`}
          style={{
            width: `${canvasWidth}px`,
            height: `${canvasHeight}px`,
            minHeight: `${config.minCanvasHeight}px`,
            '--think-freeform-grid-size': `${config.gridSize}px`,
          } as any}
          onPointerDown={((event: PointerEvent) => {
            if (editing && event.target === event.currentTarget) setSelectedViewId(null);
          }) as any}
        >
          {layout.viewInstanceIds.map((viewId, index) => {
            const placement = displayedPlacements[viewId];
            const view = viewById.get(viewId);
            if (!placement) return null;
            return (
              <FreeformLayoutItem
                key={viewId}
                id={viewId}
                label={view?.title || viewId}
                viewType={view?.viewType}
                placement={placement}
                editing={editing}
                selected={selectedViewId === viewId}
                index={index}
                canvasWidth={canvasWidth}
                keyboardStep={keyboardStep}
                config={config}
                onSelect={setSelectedViewId}
                onDeselect={() => setSelectedViewId(null)}
                onBringToFront={handleBringToFront}
                onToggleLocked={handleToggleLocked}
                onToggleCollapsed={handleToggleCollapsed}
                onRemoveFromLayout={onRemoveView}
                onKeyboardChange={handleKeyboardChange}
                onResizePreview={(preview) => {
                  setResizePreviews((current) => {
                    if (preview) return { ...current, [viewId]: preview };
                    if (!(viewId in current)) return current;
                    const next = { ...current };
                    delete next[viewId];
                    return next;
                  });
                }}
                onResizeEnd={(next) => commitPlacement(viewId, next)}
              >
                {(props) => renderItem(viewId, props)}
              </FreeformLayoutItem>
            );
          })}
        </div>
      </DndContext>
    </div>
  );
}
