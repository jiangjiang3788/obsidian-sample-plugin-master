import type { InputSettings, Item } from '@/core/types/schema';
import type { PreparedEditRecord } from '@/core/types/recordInput';
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

function resolveBlockForEdit(settings: InputSettings, item: Item, preferredBlockId?: string | null) {
  const blocks = settings.blocks || [];
  if (!Array.isArray(blocks) || blocks.length === 0) {
    return { blockId: preferredBlockId ?? null, resolvedBy: 'fallback' as const, usedFallbackBlock: true };
  }

  if (item.templateId) {
    const exact = blocks.find((block) => block.id === item.templateId);
    if (exact) {
      return { blockId: exact.id, resolvedBy: 'exact' as const, usedFallbackBlock: false };
    }
  }

  const withScores = blocks
    .map((block) => ({ block, score: scoreTemplateForItem(block, item) }))
    .sort((left, right) => right.score - left.score);

  const top = withScores[0];
  if (top && top.score > 0) {
    return { blockId: top.block.id, resolvedBy: 'inferred' as const, usedFallbackBlock: false };
  }

  const preferred = preferredBlockId ? blocks.find((block) => block.id === preferredBlockId) : null;
  if (preferred) {
    return { blockId: preferred.id, resolvedBy: 'fallback' as const, usedFallbackBlock: true };
  }

  const sameTypeFallback = item.type === 'task'
    ? blocks.find((block) => /^\s*-\s*\[[ xX]?\]/m.test(String(block?.outputTemplate || '')))
    : blocks.find((block) => /<!--\s*start\s*-->/i.test(String(block?.outputTemplate || '')) || /内容\s*[:：]/.test(String(block?.outputTemplate || '')));

  return {
    blockId: sameTypeFallback?.id ?? blocks[0]?.id ?? null,
    resolvedBy: 'fallback' as const,
    usedFallbackBlock: true,
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

function buildInitialFormData(template: any, item: Item): Record<string, unknown> {
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
    const aliases = [field.key, field.label, String(field.key || '').toLowerCase(), String(field.label || '').toLowerCase()];
    for (const alias of aliases) {
      const value = readExtraByAlias(alias);
      if (value !== undefined) return value;
    }

    const key = String(field.key || '').toLowerCase();
    const label = String(field.label || '').toLowerCase();

    if (field.type === 'rating' || field.semanticType === 'ratingPair' || ['评分', 'rating'].includes(key) || ['评分', 'rating'].includes(label)) {
      return buildRatingOption(field, item);
    }

    if (isPathLikeField(field)) {
      return item.categoryKey || undefined;
    }

    if (['内容', 'content', 'title', '标题'].includes(field.key) || ['内容', 'content', 'title', '标题'].includes(field.label)) {
      return item.type === 'task' ? (item.title || item.content) : item.content;
    }
    if (['日期', 'date'].includes(field.key) || ['日期', 'date'].includes(field.label)) return item.date || item.createdDate;
    if (['时间', 'time', 'start'].includes(key) || ['时间', 'time', 'start'].includes(label)) return item.startTime;
    if (['结束', 'end'].includes(key) || ['结束', 'end'].includes(label)) return item.endTime;
    if (['时长', 'duration'].includes(key) || ['时长', 'duration'].includes(label)) return item.duration;
    if (['主题', 'theme'].includes(key) || ['主题', 'theme'].includes(label)) return item.theme || item.header;
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
  const resolvedThemeId = findThemeIdByPath(settings, item.theme) ?? preferredThemeId ?? undefined;
  const resolvedDependencies = resolveRecordDependencies({
    settings,
    blockId: resolvedBlock.blockId,
    themeId: resolvedThemeId,
    item,
  });

  return {
    blockId: resolvedDependencies.blockId,
    themeId: resolvedDependencies.themeId,
    template: resolvedDependencies.template,
    initialFormData: resolvedDependencies.template ? buildInitialFormData(resolvedDependencies.template, item) : {},
    inferred: {
      usedFallbackBlock: resolvedBlock.usedFallbackBlock,
      usedFallbackTheme: resolvedDependencies.meta.usedFallbackTheme,
      templateSourceType: resolvedDependencies.meta.templateSourceType,
      resolvedBy: resolvedBlock.resolvedBy,
    },
    warnings: [...resolvedDependencies.warnings],
  };
}
