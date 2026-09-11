// src/core/fields/FieldValueResolver.ts
import type { RecordViewItem } from '@/core/records/RecordEntity';
import { getCanonicalFieldKey, getFieldDefinition } from './FieldRegistry';
import type { FieldSource } from './FieldTypes';
import { normalizeImageValue } from './imageSemantics';
import { parseTagList } from './tagSemantics';
import { splitHierarchyPath } from './pathSemantics';
import { getTaskCadence } from '@/core/records/task/taskCadence';
import { formatTaskRecurrence } from '@/core/records/task/taskRecurrence';
import { asUnknownRecord, readFirstString, readString, readStringArray, readUnknown } from '@/core/utils/unknownRecord';
import { getRecordPrimaryText } from './RecordPrimaryText';

export type FieldValueSource = FieldSource | 'unknown';

export interface FieldValueResolution {
  /** The originally requested key or label. */
  requestedField: string;
  /** Canonical key after alias normalization. */
  field: string;
  /** Raw value used by filters, sorting, grouping and views. */
  value: unknown;
  /** Where this field is primarily resolved from. */
  source: FieldValueSource;
  /** Whether the value is computed from another field. */
  derived: boolean;
}

export function normalizeFieldKey(field: string): string {
  return getCanonicalFieldKey(field);
}

function readFileField(item: RecordViewItem, field: string): unknown {
  const file = item.file;
  const fileRecord = asUnknownRecord(file);
  const key = field.slice('file.'.length);

  if (key === 'name' || key === 'basename') {
    return file?.basename ?? item.fileName ?? item.filename;
  }
  if (key === 'folder') {
    return file?.folder ?? item.folder;
  }
  return readUnknown(fileRecord, key);
}

function readCategoryPath(item: RecordViewItem): string | undefined {
  return splitHierarchyPath(readString(asUnknownRecord(item), 'categoryPath') ?? item.categoryKey).path;
}

function readRootCategory(item: RecordViewItem): string | undefined {
  return splitHierarchyPath(readString(asUnknownRecord(item), 'categoryPath') ?? item.categoryKey).root;
}

function readLeafCategory(item: RecordViewItem): string | undefined {
  return splitHierarchyPath(readString(asUnknownRecord(item), 'categoryPath') ?? item.categoryKey).leaf;
}

function readImageField(item: RecordViewItem): unknown {
  return normalizeImageValue(item.image ?? item.extra?.['图片'] ?? item.extra?.['image']);
}

function readCanonicalField(item: RecordViewItem, canonicalField: string): unknown {
  if (canonicalField.startsWith('extra.')) {
    return item.extra?.[canonicalField.slice('extra.'.length)];
  }

  if (canonicalField.startsWith('file.')) {
    return readFileField(item, canonicalField);
  }

  if (canonicalField === 'primaryText') return getRecordPrimaryText(item);

  if (canonicalField === 'goalPath') {
    return splitHierarchyPath(item.goalPath).path;
  }
  if (canonicalField === 'rootGoal') {
    return item.rootGoal || splitHierarchyPath(item.goalPath).root;
  }
  if (canonicalField === 'leafGoal') {
    return item.leafGoal || splitHierarchyPath(item.goalPath).leaf;
  }

  if (canonicalField === 'categoryKey') {
    return readCategoryPath(item);
  }
  if (canonicalField === 'baseCategory') {
    return readRootCategory(item);
  }
  if (canonicalField === 'leafCategory') {
    return readLeafCategory(item);
  }


  if (canonicalField === 'status') return item.status;
  if (canonicalField === 'cadence') return item.coreBlock === 'task' ? getTaskCadence(item) : undefined;
  if (canonicalField === 'recurrence') return formatTaskRecurrence(item.recurrenceInfo);

  if (canonicalField === 'period.id') {
    return readFirstString(asUnknownRecord(item), ['cycleId', 'periodId']);
  }
  if (canonicalField === 'period.label') {
    return readFirstString(asUnknownRecord(item), ['period', '周期']);
  }
  if (canonicalField === 'period.granularity') {
    return readFirstString(asUnknownRecord(item), ['periodGranularity', 'goalGranularity']);
  }

  if (canonicalField === 'tags') {
    return parseTagList(item.tags || []);
  }


  if (canonicalField === 'fullData') {
    return item.rawSource || item.fullData || item.content || '';
  }

  if (canonicalField === 'image') {
    return readImageField(item);
  }

  if (canonicalField === 'time') {
    return item.startTime;
  }
  if (canonicalField === 'filename' || canonicalField === 'fileName') {
    return item.file?.basename ?? item.fileName ?? item.filename;
  }
  return readUnknown(asUnknownRecord(item), canonicalField);
}

export function resolveFieldValue(item: RecordViewItem, field: string): FieldValueResolution {
  const canonicalField = normalizeFieldKey(field);
  const def = getFieldDefinition(canonicalField);
  let value = readCanonicalField(item, canonicalField);
  if (value === undefined) {
    const injectedFields = asUnknownRecord(readUnknown(asUnknownRecord(item), 'fields'));
    value = readUnknown(injectedFields, canonicalField);
    if (value === undefined && field !== canonicalField) value = readUnknown(injectedFields, field);
  }
  const source = def?.source || 'unknown';

  return {
    requestedField: field,
    field: canonicalField,
    value,
    source,
    derived: source === 'derived',
  };
}

/** Read a field through the canonical field resolver. */
export function readFieldValue(item: RecordViewItem, field: string): unknown {
  return resolveFieldValue(item, field).value;
}
