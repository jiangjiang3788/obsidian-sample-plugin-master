import { clampWhiteboardZoom, WHITEBOARD_ZOOM_DEFAULT } from './WhiteboardZoomModel';

/**
 * 1.1.5 坐标合同：
 * - world：WhiteboardItem 持久化 x/y 所在的无限逻辑平面，可为负数；
 * - camera：当前 viewport 左上角对应的 world 坐标，只存在内存；
 * - screen：浏览器 client 坐标 / viewport 内像素。
 *
 * viewportLocal = (world - camera) * zoom
 * world = camera + viewportLocal / zoom
 */
export interface WhiteboardCamera {
  x: number;
  y: number;
}

export interface WhiteboardWorldPoint {
  x: number;
  y: number;
}


export interface WhiteboardWorldBounds {
  x: number;
  y: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
}

export interface WhiteboardScreenPoint {
  clientX: number;
  clientY: number;
}

export interface WhiteboardViewportFrame {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface WhiteboardPanSession {
  pointerId: number;
  startClientX: number;
  startClientY: number;
  startCamera: WhiteboardCamera;
  zoom: number;
}

export const WHITEBOARD_CAMERA_DEFAULT: WhiteboardCamera = { x: 0, y: 0 };

function finiteOrZero(value: number): number {
  return Number.isFinite(value) ? value : 0;
}

function safeCamera(camera: WhiteboardCamera): WhiteboardCamera {
  return { x: finiteOrZero(camera.x), y: finiteOrZero(camera.y) };
}

export function screenToWhiteboardWorld(
  point: WhiteboardScreenPoint,
  viewport: Pick<WhiteboardViewportFrame, 'left' | 'top'>,
  camera: WhiteboardCamera,
  zoom: number,
): WhiteboardWorldPoint {
  const safeZoom = clampWhiteboardZoom(zoom);
  const currentCamera = safeCamera(camera);
  return {
    x: currentCamera.x + (finiteOrZero(point.clientX) - finiteOrZero(viewport.left)) / safeZoom,
    y: currentCamera.y + (finiteOrZero(point.clientY) - finiteOrZero(viewport.top)) / safeZoom,
  };
}

export function worldToWhiteboardScreen(
  point: WhiteboardWorldPoint,
  viewport: Pick<WhiteboardViewportFrame, 'left' | 'top'>,
  camera: WhiteboardCamera,
  zoom: number,
): WhiteboardScreenPoint {
  const safeZoom = clampWhiteboardZoom(zoom);
  const currentCamera = safeCamera(camera);
  return {
    clientX: finiteOrZero(viewport.left) + (finiteOrZero(point.x) - currentCamera.x) * safeZoom,
    clientY: finiteOrZero(viewport.top) + (finiteOrZero(point.y) - currentCamera.y) * safeZoom,
  };
}

export function createWhiteboardPanSession(input: {
  pointerId: number;
  clientX: number;
  clientY: number;
  camera: WhiteboardCamera;
  zoom: number;
}): WhiteboardPanSession {
  return {
    pointerId: input.pointerId,
    startClientX: finiteOrZero(input.clientX),
    startClientY: finiteOrZero(input.clientY),
    startCamera: safeCamera(input.camera),
    zoom: clampWhiteboardZoom(input.zoom),
  };
}

/** 拖动画布向右时，camera 向左移动，因此能够自然进入负 world。 */
export function resolveWhiteboardPannedCamera(
  session: WhiteboardPanSession,
  clientX: number,
  clientY: number,
): WhiteboardCamera {
  return {
    x: session.startCamera.x - (finiteOrZero(clientX) - session.startClientX) / session.zoom,
    y: session.startCamera.y - (finiteOrZero(clientY) - session.startClientY) / session.zoom,
  };
}

/** wheel/trackpad 的 delta 是屏幕像素；换成 world 增量后推进 camera。 */
export function resolveWhiteboardWheelPannedCamera(
  camera: WhiteboardCamera,
  deltaX: number,
  deltaY: number,
  zoom: number,
): WhiteboardCamera {
  const safeZoom = clampWhiteboardZoom(zoom);
  const currentCamera = safeCamera(camera);
  return {
    x: currentCamera.x + finiteOrZero(deltaX) / safeZoom,
    y: currentCamera.y + finiteOrZero(deltaY) / safeZoom,
  };
}

/** Zoom 前后保持 anchor 下的同一个 world 点不动。 */
export function resolveWhiteboardZoomedCamera(input: {
  camera: WhiteboardCamera;
  currentZoom: number;
  nextZoom: number;
  anchorOffsetX: number;
  anchorOffsetY: number;
}): WhiteboardCamera {
  const currentZoom = clampWhiteboardZoom(input.currentZoom);
  const nextZoom = clampWhiteboardZoom(input.nextZoom);
  const currentCamera = safeCamera(input.camera);
  const anchorOffsetX = finiteOrZero(input.anchorOffsetX);
  const anchorOffsetY = finiteOrZero(input.anchorOffsetY);
  return {
    x: currentCamera.x + anchorOffsetX / currentZoom - anchorOffsetX / nextZoom,
    y: currentCamera.y + anchorOffsetY / currentZoom - anchorOffsetY / nextZoom,
  };
}

export function centerWhiteboardCameraOnWorldPoint(input: {
  point: WhiteboardWorldPoint;
  viewportWidth: number;
  viewportHeight: number;
  zoom: number;
}): WhiteboardCamera {
  const zoom = clampWhiteboardZoom(input.zoom);
  return {
    x: finiteOrZero(input.point.x) - Math.max(0, finiteOrZero(input.viewportWidth)) / (2 * zoom),
    y: finiteOrZero(input.point.y) - Math.max(0, finiteOrZero(input.viewportHeight)) / (2 * zoom),
  };
}

export function fitWhiteboardBoundsToViewport(input: {
  bounds: Pick<WhiteboardWorldBounds, 'x' | 'y' | 'right' | 'bottom'>;
  viewportWidth: number;
  viewportHeight: number;
  padding?: number;
  maxZoom?: number;
}): { camera: WhiteboardCamera; zoom: number } {
  const padding = Math.max(0, finiteOrZero(input.padding ?? 48));
  const viewportWidth = Math.max(1, finiteOrZero(input.viewportWidth));
  const viewportHeight = Math.max(1, finiteOrZero(input.viewportHeight));
  const width = Math.max(1, finiteOrZero(input.bounds.right) - finiteOrZero(input.bounds.x));
  const height = Math.max(1, finiteOrZero(input.bounds.bottom) - finiteOrZero(input.bounds.y));
  const availableWidth = Math.max(1, viewportWidth - padding * 2);
  const availableHeight = Math.max(1, viewportHeight - padding * 2);
  const maxZoom = clampWhiteboardZoom(input.maxZoom ?? WHITEBOARD_ZOOM_DEFAULT);
  const zoom = clampWhiteboardZoom(Math.min(maxZoom, availableWidth / width, availableHeight / height));
  const point = { x: finiteOrZero(input.bounds.x) + width / 2, y: finiteOrZero(input.bounds.y) + height / 2 };
  return { camera: centerWhiteboardCameraOnWorldPoint({ point, viewportWidth, viewportHeight, zoom }), zoom };
}

export function getWhiteboardWorldTransform(camera: WhiteboardCamera, zoom: number): string {
  const safeZoom = clampWhiteboardZoom(zoom);
  const currentCamera = safeCamera(camera);
  return `matrix(${safeZoom},0,0,${safeZoom},${-currentCamera.x * safeZoom},${-currentCamera.y * safeZoom})`;
}
