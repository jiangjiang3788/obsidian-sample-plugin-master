export const WHITEBOARD_ZOOM_MIN = 0.005;
export const WHITEBOARD_ZOOM_MAX = 128;
export const WHITEBOARD_ZOOM_STEP_RATIO = 1.25;
export const WHITEBOARD_ZOOM_DEFAULT = 1;
export const WHITEBOARD_ZOOM_WHEEL_SENSITIVITY = 0.0025;

export function clampWhiteboardZoom(value: number): number {
  if (!Number.isFinite(value)) return WHITEBOARD_ZOOM_DEFAULT;
  const clamped = Math.min(WHITEBOARD_ZOOM_MAX, Math.max(WHITEBOARD_ZOOM_MIN, value));
  return Math.round(clamped * 100_000) / 100_000;
}

export function stepWhiteboardZoom(current: number, direction: -1 | 1): number {
  const safeCurrent = clampWhiteboardZoom(current);
  return clampWhiteboardZoom(safeCurrent * (direction > 0 ? WHITEBOARD_ZOOM_STEP_RATIO : 1 / WHITEBOARD_ZOOM_STEP_RATIO));
}

export function resolveWhiteboardWheelZoom(current: number, deltaY: number): number {
  if (!Number.isFinite(deltaY) || deltaY === 0) return clampWhiteboardZoom(current);
  return clampWhiteboardZoom(clampWhiteboardZoom(current) * Math.exp(-deltaY * WHITEBOARD_ZOOM_WHEEL_SENSITIVITY));
}

export function formatWhiteboardZoomPercent(zoom: number): string {
  const percent = clampWhiteboardZoom(zoom) * 100;
  if (percent < 1) return `${Number(percent.toFixed(2))}%`;
  if (percent < 10) return `${Number(percent.toFixed(1))}%`;
  return `${Math.round(percent)}%`;
}
