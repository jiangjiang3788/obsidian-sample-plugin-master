import type { WhiteboardAnnotation, WhiteboardGroup, WhiteboardItem } from '@core/whiteboard/public';
import { WHITEBOARD_CARD_HEIGHT_ESTIMATE_PX, WHITEBOARD_CARD_WIDTH_PX } from './WhiteboardDragModel';
import { WHITEBOARD_WORKBENCH_COLLAPSED_WIDTH_PX, WHITEBOARD_WORKBENCH_HEADER_HEIGHT_PX, WHITEBOARD_WORKBENCH_MIN_HEIGHT_PX, WHITEBOARD_WORKBENCH_MIN_WIDTH_PX, getWhiteboardWorkbenchFrame } from './WhiteboardWorkbenchModel';
import type { WhiteboardWorldBounds, WhiteboardWorldPoint } from './WhiteboardCameraModel';

const WHITEBOARD_TEXT_ANNOTATION_WIDTH_PX = 260;
const WHITEBOARD_TEXT_ANNOTATION_HEIGHT_PX = 48;
const WHITEBOARD_STICKY_ANNOTATION_HEIGHT_PX = 132;

function includeRect(bounds: WhiteboardWorldBounds | null, x: number, y: number, right: number, bottom: number): WhiteboardWorldBounds {
  if (!bounds) return { x, y, right, bottom, width: Math.max(0, right - x), height: Math.max(0, bottom - y) };
  const nextX = Math.min(bounds.x, x);
  const nextY = Math.min(bounds.y, y);
  const nextRight = Math.max(bounds.right, right);
  const nextBottom = Math.max(bounds.bottom, bottom);
  return { x: nextX, y: nextY, right: nextRight, bottom: nextBottom, width: nextRight - nextX, height: nextBottom - nextY };
}

/** 1.2.5：统一计算当前 canvas 的内容包围盒；空 Workbench 与 Annotation 也算内容。 */
export function getWhiteboardCanvasContentBounds(
  items: readonly WhiteboardItem[],
  groups: readonly WhiteboardGroup[] = [],
  annotations: readonly WhiteboardAnnotation[] = [],
): WhiteboardWorldBounds | null {
  let bounds: WhiteboardWorldBounds | null = null;
  items.forEach((item) => {
    bounds = includeRect(bounds, item.x, item.y, item.x + WHITEBOARD_CARD_WIDTH_PX, item.y + WHITEBOARD_CARD_HEIGHT_ESTIMATE_PX);
  });
  groups.forEach((group) => {
    const frame = getWhiteboardWorkbenchFrame(group, items, groups);
    bounds = includeRect(bounds, frame.x, frame.y, frame.right, frame.bottom);
  });
  annotations.forEach((annotation) => {
    const height = annotation.kind === 'sticky' ? WHITEBOARD_STICKY_ANNOTATION_HEIGHT_PX : WHITEBOARD_TEXT_ANNOTATION_HEIGHT_PX;
    bounds = includeRect(bounds, annotation.x, annotation.y, annotation.x + WHITEBOARD_TEXT_ANNOTATION_WIDTH_PX, annotation.y + height);
  });
  return bounds;
}

export function getWhiteboardBoundsCenter(bounds: WhiteboardWorldBounds): WhiteboardWorldPoint {
  return { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 };
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

/**
 * 1.2.5 R3：100%“找回当前画布”不能落在巨大包围盒的空白几何中心。
 * 先用坐标中位数抵抗远端离群节点，再选择一个真实可见内容锚点，因此 reset 后至少有节点/工作台/标注可见。
 */
export function getWhiteboardCanvasHomePoint(
  items: readonly WhiteboardItem[],
  groups: readonly WhiteboardGroup[] = [],
  annotations: readonly WhiteboardAnnotation[] = [],
  fallback: WhiteboardWorldPoint = { x: 0, y: 0 },
): WhiteboardWorldPoint {
  const candidates: WhiteboardWorldPoint[] = [];
  items.forEach((item) => candidates.push({ x: item.x + WHITEBOARD_CARD_WIDTH_PX / 2, y: item.y + WHITEBOARD_CARD_HEIGHT_ESTIMATE_PX / 2 }));
  groups.forEach((group) => {
    const width = group.collapsed ? WHITEBOARD_WORKBENCH_COLLAPSED_WIDTH_PX : WHITEBOARD_WORKBENCH_MIN_WIDTH_PX;
    const height = group.collapsed ? WHITEBOARD_WORKBENCH_HEADER_HEIGHT_PX : WHITEBOARD_WORKBENCH_MIN_HEIGHT_PX;
    candidates.push({ x: group.x + width / 2, y: group.y + height / 2 });
  });
  annotations.forEach((annotation) => {
    const height = annotation.kind === 'sticky' ? WHITEBOARD_STICKY_ANNOTATION_HEIGHT_PX : WHITEBOARD_TEXT_ANNOTATION_HEIGHT_PX;
    candidates.push({ x: annotation.x + WHITEBOARD_TEXT_ANNOTATION_WIDTH_PX / 2, y: annotation.y + height / 2 });
  });
  if (candidates.length === 0) return fallback;
  const robust = { x: median(candidates.map((point) => point.x)), y: median(candidates.map((point) => point.y)) };
  return candidates.reduce((best, point) => {
    const bestDistance = (best.x - robust.x) ** 2 + (best.y - robust.y) ** 2;
    const distance = (point.x - robust.x) ** 2 + (point.y - robust.y) ** 2;
    return distance < bestDistance ? point : best;
  });
}

