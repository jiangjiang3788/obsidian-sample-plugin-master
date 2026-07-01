/**
 * Task-line mutation helpers.
 *
 * Record update may replace a rendered task line with a template output. The
 * template output is not guaranteed to contain all source-line metadata, so the
 * write layer must preserve unknown task context tokens instead of silently
 * dropping them during edit/convert workflows.
 */

export type TaskContextTokenKind = 'tag' | 'emoji-date' | 'recurrence' | 'kv' | 'literal';

export interface TaskContextTokenIdentity {
  kind: TaskContextTokenKind;
  key: string;
}

function uniqPreserveOrder(values: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    const cleaned = value.trim();
    if (!cleaned || seen.has(cleaned)) continue;
    seen.add(cleaned);
    result.push(cleaned);
  }
  return result;
}

export function extractTaskContextTokens(line: string): string[] {
  const source = String(line || '');
  const tokens: string[] = [];

  for (const match of source.matchAll(/#[\p{L}\p{N}_-]+/gu)) tokens.push(match[0]);
  for (const match of source.matchAll(/[📅⏳🛫➕✅❌]\s*\d{4}[-/]\d{2}[-/]\d{2}/gu)) tokens.push(match[0]);
  for (const match of source.matchAll(/🔁\s*every\s+(?:\d+\s+)?(?:day|week|month|year)s?(?:\s+when\s+done)?/giu)) tokens.push(match[0]);
  for (const match of source.matchAll(/[\(\[][^\[\]()]*::[^\)\]]*[\)\]]/g)) tokens.push(match[0]);

  return uniqPreserveOrder(tokens);
}

export function getTaskContextTokenIdentity(token: string): TaskContextTokenIdentity {
  const trimmed = token.trim();
  if (trimmed.startsWith('#')) return { kind: 'tag', key: trimmed };
  const emoji = trimmed.match(/^([📅⏳🛫➕✅❌])/u)?.[1];
  if (emoji) return { kind: 'emoji-date', key: emoji };
  if (/^🔁/u.test(trimmed)) return { kind: 'recurrence', key: '🔁' };
  const kv = trimmed.match(/^[\(\[]\s*([^:\]\)]+?)\s*::/);
  if (kv?.[1]) return { kind: 'kv', key: kv[1].trim() };
  return { kind: 'literal', key: trimmed };
}

export function taskLineContainsTokenIdentity(line: string, token: string): boolean {
  const identity = getTaskContextTokenIdentity(token);
  if (identity.kind === 'tag' || identity.kind === 'literal') return line.includes(identity.key);
  if (identity.kind === 'emoji-date' || identity.kind === 'recurrence') return line.includes(identity.key);
  if (identity.kind === 'kv') {
    const escaped = identity.key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`[\\(\\[]\\s*${escaped}\\s*::`).test(line);
  }
  return false;
}

export function preserveTaskCheckboxStatus(originalLine: string, nextLine: string): string {
  const original = originalLine.match(/^(\s*[-*]\s*\[)([ xX-])(\]\s*)/);
  const next = nextLine.match(/^(\s*[-*]\s*\[)([ xX-])(\]\s*)/);
  if (!original || !next) return nextLine;
  if (original[2] === next[2]) return nextLine;
  return nextLine.replace(/^(\s*[-*]\s*\[)[ xX-](\]\s*)/, `$1${original[2]}$2`);
}

export function mergeTaskLinePreservingSourceContext(originalLine: string, renderedText: string): string {
  const nextLines = renderedText.split(/\r?\n/);
  if (nextLines.length !== 1) return renderedText;

  let nextLine = preserveTaskCheckboxStatus(originalLine, nextLines[0]);
  const tokensToAppend = extractTaskContextTokens(originalLine)
    .filter((token) => !taskLineContainsTokenIdentity(nextLine, token));

  if (!tokensToAppend.length) return nextLine;
  return `${nextLine.trimEnd()} ${tokensToAppend.join(' ')}`.trimEnd();
}
