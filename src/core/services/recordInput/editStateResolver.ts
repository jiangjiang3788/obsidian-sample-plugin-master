import type { InputSettings, Item } from '@/core/types/schema';
import type { PreparedEditRecord } from '@/core/types/recordInput';
import type { ParsedRecordSnapshot } from '@/core/types/recordSnapshot';
import { buildEditableRecordSnapshot } from '@/core/services/recordInput/snapshot/EditSnapshotFactory';
import { buildParsedRecordSnapshot } from '@/core/types/recordSnapshot';
import { recordDebugLog } from '@/core/utils/recordDebug';
import { buildPathOption, getLeafPath, normalizePath } from '@/core/utils/pathSemantic';
import { findThemeIdByPath, resolveRecordDependencies } from './dependencyResolver';

export interface BuildEditStateInput {
  settings: InputSettings;
  item: Item;
  preferredBlockId?: string | null;
  preferredThemeId?: string | null;
}

function isOptionObject(value: unknown): value is { label?: unknown; value?: unknown } {
  return !!value && typeof value === 'object' && ('value' in value || 'label' in value);
}

function isPathLikeField(field: any): boolean {
  if (!field) return false;
  if (field.semanticType === 'path') return true;
  const key = String(field.key || field.label || '');
  if (key.includes('分类') || /category/i.test(key)) return true;
  return Array.isArray(field.options) && field.options.some((opt: any) => String(opt?.value || '').includes('/'));
}

function mapFieldValue(field: any, rawValue: unknown): unknown {
  if (rawValue === undefined || rawValue === null || rawValue === '') return undefined;
  if (isOptionObject(rawValue)) {
    return { value: rawValue.value, label: rawValue.label ?? rawValue.value };
  }
  if (['select', 'radio', 'rating'].includes(field.type)) {
    const options = field.options || [];
    if (field.type === 'rating' || field.semanticType === 'ratingPair') {
      const option = options.find((opt: any) => String(opt.label ?? opt.value) === String(rawValue) || String(opt.value) === String(rawValue));
      if (option) return { value: option.value, label: option.label || option.value };
    }
    if (isPathLikeField(field)) {
      const rawPath = normalizePath(String(rawValue));
      const option = options.find((opt: any) => normalizePath(String(opt.value || '')) === rawPath || String(opt.label || '') === String(rawValue));
      if (option) return { value: normalizePath(String(option.value)), label: option.label || getLeafPath(String(option.value)) || option.value };
      const built = buildPathOption(String(rawValue));
      if (built) return built;
    }
    const option = options.find((opt: any) => opt.value === rawValue || opt.label === rawValue || String(opt.value) === String(rawValue) || String(opt.label) === String(rawValue));
    if (option) return { value: option.value, label: option.label || option.value };
  }
  return rawValue;
}

function normalizeToken(value: unknown): string {
  return String(value || '').trim().toLowerCase();
}

function getItemSemanticTokens(item: Item): Set<string> {
  const tokens = new Set<string>();
  const push = (value: unknown) => {
    const normalized = normalizeToken(value);
    if (normalized) tokens.add(normalized);
  };

  push(item.categoryKey);
  push(item.theme);
  push(item.file?.basename);
  push(item.fileName);
  push(item.header);
  push(item.templateId);

  Object.keys(item.extra || {}).forEach((key) => push(key));

  if (item.content) push('content');
  if (item.title) push('title');
  if (item.date || item.createdDate) push('date');
  if (item.startTime) push('time');
  if (item.endTime) push('end');
  if (item.duration !== undefined) push('duration');
  if (item.rating !== undefined) push('rating');

  return tokens;
}

function scoreTemplateForItem(block: any, item: Item): number {
  let score = 0;
  const outputTemplate = String(block?.outputTemplate || '');
  const semanticTokens = getItemSemanticTokens(item);
  const categoryKey = normalizeToken(item.categoryKey);
  const blockId = normalizeToken(block?.id);
  const blockName = normalizeToken(block?.name);
  const blockCategory = normalizeToken(block?.categoryKey);

  if (item.templateId && normalizeToken(item.templateId) === blockId) score += 100;
  if (categoryKey && categoryKey === blockCategory) score += 30;
  if (categoryKey && categoryKey === blockName) score += 20;

  if (item.type === 'task') {
    if (/^\s*-\s*\[[ xX]?\]/m.test(outputTemplate)) score += 40;
    else score -= 10;
  } else if (/<!--\s*start\s*-->/i.test(outputTemplate) || /内容\s*[:：]/.test(outputTemplate)) {
    score += 20;
  }

  const fields = Array.isArray(block?.fields) ? block.fields : [];
  for (const field of fields) {
    const key = normalizeToken(field?.key);
    const label = normalizeToken(field?.label);
    if (semanticTokens.has(key)) score += 8;
    if (label && semanticTokens.has(label)) score += 6;

    if (item.type === 'task' && ['title', '标题', 'content', '内容'].includes(field?.key)) score += 4;
    if (item.type === 'block' && ['content', '内容'].includes(field?.key)) score += 4;
  }

  return score;
}

function looksLikeTaskTemplate(block: any): boolean {
  return /^\s*-\s*\[[ xX]?\]/m.test(String(block?.outputTemplate || ''));
}

function looksLikeBlockTemplate(block: any): boolean {
  return /<!--\s*start\s*-->/i.test(String(block?.outputTemplate || '')) || /内容\s*[:：]/.test(String(block?.outputTemplate || ''));
}

function findOverrideById(settings: InputSettings, overrideId?: string | null) {
  if (!overrideId) return null;
  return (settings.overrides || []).find((candidate: any) => candidate.id === overrideId) ?? null;
}

function resolveBlockForEdit(settings: InputSettings, item: Item, preferredBlockId?: string | null) {
  const blocks = settings.blocks || [];
  if (!Array.isArray(blocks) || blocks.length === 0) {
    return {
      blockId: preferredBlockId ?? null,
      themeIdFromTemplateHint: null as string | null,
      resolvedBy: 'fallback' as const,
      usedFallbackBlock: true,
      debugReason: '没有可用 block，只能使用 preferredBlockId。',
    };
  }

  // SNAPSHOT-MIGRATION / SAFETY-FIX:
  // 任务编辑必须优先尊重原记录中的模板提示。
  // 之前 (模板ID::ovr_xxx)(模板来源::override) 会被当成 blockId 去查，查不到后进入打分推断，
  // 可能把任务误判成「闪念」这类 block 模板，导致路径从任务文件跳到闪念文件并被阻止保存。
  if (item.templateId && item.templateSourceType === 'override') {
    const override = findOverrideById(settings, item.templateId) as any;
    if (override?.blockId) {
      const block = blocks.find((candidate) => candidate.id === override.blockId);
      if (block) {
        return {
          blockId: block.id,
          themeIdFromTemplateHint: override.themeId ?? null,
          resolvedBy: 'exact' as const,
          usedFallbackBlock: false,
          debugReason: `根据 override 模板ID ${item.templateId} 精确还原 block=${block.id} theme=${override.themeId || ''}`,
        };
      }
    }
  }

  if (item.templateId && item.templateSourceType !== 'override') {
    const exact = blocks.find((block) => block.id === item.templateId);
    if (exact) {
      return {
        blockId: exact.id,
        themeIdFromTemplateHint: null as string | null,
        resolvedBy: 'exact' as const,
        usedFallbackBlock: false,
        debugReason: `根据 block 模板ID ${item.templateId} 精确命中。`,
      };
    }
  }

  const preferred = preferredBlockId ? blocks.find((block) => block.id === preferredBlockId) : null;
  if (preferred) {
    // preferredBlockId 只有在类型匹配时才作为强候选，避免 categoryKey / 外部误传把 task 带到 block 模板。
    const typeMatches = item.type === 'task' ? looksLikeTaskTemplate(preferred) : !looksLikeTaskTemplate(preferred);
    if (typeMatches) {
      return {
        blockId: preferred.id,
        themeIdFromTemplateHint: null as string | null,
        resolvedBy: 'exact' as const,
        usedFallbackBlock: false,
        debugReason: `preferredBlockId 类型匹配，使用 ${preferred.id}。`,
      };
    }
  }

  // 类型护栏：任务只能在任务模板里推断，block 只能优先在非任务模板里推断。
  // 这是为了防止任务内容字段较少时，被「闪念」等 block 模板高分抢走。
  const typedCandidates = item.type === 'task'
    ? blocks.filter(looksLikeTaskTemplate)
    : blocks.filter((block) => !looksLikeTaskTemplate(block));
  const candidatePool = typedCandidates.length > 0 ? typedCandidates : blocks;

  const withScores = candidatePool
    .map((block) => ({ block, score: scoreTemplateForItem(block, item) }))
    .sort((left, right) => right.score - left.score);

  const top = withScores[0];
  if (top && top.score > 0) {
    return {
      blockId: top.block.id,
      themeIdFromTemplateHint: null as string | null,
      resolvedBy: 'inferred' as const,
      usedFallbackBlock: false,
      debugReason: `按记录类型护栏后推断命中 ${top.block.id}，score=${top.score}。`,
    };
  }

  const sameTypeFallback = item.type === 'task'
    ? blocks.find(looksLikeTaskTemplate)
    : blocks.find(looksLikeBlockTemplate);

  return {
    blockId: sameTypeFallback?.id ?? blocks[0]?.id ?? null,
    themeIdFromTemplateHint: null as string | null,
    resolvedBy: 'fallback' as const,
    usedFallbackBlock: true,
    debugReason: `无法精确/推断命中，使用同类型 fallback=${sameTypeFallback?.id || blocks[0]?.id || ''}。`,
  };
}

function buildRatingOption(field: any, item: Item) {
  if (item.rating === undefined && !item.pintu) return undefined;
  const options = field?.options || [];
  const score = item.rating !== undefined && item.rating !== null ? String(item.rating) : '';
  const image = String(item.pintu || '');
  let option = options.find((opt: any) => String(opt.label ?? '') === score && (!image || String(opt.value || '') === image));
  if (!option && score) option = options.find((opt: any) => String(opt.label ?? opt.value) === score);
  if (!option && image) option = options.find((opt: any) => String(opt.value || '') === image);
  if (option) return { value: option.value, label: option.label || option.value };
  if (score || image) return { value: image, label: score || image };
  return undefined;
}

function isContentField(field: any): boolean {
  const key = normalizeToken(field?.key);
  const label = normalizeToken(field?.label);
  const semantic = normalizeToken(field?.semanticType);
  return semantic === 'content'
    || ['内容', '正文', 'content', 'body', '任务内容', '记录内容', 'taskcontent'].includes(key)
    || ['内容', '正文', 'content', 'body', '任务内容', '记录内容', 'taskcontent'].includes(label);
}

function isTitleField(field: any): boolean {
  const key = normalizeToken(field?.key);
  const label = normalizeToken(field?.label);
  return ['title', '标题'].includes(key) || ['title', '标题'].includes(label);
}

function readSnapshotSemanticValue(field: any, item: Item, snapshot: ParsedRecordSnapshot): unknown {
  const key = normalizeToken(field?.key);
  const label = normalizeToken(field?.label);

  // SNAPSHOT-MIGRATION CLOSEOUT:
  // 编辑主路径优先从 ParsedRecordSnapshot.semantic 读取，legacy item 字段只作为 fallback。
  // 这样任务正文、时间、主题路径的来源是一致的，避免 parser 提取对了但 editStateResolver 又读回 item.title。
  if (item.type === 'task' && (isContentField(field) || isTitleField(field))) {
    return snapshot.semantic.editableText || snapshot.semantic.title || item.title || item.content;
  }

  if (isContentField(field)) return snapshot.semantic.editableText || snapshot.semantic.content || item.content;
  if (isTitleField(field)) return snapshot.semantic.title || snapshot.semantic.editableText || item.title;

  if (['日期', 'date'].includes(key) || ['日期', 'date'].includes(label)) return snapshot.semantic.date;
  if (['时间', 'time', 'start', 'starttime'].includes(key) || ['时间', 'time', 'start', 'starttime'].includes(label)) return snapshot.semantic.startTime;
  if (['结束', 'end', 'endtime'].includes(key) || ['结束', 'end', 'endtime'].includes(label)) return snapshot.semantic.endTime;
  if (['时长', 'duration'].includes(key) || ['时长', 'duration'].includes(label)) return snapshot.semantic.duration;

  if (['主题', 'theme', 'themepath', '完整主题', '完整路径主题'].includes(key) || ['主题', 'theme', 'themepath', '完整主题', '完整路径主题'].includes(label)) {
    return snapshot.semantic.themePath || item.theme || item.header;
  }
  if (['roottheme', '根主题'].includes(key) || ['roottheme', '根主题'].includes(label)) return snapshot.semantic.rootTheme;
  if (['leaftheme', '叶主题'].includes(key) || ['leaftheme', '叶主题'].includes(label)) return snapshot.semantic.leafTheme;

  return undefined;
}

function buildInitialFormData(template: any, item: Item, snapshot: ParsedRecordSnapshot = buildParsedRecordSnapshot(item)): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  if (!template?.fields?.length) return result;

  const extraEntries = Object.entries(item.extra || {});
  const readExtraByAlias = (alias: string) => {
    if (!alias) return undefined;
    if (item.extra && Object.prototype.hasOwnProperty.call(item.extra, alias)) return item.extra[alias as keyof typeof item.extra];
    const lower = normalizeToken(alias);
    const match = extraEntries.find(([key]) => normalizeToken(key) === lower);
    return match?.[1];
  };

  const readValue = (field: any) => {
    const key = String(field.key || '').toLowerCase();
    const label = String(field.label || '').toLowerCase();

    if (field.type === 'rating' || field.semanticType === 'ratingPair' || ['评分', 'rating'].includes(key) || ['评分', 'rating'].includes(label)) {
      return buildRatingOption(field, item);
    }

    const semanticValue = readSnapshotSemanticValue(field, item, snapshot);
    if (semanticValue !== undefined && semanticValue !== null && semanticValue !== '') return semanticValue;

    const aliases = [field.key, field.label, String(field.key || '').toLowerCase(), String(field.label || '').toLowerCase()];
    for (const alias of aliases) {
      const value = readExtraByAlias(alias);
      if (value !== undefined) return value;
    }

    if (isPathLikeField(field)) {
      // LEGACY-FALLBACK:
      // 历史 path-like 字段曾经直接读 categoryKey。现在优先使用 themePath，只有没有主题路径时才回退。
      return snapshot.semantic.themePath || item.theme || item.categoryKey || undefined;
    }

    return (item as any)[field.key] ?? (item as any)[field.label];
  };

  for (const field of template.fields) {
    const raw = readValue(field);
    const mapped = mapFieldValue(field, raw);
    if (mapped !== undefined) result[field.key] = mapped;
  }
  return result;
}

export function buildEditRecordState(input: BuildEditStateInput): PreparedEditRecord {
  const { settings, item, preferredBlockId, preferredThemeId } = input;
  const resolvedBlock = resolveBlockForEdit(settings, item, preferredBlockId);
  const resolvedThemeId = resolvedBlock.themeIdFromTemplateHint ?? findThemeIdByPath(settings, item.theme) ?? preferredThemeId ?? undefined;
  recordDebugLog('编辑模板解析', '任务/块模板选择', {
    itemType: item.type,
    itemTitle: item.title,
    itemEditableText: item.editableText,
    templateId: item.templateId,
    templateSourceType: item.templateSourceType,
    preferredBlockId,
    resolvedBlockId: resolvedBlock.blockId,
    resolvedThemeId,
    resolvedBy: resolvedBlock.resolvedBy,
    reason: resolvedBlock.debugReason,
  });
  const resolvedDependencies = resolveRecordDependencies({
    settings,
    blockId: resolvedBlock.blockId,
    themeId: resolvedThemeId,
    item,
  });

  const parsedSnapshot = buildParsedRecordSnapshot(item);
  const initialFormData = resolvedDependencies.template ? buildInitialFormData(resolvedDependencies.template, item, parsedSnapshot) : {};
  recordDebugLog('编辑初始值', 'ParsedRecordSnapshot 到 initialFormData 的回填结果', {
    parsedSemantic: parsedSnapshot.semantic,
    initialFormData,
  });
  const snapshot = buildEditableRecordSnapshot({
    mode: 'edit',
    item,
    blockId: resolvedDependencies.blockId,
    themeId: resolvedDependencies.themeId,
    fields: initialFormData,
    template: resolvedDependencies.template,
    theme: resolvedDependencies.theme,
    templateMeta: {
      templateId: resolvedDependencies.meta.templateId ?? resolvedDependencies.template?.id ?? null,
      templateSourceType: resolvedDependencies.meta.templateSourceType ?? 'block',
    },
  });

  const warnings = [...resolvedDependencies.warnings];
  if (snapshot.persistencePlan.pathChanged) {
    warnings.push({
      code: 'record_target_path_changed',
      message: `当前模板/主题推导出的目标文件为 ${snapshot.outputPlan.targetFilePath}，与原文件 ${snapshot.persistencePlan.originalPath} 不同。当前仍按原位置更新；后续步骤会接入迁移保存。`,
      field: 'themeId',
    });
  }

  return {
    blockId: resolvedDependencies.blockId,
    themeId: resolvedDependencies.themeId,
    template: resolvedDependencies.template,
    initialFormData,
    snapshot,
    outputPlan: snapshot.outputPlan,
    persistencePlan: snapshot.persistencePlan,
    inferred: {
      usedFallbackBlock: resolvedBlock.usedFallbackBlock,
      usedFallbackTheme: resolvedDependencies.meta.usedFallbackTheme,
      templateSourceType: resolvedDependencies.meta.templateSourceType,
      resolvedBy: resolvedBlock.resolvedBy,
    },
    warnings,
  };
}
