import type { WhiteboardAnnotation, WhiteboardGroup, WhiteboardItem } from '@core/whiteboard/public';
import type { WhiteboardWorldPoint } from './WhiteboardCameraModel';
import { WHITEBOARD_CARD_HEIGHT_ESTIMATE_PX, WHITEBOARD_CARD_WIDTH_PX } from './WhiteboardDragModel';
import {
  WHITEBOARD_WORKBENCH_COLLAPSED_WIDTH_PX,
  WHITEBOARD_WORKBENCH_HEADER_HEIGHT_PX,
  WHITEBOARD_WORKBENCH_MIN_WIDTH_PX,
} from './WhiteboardWorkbenchModel';

/**
 * Durable/world geometry only. These anchors are derived from persisted whiteboard x/y and
 * deliberately know nothing about semantic zoom, screen pixels or presentation collision offsets.
 */
export function getWhiteboardItemWorldAnchor(item: Pick<WhiteboardItem, 'x' | 'y'>): WhiteboardWorldPoint {
  return { x: item.x + WHITEBOARD_CARD_WIDTH_PX / 2, y: item.y + WHITEBOARD_CARD_HEIGHT_ESTIMATE_PX / 2 };
}

export function getWhiteboardGroupWorldAnchor(group: Pick<WhiteboardGroup, 'x' | 'y' | 'collapsed'>): WhiteboardWorldPoint {
  return {
    x: group.x + (group.collapsed ? WHITEBOARD_WORKBENCH_COLLAPSED_WIDTH_PX : WHITEBOARD_WORKBENCH_MIN_WIDTH_PX) / 2,
    y: group.y + WHITEBOARD_WORKBENCH_HEADER_HEIGHT_PX / 2,
  };
}

export function getWhiteboardAnnotationWorldAnchor(annotation: Pick<WhiteboardAnnotation, 'x' | 'y' | 'kind'>): WhiteboardWorldPoint {
  return { x: annotation.x + 130, y: annotation.y + (annotation.kind === 'sticky' ? 66 : 24) };
}

export function translateWhiteboardWorldPoint(
  point: WhiteboardWorldPoint,
  delta?: { dx: number; dy: number } | null,
): WhiteboardWorldPoint {
  return delta ? { x: point.x + delta.dx, y: point.y + delta.dy } : point;
}
