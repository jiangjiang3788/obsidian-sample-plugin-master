import { normalizeDateStr } from '@/core/utils/date';
import {
  decodeMarkdownFieldValue,
  decodeUnknownMarkdownKvValue,
  encodeFieldValueForMarkdown,
  FIELD_CODEC_PRESETS,
  type FieldCodecDefinition,
} from './FieldValueCodec';
import type { RecordDraft } from '@/core/records/RecordDraft';
import { getRecordFieldContract, getRecordSchemaDefinition } from '@/core/records/schema';
import { TASK_FIELD_ORDER, TASK_SERIES_FIELD_ORDER } from './TaskCodecContract';
export interface ParsedRecordMetadata {
  recordId?: string;
  title: string;
  content: string;
  status?: string;
  date?: string;
  scheduledAt?: string;
  startAt?: string;
  endAt?: string;
  dueAt?: string;
  scheduledDate?: string;
  startDate?: string;
  dueDate?: string;
  completedAt?: string;
  cancelledAt?: string;
  skippedAt?: string;
  createdAt?: string;
  tags: string[];
  goalPath?: string;
  recordType?: string;
  recordSubtype?: string;
  extra: Record<string, string | number | boolean>;
  icon?: string;
  rating?: number;
  image?: string;
  priority?: 'lowest' | 'low' | 'medium' | 'high' | 'highest';
  importance?: 'important' | 'normal';
  urgency?: 'urgent' | 'normal';
  expectedDurationMinutes?: number;
  energyDemand?: string;
  brainDemand?: string;
  physicalDemand?: string;
  availabilityContexts?: Array<'any' | 'work' | 'home' | 'commute' | 'out'>;
  recoveryIntent?: boolean;
  seriesId?: string;
  recurrenceUnit?: 'day' | 'week' | 'month' | 'quarter' | 'year';
  recurrenceInterval?: number;
  recurrenceAnchor?: 'scheduled' | 'start' | 'due' | 'completion';
  seriesStartDate?: string;
  currentTaskId?: string;
  rolloverPolicy?: 'carry';
  taskId?: string;
  sessionStartedAt?: string;
  sessionEndedAt?: string;
  sessionDurationMinutes?: number;
  sessionResult?: 'work-block-ended' | 'task-completed';
  sessionSource?: 'timer' | 'energy-view' | 'timeline' | 'unknown';
  suggestedDurationMinutes?: number;
  startEnergyRecordId?: string;
  endEnergyRecordId?: string;
  energyDelta?: number;
  brainDelta?: number;
  physicalDelta?: number;
}
export interface RecordDocument {
  recordId: string;
  recordType: string;
  fields?: Record<string, unknown>;
}

function decodeMarkdownString(value: unknown, preset: FieldCodecDefinition = FIELD_CODEC_PRESETS.text): string | undefined {
  const decoded = decodeMarkdownFieldValue(value, preset);
  const encoded = encodeFieldValueForMarkdown(decoded, preset).trim();
  return encoded || undefined;
}

function decodeMarkdownNumber(value: unknown): number | undefined {
  const decoded = decodeMarkdownFieldValue(value, FIELD_CODEC_PRESETS.number);
  return typeof decoded === 'number' && Number.isFinite(decoded) ? decoded : undefined;
}

function normalizeMetaKey(key: unknown): string {
  return String(key ?? '').trim().toLowerCase();
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values.map(value => value.trim()).filter(Boolean)));
}

function buildTitle(content: string, tags: string[]): string {
  let title = '';
  const trimmed = content.trim();
  if (trimmed) title = trimmed.split(/\r?\n/)[0];
  else if (tags.length > 0) title = tags.join(', ');
  return title.replace(/^(?:\p{Extended_Pictographic}\uFE0F?\s*)+/u, '').trim().slice(0, 80);
}

function parseDate(value: string): string | undefined {
  const raw = value.trim();
  if (!raw) return undefined;
  return normalizeDateStr(raw) || raw;
}

function normalizeStoredDateTime(value: string): string | undefined {
  const raw = String(value || '').trim();
  if (!raw) return undefined;
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?$/.test(raw)) return raw.replace(' ', 'T');
  return raw;
}

export function formatRecordDateTimeForMarkdown(value: unknown): string {
  const raw = String(value ?? '').trim();
  if (!raw) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const naive = raw.match(/^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2})(?::\d{2}(?:\.\d+)?)?$/);
  if (naive) return `${naive[1]} ${naive[2]}`;
  const parsed = new Date(raw);
  if (!Number.isFinite(parsed.getTime())) return raw.replace('T', ' ');
  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, '0');
  const day = String(parsed.getDate()).padStart(2, '0');
  const hour = String(parsed.getHours()).padStart(2, '0');
  const minute = String(parsed.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day} ${hour}:${minute}`;
}

const TASK_READABLE_DATETIME_LABELS = new Set([
  '创建于', '计划时间', '开始时间', '结束时间', '截止时间', '完成于', '取消于', '跳过于',
]);

/** Record Block body -> canonical typed metadata. Only canonical Record Block fields are accepted here. */
export function decodeRecordContentLines(contentLines: string[], _parentFolder: string): ParsedRecordMetadata {
  let date: string | undefined;
  const tags: string[] = [];
  let goalPath: string | undefined;
  const extra: ParsedRecordMetadata['extra'] = {};
  let content = '';
  let contentStarted = false;
  let icon: string | undefined;
  let rating: number | undefined;
  let image: string | undefined;
  let recordType: string | undefined;
  let recordSubtype: string | undefined;
  let recordId: string | undefined;
  let status: string | undefined;
  let scheduledAt: string | undefined;
  let startAt: string | undefined;
  let endAt: string | undefined;
  let dueAt: string | undefined;
  let scheduledDate: string | undefined;
  let startDate: string | undefined;
  let dueDate: string | undefined;
  let completedAt: string | undefined;
  let cancelledAt: string | undefined;
  let skippedAt: string | undefined;
  let createdAt: string | undefined;
  let priority: ParsedRecordMetadata['priority'];
  let importance: ParsedRecordMetadata['importance'];
  let urgency: ParsedRecordMetadata['urgency'];
  let expectedDurationMinutes: number | undefined;
  let energyDemand: string | undefined;
  let brainDemand: string | undefined;
  let physicalDemand: string | undefined;
  let availabilityContexts: ParsedRecordMetadata['availabilityContexts'];
  let recoveryIntent: boolean | undefined;
  let seriesId: string | undefined;
  let recurrenceUnit: ParsedRecordMetadata['recurrenceUnit'];
  let recurrenceInterval: number | undefined;
  let recurrenceAnchor: ParsedRecordMetadata['recurrenceAnchor'];
  let seriesStartDate: string | undefined;
  let currentTaskId: string | undefined;
  let rolloverPolicy: ParsedRecordMetadata['rolloverPolicy'];
  let taskId: string | undefined;
  let sessionStartedAt: string | undefined;
  let sessionEndedAt: string | undefined;
  let sessionDurationMinutes: number | undefined;
  let sessionResult: ParsedRecordMetadata['sessionResult'];
  let sessionSource: ParsedRecordMetadata['sessionSource'];
  let suggestedDurationMinutes: number | undefined;
  let startEnergyRecordId: string | undefined;
  let endEnergyRecordId: string | undefined;
  let energyDelta: number | undefined;
  let brainDelta: number | undefined;
  let physicalDelta: number | undefined;

  // Discover the Record kind from the strict current-only envelope first.
  // Only ASCII double-colon is Record metadata; single-colon prose is never a field.
  const envelopeRecordType = contentLines
    .map((rawLine) => rawLine.trim().match(/^([^:\r\n]{1,64})::\s*(.*)$/))
    .find((match) => match && normalizeMetaKey(match[1]) === '记录类型')?.[2]?.trim();
  if (envelopeRecordType) recordType = envelopeRecordType;
  const recordSchema = getRecordSchemaDefinition(recordType);
  const supportsCustomFields = Boolean(recordSchema?.capabilities.customFields);
  const supportsBody = Boolean(recordSchema && getRecordFieldContract(recordSchema.recordType, '内容'));

  for (const rawLine of contentLines) {
    if (contentStarted) {
      content += (content ? '\n' : '') + rawLine;
      continue;
    }

    const line = rawLine.trim();
    const kv = line.match(/^([^:\r\n]{1,64})::\s*(.*)$/);
    if (kv) {
        const rawKey = kv[1].trim();
        const value = kv[2] || '';
        const key = normalizeMetaKey(rawKey);

        if (key === '记录id') recordId = value.trim() || undefined;
        else if (key === '记录子类型') recordSubtype = value.trim() || undefined;
        else if (key === '标签') tags.push(...(decodeMarkdownFieldValue(value, FIELD_CODEC_PRESETS.tags) as string[]));
        else if (key === '系列id') seriesId = value.trim();
        else if (key === '重复单位') {
          const unit = value.trim().toLowerCase();
          if (['day','week','month','quarter','year'].includes(unit)) recurrenceUnit = unit as ParsedRecordMetadata['recurrenceUnit'];
        }
        else if (key === '重复间隔') {
          const interval = Number.parseInt(value.trim(), 10);
          if (Number.isInteger(interval) && interval > 0) recurrenceInterval = interval;
        }
        else if (key === '重复锚点') {
          const anchor = value.trim().toLowerCase();
          if (['scheduled','start','due','completion'].includes(anchor)) recurrenceAnchor = anchor as ParsedRecordMetadata['recurrenceAnchor'];
        }
        else if (key === '系列开始日期') seriesStartDate = parseDate(value);
        else if (key === '当前任务id') currentTaskId = value.trim() || undefined;
        else if (key === '滚动策略') { if (value.trim().toLowerCase() === 'carry') rolloverPolicy = 'carry'; }
        else if (recordType === 'task-session' && key === '任务id') taskId = value.trim() || undefined;
        else if (recordType === 'task-session' && key === '开始于') sessionStartedAt = normalizeStoredDateTime(value);
        else if (recordType === 'task-session' && key === '结束于') sessionEndedAt = normalizeStoredDateTime(value);
        else if (recordType === 'task-session' && key === '时长') sessionDurationMinutes = decodeMarkdownNumber(value);
        else if (recordType === 'task-session' && key === '结果') {
          const result = value.trim().toLowerCase();
          if (['work-block-ended','task-completed'].includes(result)) sessionResult = result as ParsedRecordMetadata['sessionResult'];
        }
        else if (recordType === 'task-session' && key === '来源') {
          const source = value.trim().toLowerCase();
          if (['timer','energy-view','timeline','unknown'].includes(source)) sessionSource = source as ParsedRecordMetadata['sessionSource'];
        }
        else if (recordType === 'task-session' && key === '建议时长') suggestedDurationMinutes = decodeMarkdownNumber(value);
        else if (recordType === 'task-session' && key === '开始精力记录id') startEnergyRecordId = value.trim() || undefined;
        else if (recordType === 'task-session' && key === '结束精力记录id') endEnergyRecordId = value.trim() || undefined;
        else if (recordType === 'task-session' && key === '精力变化') energyDelta = decodeMarkdownNumber(value);
        else if (recordType === 'task-session' && key === '脑力变化') brainDelta = decodeMarkdownNumber(value);
        else if (recordType === 'task-session' && key === '体力变化') physicalDelta = decodeMarkdownNumber(value);
        else if (key === '记录类型') recordType = value.trim();
        else if (key === '状态') status = value.trim().toLowerCase();
        else if (key === '目标') goalPath = decodeMarkdownString(value, FIELD_CODEC_PRESETS.goalPath);
        else if (key === '日期') date = parseDate(value);
        else if (key === '计划时间') scheduledAt = normalizeStoredDateTime(value);
        else if (key === '开始时间') startAt = normalizeStoredDateTime(value);
        else if (key === '结束时间') endAt = normalizeStoredDateTime(value);
        else if (key === '截止时间') dueAt = normalizeStoredDateTime(value);
        else if (key === '计划日期') scheduledDate = parseDate(value);
        else if (key === '开始日期') startDate = parseDate(value);
        else if (key === '截止日期') dueDate = parseDate(value);
        else if (key === '创建于') createdAt = normalizeStoredDateTime(value);
        else if (key === '完成于') completedAt = normalizeStoredDateTime(value);
        else if (key === '取消于') cancelledAt = normalizeStoredDateTime(value);
        else if (key === '跳过于') skippedAt = normalizeStoredDateTime(value);
        else if (key === '优先级') {
          const p = value.trim().toLowerCase();
          if (['lowest','low','medium','high','highest'].includes(p)) priority = p as ParsedRecordMetadata['priority'];
        }
        else if (key === '重要程度') {
          const candidate = value.trim().toLowerCase();
          if (candidate === 'important' || candidate === 'normal') importance = candidate;
        }
        else if (key === '紧急程度') {
          const candidate = value.trim().toLowerCase();
          if (candidate === 'urgent' || candidate === 'normal') urgency = candidate;
        }
        else if (key === '预计时长') expectedDurationMinutes = decodeMarkdownNumber(value);
        else if (key === '精力要求') energyDemand = value.trim().toLowerCase() || undefined;
        else if (key === '脑力要求') brainDemand = value.trim().toLowerCase() || undefined;
        else if (key === '体力要求') physicalDemand = value.trim().toLowerCase() || undefined;
        else if (key === '可用场景') {
          const allowed = new Set(['any', 'work', 'home', 'commute', 'out']);
          const aliases: Record<string, string> = { '任意': 'any', '工作': 'work', '公司': 'work', '家': 'home', '居家': 'home', '通勤': 'commute', '外出': 'out' };
          const values = String(value || '').split(/[,，\n]/).map(part => part.trim()).filter(Boolean).map(part => aliases[part] || part.toLowerCase()).filter(part => allowed.has(part));
          availabilityContexts = Array.from(new Set(values)) as ParsedRecordMetadata['availabilityContexts'];
        }
        else if (key === '恢复意图') recoveryIntent = decodeMarkdownFieldValue(value, FIELD_CODEC_PRESETS.boolean) as boolean | undefined;
        else if (key === '评分') {
          const decodedRating = decodeMarkdownNumber(value);
          if (decodedRating !== undefined) rating = decodedRating;
          else {
            const visualRating = String(value || '').trim();
            if (visualRating) {
              extra[rawKey] = decodeUnknownMarkdownKvValue(visualRating);
              if (!image) image = visualRating;
            }
          }
        }
        else if (key === '图标') icon = value.trim();
        else if (key === '图片') image = decodeMarkdownString(value, FIELD_CODEC_PRESETS.image);
        else if (key === '内容') {
          if (supportsBody) {
            contentStarted = true;
            content = value;
          }
        }
        else if (supportsCustomFields) extra[rawKey] = decodeUnknownMarkdownKvValue(value);
    } else {
      // Current-only grammar does not guess metadata or body from arbitrary prose. A body starts only
      // at the schema-owned 内容:: marker. This is what prevents '晚上：...' and
      // '7:30 ...' from becoming fields.
      continue;
    }
  }

  const finalTags = unique(tags);
  return {
    recordId, title: buildTitle(content, finalTags), content: content.trim(),
    status, date, scheduledAt, startAt, endAt, dueAt, scheduledDate, startDate, dueDate,
    completedAt, cancelledAt, skippedAt, createdAt, tags: finalTags, goalPath,
    recordType, recordSubtype, extra, icon, rating, image, priority, importance, urgency, expectedDurationMinutes, energyDemand, brainDemand, physicalDemand, availabilityContexts, recoveryIntent, seriesId,
    recurrenceUnit, recurrenceInterval, recurrenceAnchor, seriesStartDate, currentTaskId, rolloverPolicy,
    taskId, sessionStartedAt, sessionEndedAt, sessionDurationMinutes, sessionResult, sessionSource,
    suggestedDurationMinutes, startEnergyRecordId, endEnergyRecordId, energyDelta, brainDelta, physicalDelta,
  };
}

function markdownScalar(value: unknown): string {
  if (value == null) return '';
  if (Array.isArray(value)) return value.map(v => String(v).trim()).filter(Boolean).join(', ');
  if (typeof value === 'object') return '';
  return String(value).trim();
}

const TASK_SESSION_FIELD_ORDER: Array<[string, string[]]> = [
  ['任务ID', ['任务ID','taskId']], ['系列ID', ['系列ID','seriesId']],
  ['目标', ['目标','goalPath']],
  ['开始于', ['开始于','sessionStartedAt']], ['结束于', ['结束于','sessionEndedAt']],
  ['时长', ['时长','sessionDurationMinutes']], ['结果', ['结果','sessionResult']], ['来源', ['来源','sessionSource']],
  ['建议时长', ['建议时长','suggestedDurationMinutes']], ['开始精力记录ID', ['开始精力记录ID','startEnergyRecordId']],
  ['结束精力记录ID', ['结束精力记录ID','endEnergyRecordId']], ['精力变化', ['精力变化','energyDelta']],
  ['脑力变化', ['脑力变化','brainDelta']], ['体力变化', ['体力变化','physicalDelta']],
];

function firstValue(fields: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const value = markdownScalar(fields[key]);
    if (value) return value;
  }
  return '';
}

const BODY_FIELD_ALIASES = ['内容', 'content', '正文', 'title', '任务内容', '阻碍', '里程碑'];

function bodyValue(fields: Record<string, unknown>): string {
  for (const key of BODY_FIELD_ALIASES) {
    const value = fields[key];
    if (value === undefined || value === null) continue;
    if (typeof value === 'object') continue;
    return String(value).replace(/\r\n/g, '\n').trim();
  }
  return '';
}

function emitBody(lines: string[], body: string): void {
  if (!body) return;
  const parts = body.split('\n');
  lines.push(`内容:: ${parts.shift() || ''}`);
  lines.push(...parts);
}

/** Canonical Record encoder. Custom metadata is emitted before an optional terminal body. */
export function encodeRecordBlock(document: RecordDocument): string {
  const fields = document.fields || {};
  const lines = ['<!-- start -->', `记录ID:: ${document.recordId}`, `记录类型:: ${document.recordType}`];
  const emitted = new Set<string>();

  if (document.recordType === 'task') {
    for (const [label, keys] of TASK_FIELD_ORDER) {
      let value = firstValue(fields, keys);
      if (label === '状态' && !value) value = 'open';
      if (label === '创建于' && !value) value = new Date().toISOString();
      if (value && TASK_READABLE_DATETIME_LABELS.has(label)) value = formatRecordDateTimeForMarkdown(value);
      if (value) { lines.push(`${label}:: ${value}`); keys.forEach(key => emitted.add(key)); }
    }
    for (const [key, raw] of Object.entries(fields)) {
      if (emitted.has(key) || BODY_FIELD_ALIASES.includes(key) || ['记录ID','recordId','id','记录类型','recordType'].includes(key)) continue;
      const value = markdownScalar(raw);
      if (value) lines.push(`${key}:: ${value}`);
    }
    emitBody(lines, bodyValue(fields));
  } else if (document.recordType === 'task-session') {
    for (const [label, keys] of TASK_SESSION_FIELD_ORDER) {
      const value = firstValue(fields, keys);
      if (value) lines.push(`${label}:: ${value}`);
    }
  } else if (document.recordType === 'task-series') {
    for (const [label, keys] of TASK_SERIES_FIELD_ORDER) {
      let value = firstValue(fields, keys);
      if (label === '状态' && !value) value = 'active';
      if (label === '重复间隔' && !value) value = '1';
      if (label === '重复锚点' && !value) value = 'scheduled';
      if (label === '滚动策略' && !value) value = 'carry';
      if (value) lines.push(`${label}:: ${value}`);
    }
    emitBody(lines, bodyValue(fields));
  } else {
    const schema = getRecordSchemaDefinition(document.recordType);
    const supportsBody = Boolean(schema && getRecordFieldContract(schema.recordType, '内容'));
    for (const [key, raw] of Object.entries(fields)) {
      if (supportsBody && BODY_FIELD_ALIASES.includes(key)) continue;
      if (['记录ID','recordId','id','记录类型','recordType'].includes(key)) continue;
      const value = markdownScalar(raw);
      if (value) lines.push(`${key}:: ${value}`);
    }
    if (supportsBody) emitBody(lines, bodyValue(fields));
  }

  lines.push('<!-- end -->');
  return lines.join('\n');
}

/** Canonical R4 writer for a schema-filtered RecordDraft. */
export function encodeRecordDraft(input: { recordId: string; draft: RecordDraft }): string {
  return encodeRecordBlock({
    recordId: input.recordId,
    recordType: input.draft.recordType,
    fields: input.draft.fields,
  });
}

/** Adds/replaces the universal envelope in an existing Record Block. */
export function ensureRecordEnvelope(markdown: string, input: { recordId: string; recordType: string }): string {
  const trimmed = markdown.trim();
  const lines = trimmed.split(/\r?\n/);
  if (lines[0]?.trim() !== '<!-- start -->' || lines[lines.length - 1]?.trim() !== '<!-- end -->') {
    throw new Error('只允许写入笔记记录块。');
  }
  const body = lines.slice(1, -1).filter(line => !/^\s*(?:记录ID|记录类型)\s*::/.test(line));
  return ['<!-- start -->', `记录ID:: ${input.recordId}`, `记录类型:: ${input.recordType}`, ...body, '<!-- end -->'].join('\n');
}
