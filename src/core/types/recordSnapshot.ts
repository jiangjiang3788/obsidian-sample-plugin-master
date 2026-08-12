import type { RecordViewItem } from '@/core/records/RecordEntity';
import { readExplicitThemeParts, splitThemePath as splitExplicitThemePath } from '@/core/theme/themeSemantics';

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
  /** Stable identity allocated before persistence. */
  recordId?: string | null;
  schemaVersion?: number | null;
  coreBlock?: string | null;
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
    period: string | null;
    tags: string[];
    goalPaths: string[];
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
    templateSourceType: 'core-block' | 'goal-template' | null;
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
  return splitExplicitThemePath(themePath);
}

function pickEditableText(item: RecordViewItem): string | null {
  if (item.editableText?.trim()) return item.editableText.trim();
  const extraBody = item.extra?.['正文'];
  if (typeof extraBody === 'string' && extraBody.trim()) return extraBody.trim();
  return item.content?.trim() || item.title || null;
}

export function buildParsedRecordSnapshot(item: RecordViewItem): ParsedRecordSnapshot {
  const path = item.source?.path ?? item.file?.path ?? null;
  const line = item.source?.startLine ?? (typeof item.file?.line === 'number' ? item.file.line : null);

  const editableText = pickEditableText(item);
  const themeParts = readExplicitThemeParts(item as any);

  return {
    itemId: item.id,
    entryKind: item.coreBlock === 'task' ? 'task' : 'block',
    locator: { path, line },
    raw: { sourceText: item.rawSource || item.content || '' },
    semantic: {
      title: item.title || null,
      editableText,
      content: item.content || null,
      date: item.date || item.createdDate || null,
      period: item.period || null,
      tags: [...(item.tags || [])],
      goalPaths: [...((item as any).goalPaths || [])],
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
