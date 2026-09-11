import { screenToWhiteboardWorld, type WhiteboardCamera } from './WhiteboardCameraModel';
import { WHITEBOARD_DRAG_THRESHOLD_PX } from './WhiteboardDragModel';

export interface WhiteboardClientPoint {
  clientX: number;
  clientY: number;
}

export interface WhiteboardClientRect {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export interface WhiteboardSourceDragSession {
  pointerId: number;
  startClientX: number;
  startClientY: number;
}

export interface WhiteboardCanvasViewportSnapshot extends WhiteboardClientRect {
  camera: WhiteboardCamera;
}

export function createWhiteboardSourceDragSession(pointerId: number, clientX: number, clientY: number): WhiteboardSourceDragSession {
  return { pointerId, startClientX: clientX, startClientY: clientY };
}

export function isWhiteboardSourceDragActivated(
  session: WhiteboardSourceDragSession,
  point: WhiteboardClientPoint,
  thresholdPx = WHITEBOARD_DRAG_THRESHOLD_PX,
): boolean {
  return Math.hypot(point.clientX - session.startClientX, point.clientY - session.startClientY) >= thresholdPx;
}

export function isWhiteboardClientPointInsideRect(point: WhiteboardClientPoint, rect: WhiteboardClientRect): boolean {
  return point.clientX >= rect.left
    && point.clientX <= rect.right
    && point.clientY >= rect.top
    && point.clientY <= rect.bottom;
}

export function resolveWhiteboardCanvasDropPosition(input: {
  point: WhiteboardClientPoint;
  viewport: WhiteboardCanvasViewportSnapshot;
  zIndex: number;
  zoom?: number;
  anchorOffsetWorld?: number;
}): { x: number; y: number; zIndex: number } {
  const anchorOffsetWorld = Math.max(0, input.anchorOffsetWorld ?? 24);
  const world = screenToWhiteboardWorld(
    input.point,
    input.viewport,
    input.viewport.camera,
    input.zoom ?? 1,
  );
  return {
    x: world.x - anchorOffsetWorld,
    y: world.y - anchorOffsetWorld,
    zIndex: input.zIndex,
  };
}
