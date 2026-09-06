import type { VaultPort } from '@core/ports/VaultPort';

export interface AppendUnderHeaderOptions {
  signal?: AbortSignal;
  throwIfAborted?: (signal?: AbortSignal) => void;
}

interface RecordMarkdownSortKey {
  primary: number;
  fallback: number;
}

const CROCKFORD = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
const RECORD_START = '<!-- start -->';
const RECORD_END = '<!-- end -->';

function checkAbort(options: AppendUnderHeaderOptions): void {
  if (options.throwIfAborted) {
    options.throwIfAborted(options.signal);
    return;
  }
  if (options.signal?.aborted) {
    const error = new Error('AbortError');
    error.name = 'AbortError';
    throw error;
  }
}

function readRecordMetadata(markdown: string): Map<string, string> {
  const result = new Map<string, string>();
  for (const line of String(markdown || '').split(/\r?\n/)) {
    const match = line.match(/^\s*([^:\n]+?)\s*::\s*(.*)$/);
    if (!match) continue;
    result.set(match[1].trim(), match[2].trim());
  }
  return result;
}

function parseMarkdownTime(raw: string | undefined): number | null {
  const value = String(raw || '').trim();
  if (!value) return null;
  const dateOnly = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (dateOnly) {
    const [, year, month, day] = dateOnly;
    return Date.UTC(Number(year), Number(month) - 1, Number(day));
  }
  const simpleDateTime = value.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?$/);
  if (simpleDateTime) {
    const [, year, month, day, hour, minute, second = '0'] = simpleDateTime;
    return Date.UTC(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute), Number(second));
  }
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function readUlidTime(recordId: string | undefined): number {
  const raw = String(recordId || '').split('.').pop()?.toUpperCase() || '';
  if (raw.length < 10) return 0;
  let value = 0;
  for (const char of raw.slice(0, 10)) {
    const digit = CROCKFORD.indexOf(char);
    if (digit < 0) return 0;
    value = value * 32 + digit;
  }
  return value;
}

function resolveRecordSortLabels(recordType: string): string[] {
  if (recordType === 'task-session') return ['结束于', '开始于'];
  if (recordType === 'task') {
    return ['完成于', '取消于', '跳过于', '结束时间', '开始时间', '计划时间', '计划日期', '开始日期', '截止时间', '截止日期', '创建于'];
  }
  if (recordType === 'task-series') return ['系列开始日期'];
  if (recordType === 'energy') return ['日期', '时间'];
  return ['日期'];
}

/**
 * Canonical Markdown ordering key for persisted Records.
 *
 * Primary ordering follows the Record's semantic occurrence/completion date. Stable Record ID time
 * is the fallback and tie-breaker, so same-day records remain deterministic across restarts.
 */
export function resolveRecordMarkdownSortKey(markdown: string): RecordMarkdownSortKey | null {
  const metadata = readRecordMetadata(markdown);
  const recordId = metadata.get('记录ID');
  const recordType = metadata.get('记录类型') || '';
  if (!recordId || !recordType) return null;

  const fallback = readUlidTime(recordId);
  let primary: number | null = null;
  for (const label of resolveRecordSortLabels(recordType)) {
    primary = parseMarkdownTime(metadata.get(label));
    if (primary != null) break;
  }
  return { primary: primary ?? fallback, fallback };
}

function compareSortKey(left: RecordMarkdownSortKey, right: RecordMarkdownSortKey): number {
  if (left.primary !== right.primary) return left.primary - right.primary;
  return left.fallback - right.fallback;
}

function findRecordBlockEnd(lines: string[], startIndex: number, limit: number): number {
  for (let index = startIndex; index < limit; index += 1) {
    if (lines[index].trim() === RECORD_END) return index;
  }
  return -1;
}

function ensureBlankLineBefore(lines: string[], index: number): number {
  if (index > 0 && lines[index - 1]?.trim() !== '') {
    lines.splice(index, 0, '');
    return index + 1;
  }
  return index;
}

function insertPayload(lines: string[], index: number, payload: string): void {
  let insertAt = ensureBlankLineBefore(lines, index);
  const payloadLines = payload.replace(/\r\n/g, '\n').split('\n');
  lines.splice(insertAt, 0, ...payloadLines);
  insertAt += payloadLines.length;
  if (insertAt < lines.length && lines[insertAt]?.trim() !== '') lines.splice(insertAt, 0, '');
}

/** Pure text helper used by both direct writes and multi-record transactions. */
export function appendUnderHeaderText(text: string, header: string, payload: string): string {
  const esc = header.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`^${esc}\\s*$`);
  const lines = String(text || '').split('\n');

  let headerLineIndex = lines.findIndex((line) => regex.test(line));
  if (headerLineIndex === -1) {
    if (lines.length && lines[lines.length - 1].trim() !== '') lines.push('');
    lines.push(header, '');
    headerLineIndex = lines.length - 2;
  }

  let sectionEndIndex = lines.length;
  const headerLevel = header.match(/^(#+)\s/)?.[1].length || 0;
  for (let index = headerLineIndex + 1; index < lines.length; index += 1) {
    const match = lines[index].match(/^(#+)\s/);
    if (match && match[1].length <= headerLevel) {
      sectionEndIndex = index;
      break;
    }
  }

  const incomingKey = resolveRecordMarkdownSortKey(payload);
  if (!incomingKey) {
    insertPayload(lines, sectionEndIndex, payload);
    return lines.join('\n');
  }

  // Records under Goal headings are maintained newest -> oldest. Hand-written prose before the first
  // Record remains untouched. If legacy data is already sorted, this is O(section size) and avoids a
  // whole-file rewrite/re-sort on each capture.
  let insertionIndex = sectionEndIndex;
  let lastRecordEnd = -1;
  for (let index = headerLineIndex + 1; index < sectionEndIndex; index += 1) {
    if (lines[index].trim() !== RECORD_START) continue;
    const endIndex = findRecordBlockEnd(lines, index, sectionEndIndex);
    if (endIndex < 0) break;
    const currentBlock = lines.slice(index, endIndex + 1).join('\n');
    const currentKey = resolveRecordMarkdownSortKey(currentBlock);
    if (currentKey && compareSortKey(incomingKey, currentKey) > 0) {
      insertionIndex = index;
      break;
    }
    lastRecordEnd = endIndex;
    index = endIndex;
  }

  if (insertionIndex === sectionEndIndex && lastRecordEnd >= 0) insertionIndex = lastRecordEnd + 1;
  insertPayload(lines, insertionIndex, payload);
  return lines.join('\n');
}

export async function appendUnderHeader(
  vault: Pick<VaultPort, 'readFile' | 'writeFile'>,
  filePath: string,
  header: string,
  payload: string,
  options: AppendUnderHeaderOptions = {},
): Promise<void> {
  const text = (await vault.readFile(filePath)) ?? '';
  checkAbort(options);
  const next = appendUnderHeaderText(text, header, payload);
  checkAbort(options);
  await vault.writeFile(filePath, next);
}
