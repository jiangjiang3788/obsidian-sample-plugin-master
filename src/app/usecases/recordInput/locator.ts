import type { Item } from '@core/types/public';

/** Storage location helper. Location is mutable metadata and never business identity. */
export function getItemLineNumber(item: Item): number {
  return item.source?.startLine ?? item.file?.line ?? 0;
}

/** Storage location helper. Stable Record ID must never be decoded into a path. */
export function getItemFilePath(item: Item): string | null {
  return item.source?.path ?? item.file?.path ?? null;
}
