import type { WhiteboardItem, WhiteboardPosition } from '@core/whiteboard/public';
import { WHITEBOARD_CARD_WIDTH_PX } from './WhiteboardDragModel';

export const WHITEBOARD_EDGE_ANCHOR_Y_PX = 48;
export const WHITEBOARD_EDGE_MIN_CURVE_PX = 48;
export const WHITEBOARD_EDGE_MAX_CURVE_PX = 180;

export interface WhiteboardEdgeGeometry {
  startX: number;
  startY: number;
  control1X: number;
  control1Y: number;
  control2X: number;
  control2Y: number;
  endX: number;
  endY: number;
  midpointX: number;
  midpointY: number;
  pathD: string;
}

type PositionedItem = Pick<WhiteboardItem, 'x' | 'y'>;

function cubicPoint(
  start: number,
  control1: number,
  control2: number,
  end: number,
  t: number,
): number {
  const oneMinusT = 1 - t;
  return (
    oneMinusT ** 3 * start
    + 3 * oneMinusT ** 2 * t * control1
    + 3 * oneMinusT * t ** 2 * control2
    + t ** 3 * end
  );
}

/**
 * Edge 只需要知道卡片的固定宽度与一个稳定的顶部锚点。
 * 不依赖 DOM 测量，避免拖动时每帧 layout/reflow；曲线在卡片左右边缘进出。
 */
export function getWhiteboardEdgeGeometry(
  from: PositionedItem,
  to: PositionedItem,
): WhiteboardEdgeGeometry {
  const fromCenterX = from.x + WHITEBOARD_CARD_WIDTH_PX / 2;
  const toCenterX = to.x + WHITEBOARD_CARD_WIDTH_PX / 2;
  const goesRight = toCenterX >= fromCenterX;

  const startX = goesRight ? from.x + WHITEBOARD_CARD_WIDTH_PX : from.x;
  const endX = goesRight ? to.x : to.x + WHITEBOARD_CARD_WIDTH_PX;
  const startY = from.y + WHITEBOARD_EDGE_ANCHOR_Y_PX;
  const endY = to.y + WHITEBOARD_EDGE_ANCHOR_Y_PX;
  const horizontalSpan = Math.abs(endX - startX);
  const curve = Math.min(
    WHITEBOARD_EDGE_MAX_CURVE_PX,
    Math.max(WHITEBOARD_EDGE_MIN_CURVE_PX, horizontalSpan / 2),
  );
  const direction = goesRight ? 1 : -1;
  const control1X = startX + curve * direction;
  const control2X = endX - curve * direction;
  const control1Y = startY;
  const control2Y = endY;
  const midpointX = cubicPoint(startX, control1X, control2X, endX, 0.5);
  const midpointY = cubicPoint(startY, control1Y, control2Y, endY, 0.5);

  return {
    startX,
    startY,
    control1X,
    control1Y,
    control2X,
    control2Y,
    endX,
    endY,
    midpointX,
    midpointY,
    pathD: `M ${startX} ${startY} C ${control1X} ${control1Y}, ${control2X} ${control2Y}, ${endX} ${endY}`,
  };
}


export function getWhiteboardPointEdgeGeometry(
  from: { x: number; y: number },
  to: { x: number; y: number },
): WhiteboardEdgeGeometry {
  const dx = to.x - from.x;
  const direction = dx >= 0 ? 1 : -1;
  const curve = Math.min(WHITEBOARD_EDGE_MAX_CURVE_PX, Math.max(WHITEBOARD_EDGE_MIN_CURVE_PX, Math.abs(dx) / 2));
  const control1X = from.x + curve * direction;
  const control2X = to.x - curve * direction;
  const midpointX = cubicPoint(from.x, control1X, control2X, to.x, 0.5);
  const midpointY = cubicPoint(from.y, from.y, to.y, to.y, 0.5);
  return {
    startX: from.x,
    startY: from.y,
    control1X,
    control1Y: from.y,
    control2X,
    control2Y: to.y,
    endX: to.x,
    endY: to.y,
    midpointX,
    midpointY,
    pathD: `M ${from.x} ${from.y} C ${control1X} ${from.y}, ${control2X} ${to.y}, ${to.x} ${to.y}`,
  };
}

export function resolveWhiteboardItemPosition(
  item: WhiteboardItem,
  preview?: { itemId: string; position: WhiteboardPosition } | null,
): WhiteboardItem {
  if (!preview || preview.itemId !== item.id) return item;
  return {
    ...item,
    ...preview.position,
  };
}

export function getWhiteboardConnectionPreviewPath(
  start: { x: number; y: number },
  end: { x: number; y: number },
): string {
  const dx = end.x - start.x;
  const direction = dx >= 0 ? 1 : -1;
  const curve = Math.min(WHITEBOARD_EDGE_MAX_CURVE_PX, Math.max(WHITEBOARD_EDGE_MIN_CURVE_PX, Math.abs(dx) / 2));
  const c1x = start.x + curve * direction;
  const c2x = end.x - curve * direction;
  return `M ${start.x} ${start.y} C ${c1x} ${start.y}, ${c2x} ${end.y}, ${end.x} ${end.y}`;
}
