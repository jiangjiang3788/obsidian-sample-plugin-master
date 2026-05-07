import type { Item } from './schema';

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
   * 安全 MVP：编辑导致目标文件变化时先阻止保存，
   * 不在测试不足时自动迁移，避免新旧位置同时出现或误删旧记录。
   */
  writeMode: 'create' | 'update_in_place' | 'blocked_path_change';
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
  if (item.editableText) return item.editableText;
  const extraBody = item.extra?.['正文'];
  if (typeof extraBody === 'string' && extraBody.trim()) return extraBody.trim();
  if (item.type === 'task') return item.title || null;
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
