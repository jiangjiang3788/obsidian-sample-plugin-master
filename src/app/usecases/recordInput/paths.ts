import type { DataStore } from '@core/services/public';
import type { Item } from '@core/types/public';
import type { RecordSubmitResult } from '@core/recordInput/public';
import { getItemLineNumber } from './locator';

export function uniqueNonEmptyPaths(paths: Array<string | null | undefined>): string[] {
  return Array.from(new Set(paths.map((path) => String(path || '').trim()).filter(Boolean)));
}

export function buildRefreshPlan(
  paths: Array<string | null | undefined>,
  notify = true,
): RecordSubmitResult['refresh'] {
  return {
    scanPaths: uniqueNonEmptyPaths(paths),
    notify,
  };
}

export function getBeforeMaxLine(items: Item[]): number {
  return items.reduce((max, item) => Math.max(max, getItemLineNumber(item)), 0);
}

export function getFileItemsByPath(dataStore: DataStore, path: string): Item[] {
  return dataStore.queryItems().filter((item) => (item.source?.path || item.file?.path || '') === path);
}

export function tryResolveItemPath(dataStore: DataStore, itemId: string): string | null {
  return dataStore.getRecordLocation(itemId)?.path || null;
}
