import type { WhiteboardEdge, WhiteboardItem, WhiteboardPosition } from '@core/whiteboard/public';
import { WHITEBOARD_CARD_HEIGHT_ESTIMATE_PX, WHITEBOARD_CARD_WIDTH_PX } from './WhiteboardDragModel';

export type WhiteboardArrangeMode = 'grid' | 'graph' | 'align-left' | 'align-top' | 'distribute-horizontal' | 'distribute-vertical';
export interface WhiteboardArrangeMove { itemId: string; position: WhiteboardPosition; }
const GAP_X = 44; const GAP_Y = 38;
const bySpatialOrder = (a: WhiteboardItem, b: WhiteboardItem) => a.y - b.y || a.x - b.x || a.id.localeCompare(b.id);
const move = (item: WhiteboardItem, x: number, y: number): WhiteboardArrangeMove => ({ itemId: item.id, position: { x, y, zIndex: item.zIndex } });

function arrangeGrid(items: readonly WhiteboardItem[]): WhiteboardArrangeMove[] {
  const sorted = [...items].sort(bySpatialOrder); const columns = Math.max(1, Math.ceil(Math.sqrt(sorted.length)));
  const minX = Math.min(...sorted.map((item) => item.x)); const minY = Math.min(...sorted.map((item) => item.y));
  return sorted.map((item, index) => move(item, minX + (index % columns) * (WHITEBOARD_CARD_WIDTH_PX + GAP_X), minY + Math.floor(index / columns) * (WHITEBOARD_CARD_HEIGHT_ESTIMATE_PX + GAP_Y)));
}

function arrangeGraph(items: readonly WhiteboardItem[], edges: readonly WhiteboardEdge[]): WhiteboardArrangeMove[] {
  const ids = new Set(items.map((item) => item.id)); const incoming = new Map(items.map((item) => [item.id, 0])); const outgoing = new Map(items.map((item) => [item.id, [] as string[]]));
  edges.forEach((edge) => { if (!ids.has(edge.fromItemId) || !ids.has(edge.toItemId)) return; outgoing.get(edge.fromItemId)!.push(edge.toItemId); incoming.set(edge.toItemId, (incoming.get(edge.toItemId) ?? 0) + 1); });
  const depth = new Map<string, number>(); const queue = [...items].filter((item) => incoming.get(item.id) === 0).sort(bySpatialOrder); queue.forEach((item) => depth.set(item.id, 0));
  while (queue.length) { const current = queue.shift()!; const currentDepth = depth.get(current.id) ?? 0; outgoing.get(current.id)!.forEach((nextId) => { incoming.set(nextId, (incoming.get(nextId) ?? 1) - 1); depth.set(nextId, Math.max(depth.get(nextId) ?? 0, currentDepth + 1)); if (incoming.get(nextId) === 0) queue.push(items.find((item) => item.id === nextId)!); }); }
  const maxDepth = Math.max(0, ...depth.values()); [...items].filter((item) => !depth.has(item.id)).sort(bySpatialOrder).forEach((item, index) => depth.set(item.id, maxDepth + 1 + Math.floor(index / 4)));
  const minX = Math.min(...items.map((item) => item.x)); const minY = Math.min(...items.map((item) => item.y)); const lanes = new Map<number, WhiteboardItem[]>();
  items.forEach((item) => { const d = depth.get(item.id) ?? 0; const lane = lanes.get(d) ?? []; lane.push(item); lanes.set(d, lane); });
  return [...lanes.entries()].sort(([a], [b]) => a - b).flatMap(([d, lane]) => lane.sort(bySpatialOrder).map((item, row) => move(item, minX + d * (WHITEBOARD_CARD_WIDTH_PX + 84), minY + row * (WHITEBOARD_CARD_HEIGHT_ESTIMATE_PX + GAP_Y))));
}

export function arrangeWhiteboardItems(items: readonly WhiteboardItem[], mode: WhiteboardArrangeMode, edges: readonly WhiteboardEdge[] = []): WhiteboardArrangeMove[] {
  if (items.length < 2) return [];
  if (mode === 'grid') return arrangeGrid(items); if (mode === 'graph') return arrangeGraph(items, edges);
  if (mode === 'align-left') { const x = Math.min(...items.map((item) => item.x)); return items.map((item) => move(item, x, item.y)); }
  if (mode === 'align-top') { const y = Math.min(...items.map((item) => item.y)); return items.map((item) => move(item, item.x, y)); }
  const sorted = [...items].sort(mode === 'distribute-horizontal' ? (a, b) => a.x - b.x : (a, b) => a.y - b.y);
  if (mode === 'distribute-horizontal') { const first = sorted[0].x; const last = sorted[sorted.length - 1].x; const step = (last - first) / (sorted.length - 1); return sorted.map((item, index) => move(item, first + step * index, item.y)); }
  const first = sorted[0].y; const last = sorted[sorted.length - 1].y; const step = (last - first) / (sorted.length - 1); return sorted.map((item, index) => move(item, item.x, first + step * index));
}
