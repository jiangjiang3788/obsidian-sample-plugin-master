import { createRecordConflictError } from './mutationErrors';

export interface ResolvedBlockRange {
  startIndex: number;
  endIndex: number;
}

const BLOCK_START_MARKER = '<!-- start -->';
const BLOCK_END_MARKER = '<!-- end -->';
const RECORD_ID_RE = /^\s*(?:记录ID|recordId)\s*[:：]{1,2}\s*(\S+)\s*$/i;

function findBlockEnd(lines: string[], startIndex: number): number | null {
  for (let index = startIndex + 1; index < lines.length; index += 1) {
    if (lines[index].trim() === BLOCK_END_MARKER) return index;
  }
  return null;
}

function blockRecordId(lines: string[], startIndex: number, endIndex: number): string | null {
  for (let index = startIndex + 1; index < endIndex; index += 1) {
    const match = lines[index].match(RECORD_ID_RE);
    if (match) return match[1].trim();
  }
  return null;
}

/**
 * The only Record Foundation v2 mutation locator: stable recordId -> verified block range.
 * expectedStartIndex is merely a fast-path hint; it never acts as identity.
 */
export function resolveRecordBlockRangeById(
  lines: string[],
  recordId: string,
  expectedStartIndex?: number | null,
): ResolvedBlockRange {
  const expected = typeof expectedStartIndex === 'number' ? expectedStartIndex : null;
  if (expected !== null && expected >= 0 && lines[expected]?.trim() === BLOCK_START_MARKER) {
    const endIndex = findBlockEnd(lines, expected);
    if (endIndex === null) {
      throw createRecordConflictError('record_block_boundary_invalid', 'Record Block 边界已损坏，无法安全更新。');
    }
    if (blockRecordId(lines, expected, endIndex) === recordId) return { startIndex: expected, endIndex };
  }

  const matches: ResolvedBlockRange[] = [];
  for (let index = 0; index < lines.length; index += 1) {
    if (lines[index].trim() !== BLOCK_START_MARKER) continue;
    const endIndex = findBlockEnd(lines, index);
    if (endIndex === null) continue;
    if (blockRecordId(lines, index, endIndex) === recordId) matches.push({ startIndex: index, endIndex });
    index = endIndex;
  }

  if (matches.length === 1) return matches[0];
  if (matches.length > 1) {
    throw createRecordConflictError('record_id_duplicate', `记录ID ${recordId} 在同一文件中重复，拒绝猜测 mutation 目标。`);
  }
  throw createRecordConflictError('record_item_missing', `找不到记录ID ${recordId} 对应的 Record Block。`);
}
