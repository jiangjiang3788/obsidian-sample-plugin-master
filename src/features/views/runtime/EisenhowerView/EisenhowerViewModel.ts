import type { RecordViewItem } from '@core/types/public';
import { deriveEisenhowerQuadrant, type EisenhowerQuadrant } from '@core/records/public';

export interface EisenhowerColumn {
  quadrant: EisenhowerQuadrant;
  items: RecordViewItem[];
}

export const EISENHOWER_MAIN_QUADRANTS: EisenhowerQuadrant[] = ['q1', 'q2', 'q3', 'q4'];

export function buildEisenhowerColumns(items: RecordViewItem[]): Record<EisenhowerQuadrant, RecordViewItem[]> {
  const columns: Record<EisenhowerQuadrant, RecordViewItem[]> = {
    q1: [], q2: [], q3: [], q4: [], unclassified: [],
  };
  for (const item of items) {
    if (item.recordType !== 'task' || item.status !== 'open') continue;
    columns[deriveEisenhowerQuadrant(item)].push(item);
  }
  return columns;
}
