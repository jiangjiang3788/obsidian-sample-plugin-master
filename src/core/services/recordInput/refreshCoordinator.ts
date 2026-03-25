import type { RecordSubmitResult } from '@/core/types/recordInput';
import type { Item } from '@/core/types/schema';
import { DataStore } from '@core/services/DataStore';

export interface RecordRefreshPlan {
  scanPaths: string[];
  notify: boolean;
}

function uniquePaths(paths: string[]): string[] {
  return Array.from(new Set(paths.filter((path) => String(path || '').trim())));
}

export function normalizeRecordRefreshPlan(plan: RecordRefreshPlan): RecordRefreshPlan {
  return {
    scanPaths: uniquePaths(plan.scanPaths),
    notify: !!plan.notify,
  };
}

export async function applyRecordRefreshPlan(
  dataStore: DataStore,
  plan: RecordRefreshPlan,
): Promise<Map<string, Item[]>> {
  const scannedByPath = new Map<string, Item[]>();
  const normalizedPlan = normalizeRecordRefreshPlan(plan);

  for (const path of normalizedPlan.scanPaths) {
    const scanned = await dataStore.scanFileByPath(path);
    scannedByPath.set(path, scanned);
  }

  if (normalizedPlan.notify) {
    dataStore.notifyChange();
  }

  return scannedByPath;
}

export async function finalizeRecordSubmitResult<T extends Pick<RecordSubmitResult, 'refresh'>>(
  dataStore: DataStore,
  result: T,
): Promise<T> {
  result.refresh = normalizeRecordRefreshPlan(result.refresh);
  await applyRecordRefreshPlan(dataStore, result.refresh);
  return result;
}
