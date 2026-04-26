import type { Item } from './schema';

/**
 * 计划第 5 步：把“保存位置 / 输出结果”前置成显式的 OutputPlan，
 * 让编辑阶段也能知道当前模板+主题+字段会写到哪里。
 */
export interface RecordOutputPlan {
  targetFilePath: string | null;
  targetHeader: string | null;
  outputContent: string;
  renderData: Record<string, unknown>;
}

export interface RecordPersistencePlan {
  originalPath: string | null;
  pathChanged: boolean;
  /**
   * 计划第 6.5 步：当编辑导致目标文件变化时，
   * 进入安全迁移保存（先写新位置，再删旧位置）。
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

  const editableText = item.type === 'task'
    ? ((item.extra?.['正文'] as string | undefined) || item.title || item.content || null)
    : (item.content || item.title || null);

  return {
    itemId: item.id,
    entryKind: item.type,
    locator: { path, line },
    raw: { sourceText: item.content || '' },
    semantic: {
      title: item.title || null,
      editableText,
      content: item.content || null,
      date: item.date || item.createdDate || null,
      startTime: item.startTime || null,
      endTime: item.endTime || null,
      duration: item.duration ?? null,
      themePath: item.theme || item.header || null,
      categoryKey: item.categoryKey || null,
    },
    templateHint: {
      templateId: item.templateId || null,
      templateSourceType: item.templateSourceType || null,
    },
    extra: { ...(item.extra || {}) },
  };
}
