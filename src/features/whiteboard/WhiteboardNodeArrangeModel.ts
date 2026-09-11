import type { WhiteboardGroup, WhiteboardGroupPosition, WhiteboardItem, WhiteboardPosition } from '@core/whiteboard/public';
import { WHITEBOARD_CARD_HEIGHT_ESTIMATE_PX, WHITEBOARD_CARD_WIDTH_PX } from './WhiteboardDragModel';
import { getWhiteboardWorkbenchFrame } from './WhiteboardWorkbenchModel';

export type WhiteboardNodeArrangeMode = 'grid' | 'align-left' | 'align-top' | 'distribute-horizontal' | 'distribute-vertical';
export interface WhiteboardNodeArrangeResult {
  itemMoves: Array<{ itemId: string; position: WhiteboardPosition }>;
  groupMoves: Array<{ groupId: string; position: WhiteboardGroupPosition }>;
}

interface ArrangeNode {
  kind: 'item' | 'group'; id: string; x: number; y: number; width: number; height: number; zIndex?: number;
}

const GAP_X = 72;
const GAP_Y = 64;
const bySpatialOrder = (a: ArrangeNode, b: ArrangeNode) => a.y - b.y || a.x - b.x || a.kind.localeCompare(b.kind) || a.id.localeCompare(b.id);

function buildNodes(targetItems: readonly WhiteboardItem[], targetGroups: readonly WhiteboardGroup[], allItems: readonly WhiteboardItem[], allGroups: readonly WhiteboardGroup[]): ArrangeNode[] {
  const itemNodes = targetItems.map((item): ArrangeNode => ({ kind: 'item', id: item.id, x: item.x, y: item.y, width: WHITEBOARD_CARD_WIDTH_PX, height: WHITEBOARD_CARD_HEIGHT_ESTIMATE_PX, zIndex: item.zIndex }));
  const groupNodes = targetGroups.map((group): ArrangeNode => { const frame = getWhiteboardWorkbenchFrame(group, allItems, allGroups); return { kind: 'group', id: group.id, x: group.x, y: group.y, width: frame.width, height: frame.height }; });
  return [...itemNodes, ...groupNodes];
}

function targetPositions(nodes: readonly ArrangeNode[], mode: WhiteboardNodeArrangeMode): Map<string, { x: number; y: number }> {
  const positions = new Map<string, { x: number; y: number }>();
  if (nodes.length < 2) return positions;
  if (mode === 'align-left') { const x = Math.min(...nodes.map((node) => node.x)); nodes.forEach((node) => positions.set(`${node.kind}:${node.id}`, { x, y: node.y })); return positions; }
  if (mode === 'align-top') { const y = Math.min(...nodes.map((node) => node.y)); nodes.forEach((node) => positions.set(`${node.kind}:${node.id}`, { x: node.x, y })); return positions; }
  if (mode === 'distribute-horizontal' || mode === 'distribute-vertical') {
    const horizontal = mode === 'distribute-horizontal'; const sorted = [...nodes].sort(horizontal ? (a, b) => a.x - b.x || bySpatialOrder(a, b) : (a, b) => a.y - b.y || bySpatialOrder(a, b));
    const first = horizontal ? sorted[0].x : sorted[0].y; const last = horizontal ? sorted.at(-1)!.x : sorted.at(-1)!.y; const step = (last - first) / (sorted.length - 1);
    sorted.forEach((node, index) => positions.set(`${node.kind}:${node.id}`, horizontal ? { x: first + step * index, y: node.y } : { x: node.x, y: first + step * index }));
    return positions;
  }
  const sorted = [...nodes].sort(bySpatialOrder); const columns = Math.max(1, Math.ceil(Math.sqrt(sorted.length))); const rows = Math.ceil(sorted.length / columns);
  const colWidths = Array.from({ length: columns }, () => 0); const rowHeights = Array.from({ length: rows }, () => 0);
  sorted.forEach((node, index) => { const col = index % columns; const row = Math.floor(index / columns); colWidths[col] = Math.max(colWidths[col], node.width); rowHeights[row] = Math.max(rowHeights[row], node.height); });
  const minX = Math.min(...sorted.map((node) => node.x)); const minY = Math.min(...sorted.map((node) => node.y)); const colX: number[] = []; const rowY: number[] = [];
  colWidths.reduce((x, width, index) => { colX[index] = x; return x + width + GAP_X; }, minX); rowHeights.reduce((y, height, index) => { rowY[index] = y; return y + height + GAP_Y; }, minY);
  sorted.forEach((node, index) => positions.set(`${node.kind}:${node.id}`, { x: colX[index % columns], y: rowY[Math.floor(index / columns)] }));
  return positions;
}

export function arrangeWhiteboardNodes(input: {
  targetItems: readonly WhiteboardItem[];
  targetGroups: readonly WhiteboardGroup[];
  allItems: readonly WhiteboardItem[];
  allGroups: readonly WhiteboardGroup[];
  mode: WhiteboardNodeArrangeMode;
}): WhiteboardNodeArrangeResult {
  const nodes = buildNodes(input.targetItems, input.targetGroups, input.allItems, input.allGroups); const positions = targetPositions(nodes, input.mode);
  const itemMoves: WhiteboardNodeArrangeResult['itemMoves'] = []; const groupMoves: WhiteboardNodeArrangeResult['groupMoves'] = [];
  nodes.forEach((node) => { const position = positions.get(`${node.kind}:${node.id}`); if (!position) return;
    if (node.kind === 'item') itemMoves.push({ itemId: node.id, position: { ...position, ...(node.zIndex === undefined ? {} : { zIndex: node.zIndex }) } });
    else groupMoves.push({ groupId: node.id, position });
  });
  return { itemMoves, groupMoves };
}
