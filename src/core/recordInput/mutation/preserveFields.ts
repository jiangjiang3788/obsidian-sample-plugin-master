import type { RecordCaptureTemplate } from '@/core/recordInput/CaptureTemplate';

const FIELD_LINE = /^\s*([^:\r\n]{1,64})::\s*(.*)$/;
const PROTECTED_FACTS = new Set(['创建于', '完成于', '取消于', '跳过于']);
const ENVELOPE = new Set(['记录id', '记录类型', '记录版本']);
const BODY_START = /^\s*内容::/;
const BODY_NAMES = new Set(['内容', 'content', '正文', '任务内容', 'body']);

function keyOf(value: unknown): string {
  return String(value ?? '').trim().toLowerCase();
}

function metadataLines(block: string): string[] {
  const lines = block.split(/\r?\n/);
  const end = lines.findIndex((line, index) => index > 0 && (BODY_START.test(line) || line.trim() === '<!-- end -->'));
  return lines.slice(1, end >= 0 ? end : lines.length);
}

/** Exact stored creation date, not a newly generated edit-time timestamp. */
export function originalRecordCreatedAt(block: string): string | undefined {
  const line = metadataLines(block).find((value) => keyOf(value.match(FIELD_LINE)?.[1]) === '创建于');
  return line?.match(FIELD_LINE)?.[2]?.trim() || undefined;
}

/**
 * Edit forms are projections, not a complete representation of a Markdown Record.
 * Retain unknown/hidden KV lines verbatim, while letting explicitly editable
 * fields be updated or intentionally cleared by the form's new encoded block.
 */
export function preserveRecordMetadataOnEdit(
  originalBlock: string,
  replacementBlock: string,
  template: Pick<RecordCaptureTemplate, 'fields'>,
): string {
  const next = replacementBlock.split(/\r?\n/);
  const newLabels = new Map<string, number>();
  const nextEnd = next.findIndex((line, index) => index > 0 && (BODY_START.test(line) || line.trim() === '<!-- end -->'));
  const metadataEnd = nextEnd < 0 ? next.length : nextEnd;
  for (let index = 1; index < metadataEnd; index += 1) {
    const match = next[index].match(FIELD_LINE);
    if (match) newLabels.set(keyOf(match[1]), index);
  }

  const editable = new Set<string>();
  for (const field of template.fields || []) {
    for (const token of [field.key, field.label, field.storage?.markdownKey, ...(field.aliases || []), ...(field.storage?.aliases || [])]) {
      if (token) editable.add(keyOf(token));
    }
  }

  const preserve: string[] = [];
  for (const oldLine of metadataLines(originalBlock)) {
    const match = oldLine.match(FIELD_LINE);
    if (!match) continue;
    const key = keyOf(match[1]);
    if (ENVELOPE.has(key)) continue;
    if (PROTECTED_FACTS.has(match[1].trim())) {
      const existingIndex = newLabels.get(key);
      if (existingIndex !== undefined) next[existingIndex] = oldLine;
      else preserve.push(oldLine);
      continue;
    }
    if (!newLabels.has(key) && !editable.has(key)) preserve.push(oldLine);
  }
  next.splice(metadataEnd, 0, ...preserve);

  // Removing a body field from the current template must not erase existing prose.
  // Explicitly clearing a body field that is still in the template remains allowed.
  const bodyEditable = (template.fields || []).some(field => field.semantic === 'body'
    || [field.key, field.label].some(value => BODY_NAMES.has(String(value || ''))));
  if (!bodyEditable && !next.some(line => BODY_START.test(line))) {
    const oldLines = originalBlock.split(/\r?\n/);
    const oldBodyStart = oldLines.findIndex(line => BODY_START.test(line));
    if (oldBodyStart >= 0) {
      const oldEnd = oldLines.findIndex((line, index) => index > oldBodyStart && line.trim() === '<!-- end -->');
      if (oldEnd > oldBodyStart) {
        const newEnd = next.findIndex(line => line.trim() === '<!-- end -->');
        if (newEnd >= 0) next.splice(newEnd, 0, ...oldLines.slice(oldBodyStart, oldEnd));
      }
    }
  }
  return next.join('\n');
}
