// src/core/fields/FieldValueResolver.ts
import { readExplicitThemeParts } from '@/core/theme/themeSemantics';
import type { Item } from '@/core/types/schema';
import { getCanonicalFieldKey, getFieldDefinition } from './FieldRegistry';
import type { FieldSource } from './FieldTypes';
import { normalizeImageValue } from './imageSemantics';
import { parseTagList } from './tagSemantics';
import { splitHierarchyPath } from './pathSemantics';

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
  /** Whether this key is kept only for backwards compatibility. */
  legacy: boolean;
}

export function normalizeFieldKey(field: string): string {
  return getCanonicalFieldKey(field);
}

function readFileField(item: Item, field: string): unknown {
  const file = (item as any).file || {};
  const key = field.slice('file.'.length);

  if (key === 'name' || key === 'basename') {
    return file.basename ?? item.fileName ?? item.filename;
  }
  if (key === 'folder') {
    return file.folder ?? item.folder;
  }
  return file[key];
}

function readCategoryPath(item: Item): string | undefined {
  return splitHierarchyPath((item as any).categoryPath ?? item.categoryKey).path;
}

function readRootCategory(item: Item): string | undefined {
  return splitHierarchyPath((item as any).categoryPath ?? item.categoryKey).root;
}

function readLeafCategory(item: Item): string | undefined {
  return splitHierarchyPath((item as any).categoryPath ?? item.categoryKey).leaf;
}

function readImageField(item: Item): unknown {
  return normalizeImageValue((item as any).image ?? item.pintu ?? item.extra?.['图片'] ?? item.extra?.['image'] ?? item.extra?.['评图'] ?? item.extra?.['pintu']);
}

function readCanonicalField(item: Item, canonicalField: string): unknown {
  if (canonicalField.startsWith('extra.')) {
    return item.extra?.[canonicalField.slice('extra.'.length)];
  }

  if (canonicalField.startsWith('file.')) {
    return readFileField(item, canonicalField);
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

  // Theme view fields are derived from explicit theme data only.
  // header/heading is intentionally excluded from this resolver.
  if (canonicalField === 'themePath') {
    return readExplicitThemeParts(item as any).themePath ?? undefined;
  }
  if (canonicalField === 'rootTheme') {
    return readExplicitThemeParts(item as any).rootTheme ?? undefined;
  }
  if (canonicalField === 'leafTheme') {
    return readExplicitThemeParts(item as any).leafTheme ?? undefined;
  }

  if (canonicalField === 'tags') {
    return parseTagList(item.tags || []);
  }

  if (canonicalField === 'goalPaths') {
    return parseTagList((item as any).goalPaths || []);
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
  if (canonicalField === 'pintu') {
    return item.pintu;
  }

  return (item as any)[canonicalField];
}

export function resolveFieldValue(item: Item, field: string): FieldValueResolution {
  const canonicalField = normalizeFieldKey(field);
  const def = getFieldDefinition(canonicalField);
  const value = readCanonicalField(item, canonicalField);
  const source = def?.source || 'unknown';

  return {
    requestedField: field,
    field: canonicalField,
    value,
    source,
    derived: source === 'derived',
    legacy: source === 'legacy' || !!def?.deprecated,
  };
}

/** Compatibility helper for existing code paths. */
export function readFieldValue(item: Item, field: string): unknown {
  return resolveFieldValue(item, field).value;
}
