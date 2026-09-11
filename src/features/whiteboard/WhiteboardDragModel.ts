import type { WhiteboardItem, WhiteboardPosition } from '@core/whiteboard/public';

export const WHITEBOARD_DRAG_THRESHOLD_PX = 5;
export const WHITEBOARD_CARD_WIDTH_PX = 248;
export const WHITEBOARD_CARD_HEIGHT_ESTIMATE_PX = 260;

export interface WhiteboardDragSession {
  pointerId: number;
  startClientX: number;
  startClientY: number;
  origin: WhiteboardPosition;
  activeZIndex: number;
}

export function createWhiteboardDragSession(input: {
  item: WhiteboardItem;
  pointerId: number;
  clientX: number;
  clientY: number;
  activeZIndex: number;
}): WhiteboardDragSession {
  return {
    pointerId: input.pointerId,
    startClientX: input.clientX,
    startClientY: input.clientY,
    origin: {
      x: input.item.x,
      y: input.item.y,
      zIndex: input.item.zIndex,
    },
    activeZIndex: input.activeZIndex,
  };
}

/**
 * camera 在单次卡片拖动期间保持不变，因此 world delta 只需要 screen delta / zoom。
 * 不夹紧 x/y，允许用户把卡片拖到任意负 world 坐标。
 */
export function resolveWhiteboardDragPreview(
  session: WhiteboardDragSession,
  clientX: number,
  clientY: number,
  zoom = 1,
  thresholdPx = WHITEBOARD_DRAG_THRESHOLD_PX,
): WhiteboardPosition | null {
  const screenDeltaX = clientX - session.startClientX;
  const screenDeltaY = clientY - session.startClientY;
  if (Math.hypot(screenDeltaX, screenDeltaY) < thresholdPx) return null;
  const safeZoom = Number.isFinite(zoom) && zoom > 0 ? zoom : 1;

  return {
    x: session.origin.x + screenDeltaX / safeZoom,
    y: session.origin.y + screenDeltaY / safeZoom,
    zIndex: session.activeZIndex,
  };
}

export function getNextWhiteboardZIndex(items: WhiteboardItem[]): number {
  return items.reduce((max, item) => Math.max(max, item.zIndex ?? 0), 0) + 1;
}
