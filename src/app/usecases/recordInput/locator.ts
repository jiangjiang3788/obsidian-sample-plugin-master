import type { Item } from '@core/public';

export interface CreateLocatorContext {
  outputContent: string;
  normalizedFormData: Record<string, unknown>;
  templateId?: string | null;
  templateSourceType?: 'block' | 'override' | null;
  themePath?: string | null;
  blockCategoryKey?: string | null;
  itemTypeHint: 'task' | 'block' | 'unknown';
  appendMode: 'header' | 'append';
  targetHeader?: string | null;
  beforeMaxLine: number;
}

function normalizeComparableText(value: unknown): string {
  return String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function normalizeLineText(value: unknown): string {
  return String(value ?? '')
    .replace(/\r/g, '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

function getFirstDefinedValue(record: Record<string, unknown>, keys: string[]): unknown {
  for (const key of keys) {
    if (!Object.prototype.hasOwnProperty.call(record, key)) continue;
    const value = record[key];
    if (value !== undefined && value !== null && value !== '') return value;
  }
  return undefined;
}

export function parseItemLocator(itemId: string): { path: string; lineNo: number } {
  const hashIndex = itemId.lastIndexOf('#');
  if (hashIndex === -1) throw new Error(`无效的条目ID格式: ${itemId}`);
  const path = itemId.substring(0, hashIndex);
  const lineNo = Number.parseInt(itemId.substring(hashIndex + 1), 10);
  if (!path || Number.isNaN(lineNo)) {
    throw new Error(`无效的条目ID格式: ${itemId}`);
  }
  return { path, lineNo };
}

export function getItemLineNumber(item: Item): number {
  if (typeof item.file?.line === 'number') return item.file.line;
  try {
    return parseItemLocator(item.id).lineNo;
  } catch {
    return 0;
  }
}

export function getItemFilePath(item: Item): string | null {
  if (item.file?.path) return item.file.path;
  try {
    return parseItemLocator(item.id).path;
  } catch {
    return null;
  }
}

function buildItemSignature(item: Item): string {
  return JSON.stringify([
    item.type,
    item.title || '',
    item.content || '',
    item.templateId || '',
    item.templateSourceType || '',
    item.theme || '',
    item.categoryKey || '',
    item.header || '',
    item.date || '',
    item.startTime || '',
    item.endTime || '',
    item.duration ?? '',
  ]);
}

function scoreCreatedRecordCandidate(item: Item, context: CreateLocatorContext, isFallbackSearch: boolean): number {
  let score = 0;
  const normalizedOutput = normalizeLineText(context.outputContent);
  const normalizedItemContent = normalizeLineText(item.content);
  const normalizedItemTitle = normalizeComparableText(item.title);

  if (context.templateId && item.templateId === context.templateId) score += 30;
  if (context.templateSourceType && item.templateSourceType === context.templateSourceType) score += 8;
  if (context.themePath && item.theme === context.themePath) score += 6;
  if (context.blockCategoryKey && item.categoryKey === context.blockCategoryKey) score += 6;
  if (context.itemTypeHint !== 'unknown' && item.type === context.itemTypeHint) score += 10;

  if (context.appendMode === 'header' && context.targetHeader) {
    if (item.header === context.targetHeader) score += 16;
    else score -= 4;
  }

  const lineNo = getItemLineNumber(item);
  if (context.appendMode === 'append') {
    if (lineNo > context.beforeMaxLine) score += 12;
    else if (context.beforeMaxLine > 0) score -= 3;
  }

  if (normalizedOutput) {
    if (normalizedItemContent === normalizedOutput) score += 44;
    else if (normalizedItemContent && normalizedOutput.includes(normalizedItemContent)) score += 18;
    else if (normalizedItemContent && normalizedItemContent.includes(normalizedOutput)) score += 12;
  }

  const titleHint = getFirstDefinedValue(context.normalizedFormData, ['标题', 'title', '内容', 'content', '名称', 'name']);
  const normalizedTitleHint = normalizeComparableText(titleHint);
  if (normalizedTitleHint) {
    if (normalizedItemTitle === normalizedTitleHint) score += 20;
    else if (normalizedItemTitle && (normalizedItemTitle.includes(normalizedTitleHint) || normalizedTitleHint.includes(normalizedItemTitle))) score += 10;
    const normalizedContentHint = normalizeComparableText(item.content);
    if (normalizedContentHint && normalizedContentHint === normalizedTitleHint) score += 12;
    else if (normalizedContentHint && normalizedContentHint.includes(normalizedTitleHint)) score += 6;
  }

  const startHint = getFirstDefinedValue(context.normalizedFormData, ['时间', 'time', 'start']);
  if (startHint && String(item.startTime || '') === String(startHint)) score += 4;
  const endHint = getFirstDefinedValue(context.normalizedFormData, ['结束', 'end', 'endTime']);
  if (endHint && String(item.endTime || '') === String(endHint)) score += 4;
  const durationHint = getFirstDefinedValue(context.normalizedFormData, ['时长', 'duration']);
  if (durationHint !== undefined && Number(item.duration) === Number(durationHint)) score += 4;

  if (context.itemTypeHint === 'task' && /^\s*-\s*\[[ xX]?\]/.test(item.content || '')) {
    score += 4;
  }

  if (isFallbackSearch && score < 16) {
    return 0;
  }
  return score;
}

export function locateCreatedRecord(beforeItems: Item[], afterItems: Item[], context: CreateLocatorContext): Item | undefined {
  const beforeSignatureCount = new Map<string, number>();
  for (const item of beforeItems) {
    const signature = buildItemSignature(item);
    beforeSignatureCount.set(signature, (beforeSignatureCount.get(signature) || 0) + 1);
  }

  const extraCandidates: Item[] = [];
  for (const item of afterItems) {
    const signature = buildItemSignature(item);
    const remaining = beforeSignatureCount.get(signature) || 0;
    if (remaining > 0) {
      beforeSignatureCount.set(signature, remaining - 1);
      continue;
    }
    extraCandidates.push(item);
  }

  const candidates = extraCandidates.length > 0 ? extraCandidates : afterItems;
  if (!candidates.length) return undefined;

  const scored = candidates
    .map((item) => ({ item, score: scoreCreatedRecordCandidate(item, context, extraCandidates.length === 0) }))
    .filter((entry) => entry.score > 0 || extraCandidates.length > 0)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return getItemLineNumber(b.item) - getItemLineNumber(a.item);
    });

  return scored[0]?.item;
}

export function inferCreatedItemType(outputTemplate: string | undefined): 'task' | 'block' | 'unknown' {
  const text = String(outputTemplate || '').trim();
  if (!text) return 'unknown';
  if (/^\s*-\s*\[[ xX]?\]/m.test(text)) return 'task';
  if (/<!--\s*start\s*-->/i.test(text) || /<!--\s*end\s*-->/i.test(text)) return 'block';
  return 'unknown';
}
