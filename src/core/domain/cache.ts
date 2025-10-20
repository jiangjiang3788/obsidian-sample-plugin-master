// src/core/domain/cache.ts

import type { Item } from './schema';

/**
 * Cache schema v1
 *  - 轻量字段、按文件分片
 */
export interface CachedItem {
  id: string;
  filePath: string;
  filename?: string;

  // 热路径字段（预处理）
  titleLower?: string;
  contentLower?: string;
  tagsLower?: string[];
  themePathNormalized?: string;

  // 时间与分类
  dateMs?: number;
  categoryKey: string;

  // 基本冗余
  created: number;
  modified: number;
}

export interface CacheV1 {
  schemaVersion: 1;
  files: Record<
    string,
    {
      mtime: number;
      size: number;
      items: CachedItem[];
    }
  >;
  indexes?: {
    byDateSorted?: Array<[number, string]>; // [dateMs, id]
    byTag?: Record<string, string[]>; // tagLower -> ids
    byTheme?: Record<string, string[]>; // themePathNormalized -> ids
  };
}

export const CURRENT_CACHE_SCHEMA_VERSION = 1;

// 将运行时 Item 映射为 CachedItem（仅保存热字段）
export function toCachedItem(it: Item): CachedItem {
  return {
    id: it.id,
    filePath: it.file?.path || '',
    filename: it.filename ?? it.fileName,
    titleLower: it.title?.toLowerCase(),
    contentLower: it.content?.toLowerCase(),
    tagsLower: (it.tags || []).map(t => t.toLowerCase()),
    themePathNormalized: it.theme,
    dateMs: it.dateMs ?? it.startMs ?? it.endMs,
    categoryKey: it.categoryKey,
    created: it.created,
    modified: it.modified,
  };
}

// 将缓存的 CachedItem 恢复为最小可用的 Item（原文内容仍需懒加载时再读取）
export function fromCachedItem(c: CachedItem): Item {
  return {
    id: c.id,
    title: '', // 恢复后可按需懒加载原文
    content: '',
    type: 'task', // 具体类型需在解析时写入，这里保守给默认值；下游通常不会依赖该字段筛选
    tags: c.tagsLower || [],
    theme: c.themePathNormalized,
    categoryKey: c.categoryKey,
    recurrence: 'none',
    created: c.created,
    modified: c.modified,
    dateMs: c.dateMs,
    filename: c.filename,
    file: { path: c.filePath },
    extra: {},
  } as unknown as Item;
}
