// src/core/records/RecordNormalizer.ts
import type { Item } from '@/core/types/schema';
import { applyExplicitThemeViewFields, normalizeExplicitTheme } from '@/core/theme/themeSemantics';
import { normalizeItemDates } from '@/core/utils/normalize';
import { parseRecurrence } from '@/core/records/task/mark';
import { extractTaskEditableText } from '@/core/utils/text';
import type { RecordNormalizeContext } from './RecordEntity';
import { splitGoalPath } from '@/core/goal';

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

type SearchIndexedItem = Item & {
  titleLower?: string;
  contentLower?: string;
  fullDataLower?: string;
  tagsLower?: string[];
  goalPathsLower?: string[];
  goalIdsLower?: string[];
  goalPathLower?: string;
  rootGoalLower?: string;
  leafGoalLower?: string;
};

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
  item.goalIds = unique([item.goalId, ...(item.goalIds || [])]);
  item.goalPaths = unique([item.goalPath, ...(item.goalPaths || [])]);
  item.goalPath = item.goalPaths[0] || item.goalPath;
  const goalParts = splitGoalPath(item.goalPath || null);
  item.goalPath = goalParts.goalPath || item.goalPath;
  item.rootGoal = goalParts.rootGoal || item.rootGoal;
  item.leafGoal = goalParts.leafGoal || item.leafGoal;

  // 主题只允许来自显式元数据。normalizeExplicitTheme 只做清洗/匹配，不会读取 header。
  item.theme = normalizeExplicitTheme(item.theme, context.themeMatcher);
  applyExplicitThemeViewFields(item);

  if (!item.extra) item.extra = {};
  if (!item.recurrence) item.recurrence = 'none';
  if (!item.categoryKey) item.categoryKey = item.type === 'task' ? '未完成任务' : context.parentFolder;

  normalizeItemDates(item);

  if (item.type === 'task') {
    const taskRawSource = item.rawSource || item.content || '';
    const extractedEditableText = extractTaskEditableText(taskRawSource).editableText;
    const contentLooksRawTaskLine = /^\s*[-*+]\s*\[[ xX-]\]/.test(String(item.content || ''));

    // 兼容旧缓存 / 旧 parser：任务 content 必须统一为干净正文，rawSource/fullData 才保留完整 Markdown。
    if (extractedEditableText && (!item.content || contentLooksRawTaskLine || item.content === taskRawSource)) {
      item.content = extractedEditableText;
    }
    if (!item.editableText && extractedEditableText) {
      item.editableText = extractedEditableText;
    }
    if ((!item.title || item.title === taskRawSource) && (item.editableText || item.content)) {
      item.title = item.editableText || item.content;
    }

    // recurrence 必须从 rawSource 读取；content 现在是干净正文，可能已经没有 🔁 元数据。
    item.recurrenceInfo = parseRecurrence(taskRawSource) || undefined;
  }

  // 完整数据是只读派生字段，运行时补齐可以让导出、JSON 调试和旧代码路径更稳定。
  item.fullData = item.rawSource || item.fullData || item.content || '';

  const indexedItem = item as SearchIndexedItem;
  indexedItem.titleLower = normalizeSearchText(item.title);
  indexedItem.contentLower = normalizeSearchText(item.content);
  indexedItem.fullDataLower = normalizeSearchText(item.fullData);
  indexedItem.tagsLower = (item.tags || []).map(tag => normalizeSearchText(tag));
  indexedItem.goalPathsLower = (item.goalPaths || []).map(goal => normalizeSearchText(goal));
  indexedItem.goalIdsLower = (item.goalIds || []).map(goalId => normalizeSearchText(goalId));
  indexedItem.goalPathLower = normalizeSearchText(item.goalPath);
  indexedItem.rootGoalLower = normalizeSearchText(item.rootGoal);
  indexedItem.leafGoalLower = normalizeSearchText(item.leafGoal);

  return item;
}

export function normalizeRecordItems(items: Item[], context: RecordNormalizeContext): Item[] {
  return items.map(item => normalizeRecordItem(item, context));
}
