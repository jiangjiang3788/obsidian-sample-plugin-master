// src/core/utils/heatmapVisual.ts
import type { RecordViewItem } from '@/core/records/RecordEntity';

export interface HeatmapRatingOptionLike {
  value?: unknown;
  label?: unknown;
}

function firstNonEmptyText(...values: unknown[]): string {
  for (const value of values) {
    if (Array.isArray(value)) {
      const nested = firstNonEmptyText(...value);
      if (nested) return nested;
      continue;
    }
    if (value && typeof value === 'object') {
      const objectValue = value as Record<string, unknown>;
      const nested = firstNonEmptyText(objectValue.value, objectValue.label, objectValue.src, objectValue.path, objectValue.title);
      if (nested) return nested;
      continue;
    }
    if (value === undefined || value === null) continue;
    const text = String(value).trim();
    if (text) return text;
  }
  return '';
}

function readExtra(item: RecordViewItem | undefined, key: string): unknown {
  return (item as any)?.extra?.[key];
}

export function buildHeatmapRatingMapping(options?: HeatmapRatingOptionLike[] | null): Map<string, string> {
  const mapping = new Map<string, string>();
  for (const option of options || []) {
    const value = firstNonEmptyText(option?.value, option);
    const label = firstNonEmptyText(option?.label, option?.value, option);
    if (!value && !label) continue;
    // 评分字段通常写 label，例如 `评分:: 1`；视觉字段通常写 value，例如 `图片:: ♨️`。
    // 两者都映射到视觉值，保证有无 `图片/评图` 字段时显示一致。
    if (label) mapping.set(label, value || label);
    if (value) mapping.set(value, value);
  }
  return mapping;
}

export function readHeatmapRatingText(item: RecordViewItem | undefined): string {
  if (!item) return '';
  return firstNonEmptyText(
    (item as any).rating,
    readExtra(item, '评分'),
    readExtra(item, 'rating')
  );
}

export function readHeatmapVisualText(item: RecordViewItem | undefined): string {
  if (!item) return '';
  return firstNonEmptyText(
    (item as any).pintu,
    (item as any).image,
    readExtra(item, '图片'),
    readExtra(item, '评图'),
    readExtra(item, 'pintu'),
    readExtra(item, 'image')
  );
}

export function getHeatmapItemVisualValue(item: RecordViewItem | undefined, ratingMapping?: Map<string, string>): string | null {
  if (!item) return null;
  const directVisual = readHeatmapVisualText(item);
  if (directVisual) return directVisual;

  const rating = readHeatmapRatingText(item);
  if (!rating) return null;
  return ratingMapping?.get(rating) || rating;
}

export function getLatestHeatmapVisualValue(items: RecordViewItem[] | undefined, ratingMapping?: Map<string, string>): string | null {
  if (!items || !items.length) return null;
  const latestItemWithValue = [...items].reverse().find((item) => !!getHeatmapItemVisualValue(item, ratingMapping));
  return getHeatmapItemVisualValue(latestItemWithValue, ratingMapping);
}
