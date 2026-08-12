// src/core/records/RecordNormalizer.ts
import type { RecordEntity } from './RecordEntity';
import { toRecordViewItem } from './RecordEntity';
import { applyExplicitThemeViewFields, normalizeExplicitTheme } from '@/core/theme/themeSemantics';
import { normalizeItemDates } from '@/core/utils/normalize';
import type { RecordNormalizeContext } from './RecordEntity';
import { splitGoalPath } from '@/core/goal';

function unique(values: Array<string | undefined | null>): string[] {
  return Array.from(new Set(values.map(value => String(value ?? '').trim()).filter(Boolean)));
}

function normalizeSearchText(value: unknown): string {
  return String(value ?? '').toLowerCase();
}

type SearchIndexedItem = RecordEntity & {
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
export function normalizeRecordItem(item: RecordEntity, context: RecordNormalizeContext): RecordEntity {
  const line = context.line;

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
  applyExplicitThemeViewFields(toRecordViewItem(item));

  if (!item.extra) item.extra = {};
  if (!item.categoryKey) item.categoryKey = item.coreBlock === 'task' ? '任务' : context.parentFolder;

  normalizeItemDates(toRecordViewItem(item));


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

export function normalizeRecordItems(items: RecordEntity[], context: RecordNormalizeContext): RecordEntity[] {
  return items.map(item => normalizeRecordItem(item, context));
}
