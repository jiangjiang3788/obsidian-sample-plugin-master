import type { WhiteboardWorldPoint } from './WhiteboardCameraModel';
import type { WhiteboardSemanticLayoutGuide, WhiteboardLayoutField } from './WhiteboardSemanticLayoutModel';
import type { WhiteboardSemanticZoomLevel } from './WhiteboardSemanticZoomModel';

export type WhiteboardPresentationNodeKind = 'item' | 'group' | 'annotation';
export type WhiteboardPresentationMode = 'label' | 'dot';

export interface WhiteboardSemanticPresentationNodeInput {
  id: string;
  kind: WhiteboardPresentationNodeKind;
  worldAnchor: WhiteboardWorldPoint;
  label: string;
  emphasized?: boolean;
}

export interface WhiteboardSemanticPresentationPlacement {
  id: string;
  kind: WhiteboardPresentationNodeKind;
  mode: WhiteboardPresentationMode;
  worldAnchor: WhiteboardWorldPoint;
  worldPoint: WhiteboardWorldPoint;
  screenOffsetX: number;
  screenOffsetY: number;
  widthPx: number;
  heightPx: number;
}

export interface WhiteboardSemanticGuidePresentation {
  id: string;
  mode: WhiteboardPresentationMode;
  offsetScreenX: number;
  offsetScreenY: number;
  widthPx: number;
  heightPx: number;
}

export interface WhiteboardSemanticPresentationModel {
  level: WhiteboardSemanticZoomLevel;
  zoom: number;
  items: ReadonlyMap<string, WhiteboardSemanticPresentationPlacement>;
  groups: ReadonlyMap<string, WhiteboardSemanticPresentationPlacement>;
  annotations: ReadonlyMap<string, WhiteboardSemanticPresentationPlacement>;
  guides: ReadonlyMap<string, WhiteboardSemanticGuidePresentation>;
}

interface ScreenRect { left: number; top: number; right: number; bottom: number; }
interface Candidate { x: number; y: number; }
interface NodeMetrics { width: number; height: number; mode: WhiteboardPresentationMode; }

const COLLISION_GAP_PX = 7;
const COMPACT_ITEM_MIN_WIDTH_PX = 76;
const COMPACT_ITEM_MAX_WIDTH_PX = 170;
const COMPACT_ITEM_HEIGHT_PX = 26;
const GROUP_MAX_WIDTH_PX = 180;
const GROUP_HEIGHT_PX = 24;
const DOT_SIZE_PX = 18;
const ANNOTATION_DOT_SIZE_PX = 20;

function finiteZoom(value: number): number {
  return Number.isFinite(value) && value > 0 ? value : 1;
}

function clamp(value: number, min: number, max: number): number { return Math.min(max, Math.max(min, value)); }

/** Cheap deterministic screen-width estimate; presentation geometry must not depend on DOM measurement/reflow. */
export function estimateWhiteboardPresentationLabelWidth(label: string, min = 44, max = 180): number {
  let width = 22;
  for (const char of Array.from(label.trim() || '·')) {
    const code = char.codePointAt(0) ?? 0;
    if (char === ' ') width += 4;
    else if (code >= 0x2e80) width += 12;
    else if (/[A-Z0-9]/.test(char)) width += 7.5;
    else width += 6.5;
  }
  return clamp(Math.ceil(width), min, max);
}

function overlaps(a: ScreenRect, b: ScreenRect): boolean {
  return a.left < b.right + COLLISION_GAP_PX
    && a.right + COLLISION_GAP_PX > b.left
    && a.top < b.bottom + COLLISION_GAP_PX
    && a.bottom + COLLISION_GAP_PX > b.top;
}

function rectCentered(x: number, y: number, width: number, height: number): ScreenRect {
  return { left: x - width / 2, top: y - height / 2, right: x + width / 2, bottom: y + height / 2 };
}

function rectTopLeft(x: number, y: number, width: number, height: number): ScreenRect {
  return { left: x, top: y, right: x + width, bottom: y + height };
}

function canPlace(rect: ScreenRect, occupied: readonly ScreenRect[]): boolean {
  return !occupied.some((entry) => overlaps(rect, entry));
}

function candidateOffsets(width: number, height: number, rings: number): Candidate[] {
  const stepX = Math.max(26, Math.min(82, width * 0.52 + 8));
  const stepY = Math.max(26, height + 8);
  const result: Candidate[] = [{ x: 0, y: 0 }];
  for (let ring = 1; ring <= rings; ring += 1) {
    // Prefer vertical staggering so x continues to communicate the underlying world position.
    result.push({ x: 0, y: ring * stepY }, { x: 0, y: -ring * stepY });
    for (let x = 1; x <= ring; x += 1) {
      result.push({ x: x * stepX, y: ring * stepY }, { x: -x * stepX, y: ring * stepY });
      result.push({ x: x * stepX, y: -ring * stepY }, { x: -x * stepX, y: -ring * stepY });
    }
    result.push({ x: ring * stepX, y: 0 }, { x: -ring * stepX, y: 0 });
  }
  return result;
}

function placeCentered(
  anchorX: number,
  anchorY: number,
  width: number,
  height: number,
  occupied: ScreenRect[],
  rings: number,
): Candidate | null {
  for (const candidate of candidateOffsets(width, height, rings)) {
    const rect = rectCentered(anchorX + candidate.x, anchorY + candidate.y, width, height);
    if (!canPlace(rect, occupied)) continue;
    occupied.push(rect);
    return candidate;
  }
  return null;
}

function placeTopLeft(
  anchorX: number,
  anchorY: number,
  width: number,
  height: number,
  occupied: ScreenRect[],
  rings: number,
): Candidate | null {
  for (const candidate of candidateOffsets(width, height, rings)) {
    const rect = rectTopLeft(anchorX + candidate.x, anchorY + candidate.y, width, height);
    if (!canPlace(rect, occupied)) continue;
    occupied.push(rect);
    return candidate;
  }
  return null;
}

function forcePlaceCentered(anchorX: number, anchorY: number, width: number, height: number, occupied: ScreenRect[]): Candidate {
  // A dot is the final density fallback. Give it a wider search radius before accepting overlap.
  const placed = placeCentered(anchorX, anchorY, width, height, occupied, 7);
  if (placed) return placed;
  const fallback = { x: 0, y: 0 };
  occupied.push(rectCentered(anchorX, anchorY, width, height));
  return fallback;
}

function forcePlaceTopLeft(anchorX: number, anchorY: number, width: number, height: number, occupied: ScreenRect[]): Candidate {
  const placed = placeTopLeft(anchorX, anchorY, width, height, occupied, 7);
  if (placed) return placed;
  const fallback = { x: 0, y: 0 };
  occupied.push(rectTopLeft(anchorX, anchorY, width, height));
  return fallback;
}

function guidePriority(kind: WhiteboardLayoutField): number {
  if (kind === 'goal') return 3;
  if (kind === 'recordType') return 2;
  return 1;
}

function guidePreferredOffset(kind: WhiteboardLayoutField): Candidate {
  if (kind === 'goal') return { x: 10, y: 8 };
  if (kind === 'recordType') return { x: 8, y: 5 };
  return { x: 5, y: 6 };
}

function guideLabelMetrics(guide: WhiteboardSemanticLayoutGuide): { width: number; height: number } {
  if (guide.kind === 'goal') return { width: estimateWhiteboardPresentationLabelWidth(guide.label, 74, 220), height: 30 };
  if (guide.kind === 'time') return { width: estimateWhiteboardPresentationLabelWidth(guide.label, 70, 126), height: 24 };
  return { width: estimateWhiteboardPresentationLabelWidth(guide.label, 58, 150), height: 24 };
}

function nodeMetrics(level: WhiteboardSemanticZoomLevel, node: WhiteboardSemanticPresentationNodeInput): NodeMetrics {
  if (node.kind === 'annotation') return { width: ANNOTATION_DOT_SIZE_PX, height: ANNOTATION_DOT_SIZE_PX, mode: 'dot' };
  if (node.kind === 'group') {
    return { width: estimateWhiteboardPresentationLabelWidth(node.label, 72, GROUP_MAX_WIDTH_PX), height: GROUP_HEIGHT_PX, mode: 'label' };
  }
  if (level === 'overview') return { width: DOT_SIZE_PX, height: DOT_SIZE_PX, mode: 'dot' };
  return {
    width: estimateWhiteboardPresentationLabelWidth(node.label, COMPACT_ITEM_MIN_WIDTH_PX, COMPACT_ITEM_MAX_WIDTH_PX),
    height: COMPACT_ITEM_HEIGHT_PX,
    mode: 'label',
  };
}

function toPlacement(
  node: WhiteboardSemanticPresentationNodeInput,
  metrics: NodeMetrics,
  offset: Candidate,
  zoom: number,
): WhiteboardSemanticPresentationPlacement {
  return {
    id: node.id,
    kind: node.kind,
    mode: metrics.mode,
    worldAnchor: node.worldAnchor,
    worldPoint: { x: node.worldAnchor.x + offset.x / zoom, y: node.worldAnchor.y + offset.y / zoom },
    screenOffsetX: offset.x,
    screenOffsetY: offset.y,
    widthPx: metrics.width,
    heightPx: metrics.height,
  };
}

export function buildWhiteboardSemanticPresentationModel(input: {
  level: WhiteboardSemanticZoomLevel;
  zoom: number;
  nodes: readonly WhiteboardSemanticPresentationNodeInput[];
  guides?: readonly WhiteboardSemanticLayoutGuide[];
}): WhiteboardSemanticPresentationModel {
  const zoom = finiteZoom(input.zoom);
  const items = new Map<string, WhiteboardSemanticPresentationPlacement>();
  const groups = new Map<string, WhiteboardSemanticPresentationPlacement>();
  const annotations = new Map<string, WhiteboardSemanticPresentationPlacement>();
  const guides = new Map<string, WhiteboardSemanticGuidePresentation>();
  if (input.level === 'detail') return { level: input.level, zoom, items, groups, annotations, guides };

  const occupied: ScreenRect[] = [];

  // Structural labels get first claim on screen space; lower-priority axes degrade to a dot before overlapping.
  [...(input.guides ?? [])]
    .sort((a, b) => guidePriority(b.kind) - guidePriority(a.kind) || a.y - b.y || a.x - b.x || a.id.localeCompare(b.id))
    .forEach((guide) => {
      const base = guidePreferredOffset(guide.kind);
      const anchorX = guide.x * zoom + base.x;
      const anchorY = guide.y * zoom + base.y;
      const metrics = guideLabelMetrics(guide);
      const labelOffset = placeTopLeft(anchorX, anchorY, metrics.width, metrics.height, occupied, guide.kind === 'goal' ? 2 : 1);
      if (labelOffset) {
        guides.set(guide.id, {
          id: guide.id,
          mode: 'label',
          offsetScreenX: base.x + labelOffset.x,
          offsetScreenY: base.y + labelOffset.y,
          widthPx: metrics.width,
          heightPx: metrics.height,
        });
        return;
      }
      const dotOffset = forcePlaceTopLeft(anchorX, anchorY, DOT_SIZE_PX, DOT_SIZE_PX, occupied);
      guides.set(guide.id, {
        id: guide.id,
        mode: 'dot',
        offsetScreenX: base.x + dotOffset.x,
        offsetScreenY: base.y + dotOffset.y,
        widthPx: DOT_SIZE_PX,
        heightPx: DOT_SIZE_PX,
      });
    });

  // Keep selected/find/connection nodes stable and readable by placing them before ordinary nodes.
  const sortedNodes = [...input.nodes].sort((a, b) => {
    if (Boolean(a.emphasized) !== Boolean(b.emphasized)) return a.emphasized ? -1 : 1;
    const kindPriority = (kind: WhiteboardPresentationNodeKind) => kind === 'group' ? 3 : kind === 'item' ? 2 : 1;
    return kindPriority(b.kind) - kindPriority(a.kind)
      || a.worldAnchor.y - b.worldAnchor.y
      || a.worldAnchor.x - b.worldAnchor.x
      || a.id.localeCompare(b.id);
  });

  sortedNodes.forEach((node) => {
    let metrics = nodeMetrics(input.level, node);
    const anchorX = node.worldAnchor.x * zoom;
    const anchorY = node.worldAnchor.y * zoom;
    let offset = placeCentered(anchorX, anchorY, metrics.width, metrics.height, occupied, metrics.mode === 'label' ? 2 : 4);
    if (!offset && metrics.mode === 'label') {
      metrics = { width: DOT_SIZE_PX, height: DOT_SIZE_PX, mode: 'dot' };
      offset = forcePlaceCentered(anchorX, anchorY, metrics.width, metrics.height, occupied);
    } else if (!offset) {
      offset = forcePlaceCentered(anchorX, anchorY, metrics.width, metrics.height, occupied);
    }
    const placement = toPlacement(node, metrics, offset, zoom);
    if (node.kind === 'item') items.set(node.id, placement);
    else if (node.kind === 'group') groups.set(node.id, placement);
    else annotations.set(node.id, placement);
  });

  return { level: input.level, zoom, items, groups, annotations, guides };
}
