import type { RecordViewItem } from '@core/types/public';
import { getRecordTypePresentationOrder } from '@core/recordTypes/public';
import type { WhiteboardItem, WhiteboardPosition } from '@core/whiteboard/public';
import { WHITEBOARD_CARD_HEIGHT_ESTIMATE_PX, WHITEBOARD_CARD_WIDTH_PX } from './WhiteboardDragModel';
import { getWhiteboardRecordTypeLabel } from './WhiteboardRecordPresentation';

export type WhiteboardLayoutField = 'goal' | 'recordType' | 'time';
export type WhiteboardTimeBucket = 'month';
export interface WhiteboardLayoutAxisSpec { field: WhiteboardLayoutField; order: 'asc' | 'canonical'; bucket?: WhiteboardTimeBucket; }
export interface WhiteboardLayoutSpec {
  id: string;
  groupBy: WhiteboardLayoutField;
  x: WhiteboardLayoutAxisSpec;
  y: WhiteboardLayoutAxisSpec;
  cellLayout: 'grid';
}
export const GOAL_TYPE_TIME_LAYOUT_SPEC: WhiteboardLayoutSpec = {
  id: 'goal-type-time', groupBy: 'goal', x: { field: 'recordType', order: 'canonical' }, y: { field: 'time', order: 'asc', bucket: 'month' }, cellLayout: 'grid',
};

export interface WhiteboardSemanticLayoutGuide {
  id: string; kind: WhiteboardLayoutField; label: string; x: number; y: number; width: number; height: number; itemIds: string[];
}
export interface WhiteboardSemanticLayoutResult {
  spec: WhiteboardLayoutSpec;
  moves: Array<{ itemId: string; position: WhiteboardPosition }>;
  guides: WhiteboardSemanticLayoutGuide[];
  width: number;
  height: number;
}

interface FieldValue { key: string; label: string; sort: number | string; }
interface LayoutFact { item: WhiteboardItem; record: RecordViewItem | null; values: Record<WhiteboardLayoutField, FieldValue>; }

const GOAL_HEADER_H = 52;
const X_HEADER_H = 38;
const Y_LABEL_W = 112;
const CELL_COLS = 2;
const CELL_GAP_X = 22;
const CELL_GAP_Y = 24;
const CELL_PAD = 18;
const CELL_W = CELL_PAD * 2 + CELL_COLS * WHITEBOARD_CARD_WIDTH_PX + (CELL_COLS - 1) * CELL_GAP_X;
const GROUP_GAP_Y = 88;
const GROUP_PAD = 22;

function clean(value: unknown): string { return String(value ?? '').replace(/\s+/g, ' ').trim(); }
function goalValue(record: RecordViewItem | null): FieldValue {
  const label = clean(record?.goalPath) || clean(record?.rootGoal) || clean(record?.leafGoal) || '未归属目标';
  return { key: label, label, sort: label };
}
function typeValue(record: RecordViewItem | null): FieldValue {
  if (!record) return { key: 'missing', label: '原记录不可用', sort: Number.MAX_SAFE_INTEGER };
  const coreBlock = clean(record.coreBlock); const label = getWhiteboardRecordTypeLabel(record);
  return { key: coreBlock || label, label, sort: getRecordTypePresentationOrder(record.coreBlock) };
}
function timeMs(record: RecordViewItem | null): number | null {
  if (!record) return null;
  for (const value of [record.dateMs, record.date, record.startMs, record.startISO, record.createdAt, record.created]) {
    if (typeof value === 'number' && Number.isFinite(value) && value > 0) return value;
    const parsed = typeof value === 'string' && value ? Date.parse(value) : NaN; if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}
function timeValue(record: RecordViewItem | null, _bucket: WhiteboardTimeBucket = 'month'): FieldValue {
  const ms = timeMs(record); if (ms == null) return { key: 'no-time', label: '无时间', sort: Number.MAX_SAFE_INTEGER };
  const date = new Date(ms); const year = date.getUTCFullYear(); const month = date.getUTCMonth(); const label = `${year}-${String(month + 1).padStart(2, '0')}`;
  return { key: label, label, sort: Date.UTC(year, month, 1) };
}
function fieldValue(record: RecordViewItem | null, field: WhiteboardLayoutField, bucket?: WhiteboardTimeBucket): FieldValue {
  if (field === 'goal') return goalValue(record);
  if (field === 'recordType') return typeValue(record);
  return timeValue(record, bucket);
}
function compareValue(a: FieldValue, b: FieldValue, order: WhiteboardLayoutAxisSpec['order']): number {
  if (typeof a.sort === 'number' && typeof b.sort === 'number' && a.sort !== b.sort) return a.sort - b.sort;
  if (order === 'canonical' && typeof a.sort === 'number' && typeof b.sort !== 'number') return -1;
  if (order === 'canonical' && typeof b.sort === 'number' && typeof a.sort !== 'number') return 1;
  return a.label.localeCompare(b.label, 'zh');
}
function uniqueValues(facts: readonly LayoutFact[], axis: WhiteboardLayoutAxisSpec): FieldValue[] {
  const byKey = new Map<string, FieldValue>(); facts.forEach((fact) => { const value = fact.values[axis.field]; if (!byKey.has(value.key)) byKey.set(value.key, value); });
  return [...byKey.values()].sort((a, b) => compareValue(a, b, axis.order));
}
function groupValues(facts: readonly LayoutFact[], field: WhiteboardLayoutField): FieldValue[] {
  return uniqueValues(facts, { field, order: 'asc' });
}
function rowHeight(maxCellCount: number): number {
  const rows = Math.max(1, Math.ceil(maxCellCount / CELL_COLS));
  return CELL_PAD * 2 + rows * WHITEBOARD_CARD_HEIGHT_ESTIMATE_PX + Math.max(0, rows - 1) * CELL_GAP_Y;
}

export function arrangeWhiteboardItemsBySpec(
  items: readonly WhiteboardItem[], recordsById: ReadonlyMap<string, RecordViewItem>, spec: WhiteboardLayoutSpec = GOAL_TYPE_TIME_LAYOUT_SPEC, origin?: { x: number; y: number },
): WhiteboardSemanticLayoutResult {
  if (items.length === 0) return { spec, moves: [], guides: [], width: 0, height: 0 };
  const startX = origin?.x ?? Math.min(...items.map((item) => item.x)); const startY = origin?.y ?? Math.min(...items.map((item) => item.y));
  const facts: LayoutFact[] = items.map((item) => { const record = recordsById.get(item.recordId) ?? null; return { item, record, values: {
    goal: fieldValue(record, 'goal'), recordType: fieldValue(record, 'recordType'), time: fieldValue(record, 'time', spec.y.bucket ?? spec.x.bucket),
  } }; });
  const groups = groupValues(facts, spec.groupBy); const moves: WhiteboardSemanticLayoutResult['moves'] = []; const guides: WhiteboardSemanticLayoutGuide[] = [];
  let y = startY; let maxWidth = 0;
  groups.forEach((group, groupIndex) => {
    const groupFacts = facts.filter((fact) => fact.values[spec.groupBy].key === group.key); const xValues = uniqueValues(groupFacts, spec.x); const yValues = uniqueValues(groupFacts, spec.y);
    const blockX = startX; const contentX = blockX + Y_LABEL_W; const blockW = Y_LABEL_W + xValues.length * CELL_W + GROUP_PAD;
    const rowMetrics = yValues.map((yValue) => ({ yValue, height: rowHeight(Math.max(0, ...xValues.map((xValue) => groupFacts.filter((fact) => fact.values[spec.x.field].key === xValue.key && fact.values[spec.y.field].key === yValue.key).length))) }));
    const blockH = GOAL_HEADER_H + X_HEADER_H + rowMetrics.reduce((sum, row) => sum + row.height, 0) + GROUP_PAD;
    guides.push({ id: `group:${groupIndex}`, kind: spec.groupBy, label: group.label, x: blockX, y, width: blockW, height: blockH, itemIds: groupFacts.map((fact) => fact.item.id) });
    xValues.forEach((value, xIndex) => guides.push({ id: `group:${groupIndex}:x:${xIndex}`, kind: spec.x.field, label: value.label, x: contentX + xIndex * CELL_W, y: y + GOAL_HEADER_H, width: CELL_W, height: X_HEADER_H, itemIds: groupFacts.filter((fact) => fact.values[spec.x.field].key === value.key).map((fact) => fact.item.id) }));
    let rowY = y + GOAL_HEADER_H + X_HEADER_H;
    rowMetrics.forEach(({ yValue, height }, yIndex) => {
      const rowFacts = groupFacts.filter((fact) => fact.values[spec.y.field].key === yValue.key);
      guides.push({ id: `group:${groupIndex}:y:${yIndex}`, kind: spec.y.field, label: yValue.label, x: blockX, y: rowY, width: Y_LABEL_W, height, itemIds: rowFacts.map((fact) => fact.item.id) });
      xValues.forEach((xValue, xIndex) => {
        const cell = rowFacts.filter((fact) => fact.values[spec.x.field].key === xValue.key).sort((a, b) => a.item.y - b.item.y || a.item.x - b.item.x || a.item.id.localeCompare(b.item.id));
        cell.forEach((fact, index) => moves.push({ itemId: fact.item.id, position: {
          x: contentX + xIndex * CELL_W + CELL_PAD + (index % CELL_COLS) * (WHITEBOARD_CARD_WIDTH_PX + CELL_GAP_X),
          y: rowY + CELL_PAD + Math.floor(index / CELL_COLS) * (WHITEBOARD_CARD_HEIGHT_ESTIMATE_PX + CELL_GAP_Y), zIndex: fact.item.zIndex,
        } }));
      });
      rowY += height;
    });
    maxWidth = Math.max(maxWidth, blockW); y += blockH + GROUP_GAP_Y;
  });
  return { spec, moves, guides, width: maxWidth, height: Math.max(0, y - startY - GROUP_GAP_Y) };
}
