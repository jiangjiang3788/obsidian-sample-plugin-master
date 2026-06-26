import type { DataStore, Item, RecordSubmitResult } from '@core/public';
import { getItemLineNumber, parseItemLocator } from './locator';

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
  return dataStore.queryItems().filter((item) => {
    if (item.file?.path) return item.file.path === path;
    try {
      return parseItemLocator(item.id).path === path;
    } catch {
      return false;
    }
  });
}

export function tryParseItemPath(itemId: string): string | null {
  try {
    return parseItemLocator(itemId).path;
  } catch {
    return null;
  }
}
