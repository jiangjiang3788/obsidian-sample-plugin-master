import type { FileStatPort } from '@core/ports/FileStatPort';
import type { CacheV1 } from '@/core/types/cache';
import type { CachedFileEntry } from './DataStoreCache';

export interface WarmStartPlan {
  seen: Set<string>;
  unchangedEntries: Array<{ path: string; cached: CachedFileEntry }>;
  changedFiles: string[];
}

export async function buildWarmStartPlan(
  paths: string[],
  cache: CacheV1,
  fileStat: FileStatPort
): Promise<WarmStartPlan> {
  const seen = new Set<string>();
  const unchangedEntries: Array<{ path: string; cached: CachedFileEntry }> = [];
  const changedFiles: string[] = [];

  for (const path of paths) {
    seen.add(path);
    const st = await fileStat.stat(path);
    if (!st) {
      continue;
    }

    const cached = cache.files[path];
    if (cached && cached.mtime === st.mtime && cached.size === st.size) {
      unchangedEntries.push({ path, cached });
    } else {
      changedFiles.push(path);
    }
  }

  return { seen, unchangedEntries, changedFiles };
}
