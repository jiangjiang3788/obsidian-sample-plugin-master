import type { Item } from './schema';
import { extractTaskEditableText } from '@/core/utils/text';

/**
 * 计划第 5 步：把“保存位置 / 输出结果”前置成显式的 OutputPlan，
 * 让编辑阶段也能知道当前模板+主题+字段会写到哪里。
 */
export interface ThemePathParts {
  /** 完整路径主题，例如：学习/英语/听力。 */
  themePath: string | null;
  /** 根主题，例如：学习。 */
  rootTheme: string | null;
  /** 叶主题，例如：听力。 */
  leafTheme: string | null;
}

export interface RecordOutputPlan {
  targetFilePath: string | null;
  targetHeader: string | null;
  outputContent: string;
  renderData: Record<string, unknown>;
  themeParts: ThemePathParts;
}

export interface RecordPersistencePlan {
  originalPath: string | null;
  pathChanged: boolean;
  /**
   * 主线第 7 步：路径变化不再一刀切阻止。
   *
   * update_in_place：目标路径未变化，直接替换原记录。
   * move_and_replace：目标路径变化，先写入新位置，再删除旧记录；
   *                  如果删除失败，返回 partial_success 并保留旧记录，避免误删。
   */
  writeMode: 'create' | 'update_in_place' | 'move_and_replace';
}

/**
 * 兼容式重构中的“解析快照”最小版本。
 * 先把原始记录、可编辑正文、模板提示和定位信息收口，
 * 后续再逐步替换旧的 item.title / item.content 猜测链路。
 */
export interface ParsedRecordSnapshot {
  itemId: string;
  entryKind: 'task' | 'block';
  locator: {
    path: string | null;
    line: number | null;
  };
  raw: {
    sourceText: string;
  };
  semantic: {
    title: string | null;
    editableText: string | null;
    content: string | null;
    date: string | null;
    startTime: string | null;
    endTime: string | null;
    duration: number | null;
    themePath: string | null;
    rootTheme: string | null;
    leafTheme: string | null;
    categoryKey: string | null;
  };
  templateHint: {
    templateId: string | null;
    templateSourceType: 'block' | 'override' | null;
  };
  extra: Record<string, unknown>;
}

export interface EditableRecordSnapshot {
  mode: 'create' | 'edit';
  parsed: ParsedRecordSnapshot | null;
  blockId: string | null;
  themeId: string | null;
  fields: Record<string, unknown>;
  outputPlan: RecordOutputPlan;
  persistencePlan: RecordPersistencePlan;
  themeParts: ThemePathParts;
}

export function splitThemePath(themePath: string | null | undefined): ThemePathParts {
  const cleaned = String(themePath || '')
    .split('/')
    .map((part) => part.trim())
    .filter(Boolean);

  if (!cleaned.length) {
    return { themePath: null, rootTheme: null, leafTheme: null };
  }

  return {
    themePath: cleaned.join('/'),
    rootTheme: cleaned[0] || null,
    leafTheme: cleaned[cleaned.length - 1] || null,
  };
}

function pickEditableText(item: Item): string | null {
  if (item.type === 'task') {
    // SNAPSHOT-MIGRATION DEBUG FIX:
    // 任务正文优先从 rawSource/content 重新剥离，而不是优先信任 item.title / item.editableText。
    // 原因：历史缓存或旧 parser 可能已经把 editableText/title 写成被空格截断的摘要。
    // 例如：`长治学院  设计道旗定稿` 曾经会只剩 `长治学院`。
    const fromRaw = extractTaskEditableText(item.rawSource || item.content || '').editableText;
    if (fromRaw) return fromRaw;
    const extraBody = item.extra?.['正文'];
    if (typeof extraBody === 'string' && extraBody.trim()) return extraBody.trim();
    if (item.editableText) return item.editableText;
    return item.title || null;
  }
  if (item.editableText) return item.editableText;
  const extraBody = item.extra?.['正文'];
  if (typeof extraBody === 'string' && extraBody.trim()) return extraBody.trim();
  return item.content || item.title || null;
}

export function buildParsedRecordSnapshot(item: Item): ParsedRecordSnapshot {
  const path = item.file?.path ?? (() => {
    const hashIndex = item.id.lastIndexOf('#');
    return hashIndex >= 0 ? item.id.slice(0, hashIndex) : null;
  })();
  const line = typeof item.file?.line === 'number'
    ? item.file.line
    : (() => {
        const hashIndex = item.id.lastIndexOf('#');
        if (hashIndex < 0) return null;
        const parsed = Number.parseInt(item.id.slice(hashIndex + 1), 10);
        return Number.isFinite(parsed) ? parsed : null;
      })();

  const editableText = pickEditableText(item);
  const themeParts = splitThemePath(item.theme || item.header || null);

  return {
    itemId: item.id,
    entryKind: item.type,
    locator: { path, line },
    raw: { sourceText: item.rawSource || item.content || '' },
    semantic: {
      title: item.title || null,
      editableText,
      content: item.content || null,
      date: item.date || item.createdDate || null,
      startTime: item.startTime || null,
      endTime: item.endTime || null,
      duration: item.duration ?? null,
      themePath: themeParts.themePath,
      rootTheme: themeParts.rootTheme,
      leafTheme: themeParts.leafTheme,
      categoryKey: item.categoryKey || null,
    },
    templateHint: {
      templateId: item.templateId || null,
      templateSourceType: item.templateSourceType || null,
    },
    extra: { ...(item.extra || {}) },
  };
}
