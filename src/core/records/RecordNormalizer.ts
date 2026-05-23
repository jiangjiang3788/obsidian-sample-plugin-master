// src/core/records/RecordNormalizer.ts
import type { Item } from '@/core/types/schema';
import { applyExplicitThemeViewFields, normalizeExplicitTheme } from '@/core/theme/themeSemantics';
import { normalizeItemDates } from '@/core/utils/normalize';
import { parseRecurrence } from '@/core/utils/mark';
import type { RecordNormalizeContext } from './RecordEntity';

function unique(values: Array<string | undefined | null>): string[] {
  return Array.from(new Set(values.map(value => String(value ?? '').trim()).filter(Boolean)));
}

function lineFromItemId(id: string): number | undefined {
  const hashIdx = String(id || '').lastIndexOf('#');
  if (hashIdx < 0) return undefined;
  const parsed = Number(String(id).slice(hashIdx + 1));
  return Number.isFinite(parsed) ? parsed : undefined;
}

function normalizeSearchText(value: unknown): string {
  return String(value ?? '').toLowerCase();
}

/**
 * 为视图/筛选/搜索补齐运行时派生字段。
 *
 * 注意：这里明确只从显式 theme 派生 themePath/rootTheme/leafTheme，header 永远只表示章节位置。
 */
export function normalizeRecordItem(item: Item, context: RecordNormalizeContext): Item {
  const line = context.line ?? lineFromItemId(item.id);

  item.created = context.created;
  item.modified = context.modified;
  item.folder = item.folder || context.parentFolder;
  item.filename = context.fileName;
  item.fileName = context.fileName;
  item.file = {
    path: context.filePath,
    line,
    basename: context.fileName,
    folder: context.parentFolder,
  };

  if (context.header) {
    item.header = context.header;
  }

  item.tags = unique([...(context.sectionTags || []), ...(item.tags || [])]);

  // 主题只允许来自显式元数据。normalizeExplicitTheme 只做清洗/匹配，不会读取 header。
  item.theme = normalizeExplicitTheme((item as any).theme, context.themeMatcher);
  applyExplicitThemeViewFields(item as any);

  if (!item.extra) item.extra = {};
  if (!item.recurrence) item.recurrence = 'none';
  if (!item.categoryKey) item.categoryKey = item.type === 'task' ? '未完成任务' : context.parentFolder;

  normalizeItemDates(item);

  if (item.type === 'task') {
    (item as any).recurrenceInfo = parseRecurrence(item.content) || undefined;
  }

  (item as any).titleLower = normalizeSearchText(item.title);
  (item as any).contentLower = normalizeSearchText(item.content);
  (item as any).tagsLower = (item.tags || []).map(tag => normalizeSearchText(tag));

  return item;
}

export function normalizeRecordItems(items: Item[], context: RecordNormalizeContext): Item[] {
  return items.map(item => normalizeRecordItem(item, context));
}
