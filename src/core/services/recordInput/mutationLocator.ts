import type { Item } from '@/core/types/schema';
import { createRecordConflictError } from './mutationErrors';

export interface ResolvedBlockRange {
  startIndex: number;
  endIndex: number;
}

const BLOCK_START_MARKER = '<!-- start -->';
const BLOCK_END_MARKER = '<!-- end -->';
const TASK_PREFIX_RE = /^\s*-\s*\[[ xX]?\]\s*/;

function normalizeText(value: unknown): string {
  return String(value ?? '')
    .replace(/\r/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function normalizeMultilineText(value: unknown): string {
  return String(value ?? '')
    .replace(/\r/g, '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .join('\n')
    .toLowerCase();
}

function normalizeTaskLine(value: unknown): string {
  return normalizeText(value);
}

function resolveNearestIndex(indexes: number[], expectedIndex: number): number {
  return indexes
    .slice()
    .sort((a, b) => {
      const distanceDiff = Math.abs(a - expectedIndex) - Math.abs(b - expectedIndex);
      if (distanceDiff !== 0) return distanceDiff;
      return a - b;
    })[0];
}

function findTaskCandidates(lines: string[], item: Pick<Item, 'content' | 'title'> | null): Array<{ index: number; score: number }> {
  const expectedLine = normalizeTaskLine(item?.content);
  const expectedTitle = normalizeText(item?.title);
  const candidates: Array<{ index: number; score: number }> = [];

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (!TASK_PREFIX_RE.test(line)) continue;

    let score = 0;
    const normalizedLine = normalizeTaskLine(line);
    if (expectedLine && normalizedLine === expectedLine) score += 120;
    if (expectedTitle && normalizedLine.includes(expectedTitle)) score += 20;
    if (score > 0) candidates.push({ index, score });
  }

  return candidates;
}

export function resolveTaskLineIndexForMutation(
  lines: string[],
  item: Pick<Item, 'content' | 'title'> | null,
  expectedIndex: number,
): number {
  const directLine = lines[expectedIndex];
  if (directLine && TASK_PREFIX_RE.test(directLine)) {
    const directCandidates = findTaskCandidates([directLine], item);
    if (directCandidates.length > 0) return expectedIndex;
  }

  const candidates = findTaskCandidates(lines, item);
  if (candidates.length > 0) {
    const maxScore = Math.max(...candidates.map((candidate) => candidate.score));
    const topIndexes = candidates
      .filter((candidate) => candidate.score === maxScore)
      .map((candidate) => candidate.index);
    return resolveNearestIndex(topIndexes, expectedIndex);
  }

  if (!item && directLine && TASK_PREFIX_RE.test(directLine)) {
    return expectedIndex;
  }

  throw createRecordConflictError(
    directLine ? 'record_line_stale' : 'record_item_missing',
    '原始任务位置已变化或记录已不存在。',
  );
}

function tryFindBlockEndIndex(lines: string[], startIndex: number): number | null {
  for (let index = startIndex; index < lines.length; index += 1) {
    if (lines[index].trim() === BLOCK_END_MARKER) return index;
  }
  return null;
}

function buildBlockTitle(contentLines: string[]): string {
  const firstMeaningfulLine = contentLines
    .map((line) => line.trim())
    .find((line) => Boolean(line));
  return firstMeaningfulLine || '';
}

function scoreBlockCandidate(
  lines: string[],
  range: ResolvedBlockRange,
  item: Pick<Item, 'content' | 'title'>,
  expectedIndex: number,
): number {
  const contentLines = lines.slice(range.startIndex + 1, range.endIndex);
  const normalizedContent = normalizeMultilineText(contentLines.join('\n'));
  const normalizedExpectedContent = normalizeMultilineText(item.content);
  const normalizedTitle = normalizeText(buildBlockTitle(contentLines));
  const normalizedExpectedTitle = normalizeText(item.title);

  let score = 0;
  if (normalizedExpectedContent && normalizedContent === normalizedExpectedContent) score += 140;
  else if (normalizedExpectedContent && normalizedContent.includes(normalizedExpectedContent)) score += 45;
  else if (normalizedExpectedContent && normalizedExpectedContent.includes(normalizedContent)) score += 30;

  if (normalizedExpectedTitle && normalizedTitle === normalizedExpectedTitle) score += 28;
  else if (normalizedExpectedTitle && normalizedTitle.includes(normalizedExpectedTitle)) score += 12;

  const distance = Math.abs(range.startIndex - expectedIndex);
  score += Math.max(0, 12 - Math.min(distance, 12));
  return score;
}

export function resolveBlockRangeForMutation(
  lines: string[],
  item: Pick<Item, 'content' | 'title'>,
  expectedIndex: number,
): ResolvedBlockRange {
  const directLine = lines[expectedIndex];
  if (directLine?.trim() === BLOCK_START_MARKER) {
    const directEndIndex = tryFindBlockEndIndex(lines, expectedIndex);
    if (directEndIndex === null) {
      throw createRecordConflictError(
        'record_block_boundary_invalid',
        '原始块边界已损坏，无法安全更新。',
      );
    }

    const directRange = { startIndex: expectedIndex, endIndex: directEndIndex };
    if (scoreBlockCandidate(lines, directRange, item, expectedIndex) >= 28) {
      return directRange;
    }
  }

  const candidates: Array<{ range: ResolvedBlockRange; score: number }> = [];
  for (let index = 0; index < lines.length; index += 1) {
    if (lines[index].trim() !== BLOCK_START_MARKER) continue;
    const endIndex = tryFindBlockEndIndex(lines, index);
    if (endIndex === null) continue;
    const range = { startIndex: index, endIndex };
    const score = scoreBlockCandidate(lines, range, item, expectedIndex);
    if (score > 0) {
      candidates.push({ range, score });
    }
  }

  if (candidates.length > 0) {
    candidates.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return Math.abs(a.range.startIndex - expectedIndex) - Math.abs(b.range.startIndex - expectedIndex);
    });
    return candidates[0].range;
  }

  throw createRecordConflictError(
    directLine ? 'record_line_stale' : 'record_item_missing',
    '原始块位置已变化或记录已不存在。',
  );
}
