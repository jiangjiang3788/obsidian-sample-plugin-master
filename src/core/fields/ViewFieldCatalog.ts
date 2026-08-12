import type { RecordViewItem } from '@/core/records/RecordEntity';
import { readFieldValue } from './FieldValueResolver';
import { getAvailableFields } from './FieldRegistry';

export const CORE_FIELDS = [
  'id', 'schemaVersion', 'title', 'content', 'categoryKey', 'tags', 'goalId', 'goalIds', 'goalPath', 'goalPaths', 'coreBlock', 'status', 'cycleId',
  'icon', 'priority', 'expectedDurationMinutes', 'date', 'startTime', 'endTime', 'duration',
  'period', 'rating', 'image', 'folder', 'periodCount',
] as const;

export const SEMANTIC_FIELDS = [
  'baseCategory', 'leafCategory', 'rootGoal', 'leafGoal', 'themePath', 'rootTheme', 'leafTheme', 'cadence',
] as const;

export const FILE_FIELDS = [
  'file.path', 'file.basename', 'file.name', 'file.folder', 'header',
] as const;

export const LEGACY_FIELDS = ['theme', 'filename', 'fileName'] as const;

export const DEFAULT_FIELD_OPTIONS = [
  ...CORE_FIELDS,
  ...SEMANTIC_FIELDS,
  ...FILE_FIELDS,
] as const;

export type CoreField = (typeof CORE_FIELDS)[number];
export type SemanticField = (typeof SEMANTIC_FIELDS)[number];
export type FileField = (typeof FILE_FIELDS)[number];
export type LegacyField = (typeof LEGACY_FIELDS)[number];

export function getAllFields(items: RecordViewItem[]): string[] {
  return getAvailableFields(items).map((field) => field.key);
}

export function readField(item: RecordViewItem, field: string): any {
  return readFieldValue(item, field);
}
