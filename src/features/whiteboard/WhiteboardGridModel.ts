import type { WhiteboardCamera } from './WhiteboardCameraModel';
import { clampWhiteboardZoom } from './WhiteboardZoomModel';

export interface WhiteboardGridMetrics {
  minorSizePx: number;
  majorSizePx: number;
  minorOffsetX: number;
  minorOffsetY: number;
  majorOffsetX: number;
  majorOffsetY: number;
}

const TARGET_MINOR_SCREEN_PX = 32;
const MAJOR_MULTIPLIER = 5;

function positiveModulo(value: number, divisor: number): number {
  if (!Number.isFinite(value) || !Number.isFinite(divisor) || divisor <= 0) return 0;
  return ((value % divisor) + divisor) % divisor;
}

function niceWorldStepAtLeast(rawStep: number): number {
  const safeRaw = Number.isFinite(rawStep) && rawStep > 0 ? rawStep : 1;
  const magnitude = 10 ** Math.floor(Math.log10(safeRaw));
  const normalized = safeRaw / magnitude;
  const nice = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return nice * magnitude;
}

export function getWhiteboardGridMetrics(camera: WhiteboardCamera, zoom: number): WhiteboardGridMetrics {
  const safeZoom = clampWhiteboardZoom(zoom);
  const minorWorld = niceWorldStepAtLeast(TARGET_MINOR_SCREEN_PX / safeZoom);
  const minorSizePx = minorWorld * safeZoom;
  const majorSizePx = minorSizePx * MAJOR_MULTIPLIER;
  const screenOriginX = -camera.x * safeZoom;
  const screenOriginY = -camera.y * safeZoom;
  return {
    minorSizePx,
    majorSizePx,
    minorOffsetX: positiveModulo(screenOriginX, minorSizePx),
    minorOffsetY: positiveModulo(screenOriginY, minorSizePx),
    majorOffsetX: positiveModulo(screenOriginX, majorSizePx),
    majorOffsetY: positiveModulo(screenOriginY, majorSizePx),
  };
}

export function getWhiteboardGridStyle(camera: WhiteboardCamera, zoom: number): string {
  const grid = getWhiteboardGridMetrics(camera, zoom);
  return [
    `--think-whiteboard-grid-minor:${grid.minorSizePx}px`,
    `--think-whiteboard-grid-major:${grid.majorSizePx}px`,
    `--think-whiteboard-grid-minor-x:${grid.minorOffsetX}px`,
    `--think-whiteboard-grid-minor-y:${grid.minorOffsetY}px`,
    `--think-whiteboard-grid-major-x:${grid.majorOffsetX}px`,
    `--think-whiteboard-grid-major-y:${grid.majorOffsetY}px`,
  ].join(';');
}
