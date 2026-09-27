import type { RecordType } from '@/core/records/schema/types';
import { renderTemplate } from '@/core/utils/templateUtils';

function unwrapScalar(value: unknown): unknown {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const row = value as Record<string, unknown>;
    return row.value ?? row.id ?? row.label ?? '';
  }
  return value;
}

function readYear(value: unknown): number | null {
  const scalar = unwrapScalar(value);
  if (scalar instanceof Date && Number.isFinite(scalar.getTime())) return scalar.getFullYear();
  const text = String(scalar ?? '').trim();
  if (!text) return null;

  // Most persisted record dates start with the local calendar year. Read that
  // directly so YYYY-MM-DD values do not acquire UTC/local-time surprises.
  const direct = text.match(/^(\d{4})(?:[-/.]|$)/);
  if (direct) {
    const year = Number(direct[1]);
    if (year >= 1 && year <= 9999) return year;
  }

  const normalized = text.includes(' ') && !text.includes('T') ? text.replace(' ', 'T') : text;
  const parsed = new Date(normalized);
  return Number.isFinite(parsed.getTime()) ? parsed.getFullYear() : null;
}

function firstField(fields: Record<string, unknown>, keys: readonly string[]): unknown {
  for (const key of keys) {
    const value = fields[key];
    if (value !== undefined && value !== null && String(unwrapScalar(value) ?? '').trim()) return value;
  }
  return undefined;
}

function dateCandidatesFor(recordType: RecordType, fields: Record<string, unknown>): unknown[] {
  if (recordType === 'task') {
    const status = String(firstField(fields, ['status', '状态']) ?? '').trim().toLowerCase();
    if (status === 'done') {
      return [
        firstField(fields, ['completedAt', '完成于']),
        firstField(fields, ['endAt', '结束时间']),
        firstField(fields, ['startAt', '开始时间']),
        firstField(fields, ['scheduledAt', '计划时间', 'scheduledDate', '计划日期']),
        firstField(fields, ['dueAt', '截止时间', 'dueDate', '截止日期']),
        firstField(fields, ['createdAt', '创建于']),
      ];
    }
    if (status === 'cancelled') {
      return [
        firstField(fields, ['cancelledAt', '取消于']),
        firstField(fields, ['scheduledAt', '计划时间', 'scheduledDate', '计划日期']),
        firstField(fields, ['dueAt', '截止时间', 'dueDate', '截止日期']),
        firstField(fields, ['createdAt', '创建于']),
      ];
    }
    if (status === 'skipped') {
      return [
        firstField(fields, ['skippedAt', '跳过于']),
        firstField(fields, ['scheduledAt', '计划时间', 'scheduledDate', '计划日期']),
        firstField(fields, ['dueAt', '截止时间', 'dueDate', '截止日期']),
        firstField(fields, ['createdAt', '创建于']),
      ];
    }
    return [
      firstField(fields, ['scheduledAt', '计划时间', 'scheduledDate', '计划日期']),
      firstField(fields, ['startAt', '开始时间', 'startDate', '开始日期']),
      firstField(fields, ['dueAt', '截止时间', 'dueDate', '截止日期']),
      firstField(fields, ['createdAt', '创建于']),
    ];
  }

  if (recordType === 'task-session') {
    return [
      firstField(fields, ['sessionEndedAt', '结束于']),
      firstField(fields, ['sessionStartedAt', '开始于']),
    ];
  }

  if (recordType === 'task-series') {
    return [firstField(fields, ['seriesStartDate', '系列开始日期'])];
  }

  if (recordType === 'energy') {
    return [
      firstField(fields, ['日期', 'date']),
      firstField(fields, ['记录时间', 'recordedAt']),
    ];
  }

  return [firstField(fields, ['日期', 'date'])];
}

export function resolveRecordStorageYear(
  recordType: RecordType,
  fields: Record<string, unknown>,
  fallbackDate: Date = new Date(),
): number {
  for (const candidate of dateCandidatesFor(recordType, fields)) {
    const year = readYear(candidate);
    if (year != null) return year;
  }
  return fallbackDate.getFullYear();
}

/**
 * Normalize only path syntax. Do not rewrite the user's configured taxonomy.
 *
 * `targetFile` is a path template and therefore the authority for where a
 * Record is stored. Runtime code may render explicit variables such as
 * `{{year}}`, but it must not silently insert/replace folders or filenames.
 */
export function normalizeRecordTargetPath(targetFilePath: string): string {
  return String(targetFilePath || '')
    .trim()
    .replace(/\\/g, '/')
    .replace(/\/{2,}/g, '/')
    .replace(/^\/+|\/+$/g, '');
}

/**
 * Build the reserved variables available to a Record target-file template.
 *
 * `year` means the Record's business/storage year, not blindly the current
 * clock year. Existing date precedence remains unchanged so historical input
 * and recurring Tasks resolve the year from their own facts.
 */
export function buildRecordTargetTemplateData(
  recordType: RecordType,
  fields: Record<string, unknown>,
  renderData: Record<string, unknown> = fields,
  fallbackDate: Date = new Date(),
): Record<string, unknown> {
  const rawGoalPath = String(
    fields.goalPath
      ?? fields['目标']
      ?? renderData.goalPath
      ?? renderData['目标']
      ?? '',
  ).trim();
  const goalParts = rawGoalPath.split('/').map((part) => part.trim()).filter(Boolean);
  const goal = goalParts.length
    ? {
      title: goalParts[goalParts.length - 1],
      path: rawGoalPath,
      root: goalParts[0],
      leaf: goalParts[goalParts.length - 1],
    }
    : { title: '', path: '', root: '', leaf: '' };

  return {
    ...fields,
    ...renderData,
    goal,
    goalPath: rawGoalPath,
    rootGoal: goal.root,
    leafGoal: goal.leaf,
    recordType,
    year: resolveRecordStorageYear(recordType, fields, fallbackDate),
  };
}

/**
 * Resolve one configured target-file template into the physical path.
 *
 * Examples:
 *   01/打卡.md              -> 01/打卡.md
 *   01/{{year}}/打卡.md     -> 01/2026/打卡.md
 *   01/2025/打卡.md         -> 01/2025/打卡.md
 *
 * There is deliberately no implicit year partitioning here. The configured
 * template is the source of truth; only variables explicitly present in that
 * template may change the resulting path.
 */
export function resolveRecordTargetPath(
  targetFileTemplate: string,
  recordType: RecordType,
  fields: Record<string, unknown>,
  renderData: Record<string, unknown> = fields,
  fallbackDate: Date = new Date(),
): string {
  const templateData = buildRecordTargetTemplateData(recordType, fields, renderData, fallbackDate);
  return normalizeRecordTargetPath(renderTemplate(targetFileTemplate, templateData));
}
