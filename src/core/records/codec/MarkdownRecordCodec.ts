import { normalizeDateStr } from '@/core/utils/date';
import {
  decodeMarkdownFieldValue,
  decodeUnknownMarkdownKvValue,
  encodeFieldValueForMarkdown,
  FIELD_CODEC_PRESETS,
  type FieldCodecDefinition,
} from './FieldValueCodec';
import { RECORD_SCHEMA_VERSION } from '@/core/records/RecordId';
import type { RecordDraft } from '@/core/records/RecordDraft';
import { getRecordFieldContract, getRecordSchemaDefinition } from '@/core/records/schema';

export interface ParsedRecordMetadata {
  recordId?: string;
  schemaVersion?: number;
  title: string;
  content: string;
  categoryKey: string;
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
  goalId?: string;
  cycleId?: string;
  coreBlock?: string;
  recordSubtype?: string;
  extra: Record<string, string | number | boolean>;
  icon?: string;
  period?: string;
  rating?: number;
  image?: string;
  pintu?: string;
  theme?: string;
  templateId?: string;
  templateSourceType?: 'core-block' | 'goal-template';
  priority?: 'lowest' | 'low' | 'medium' | 'high' | 'highest';
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
  sessionSource?: 'timer' | 'energy-view' | 'unknown';
  suggestedDurationMinutes?: number;
  startEnergyRecordId?: string;
  endEnergyRecordId?: string;
  energyDelta?: number;
  brainDelta?: number;
  physicalDelta?: number;
}

export interface RecordDocument {
  recordId: string;
  schemaVersion?: number;
  coreBlock: string;
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
  let categoryKey: string | null = null;
  let date: string | undefined;
  const tags: string[] = [];
  let goalPath: string | undefined;
  const extra: ParsedRecordMetadata['extra'] = {};
  let content = '';
  let contentStarted = false;
  let icon: string | undefined;
  let period: string | undefined;
  let rating: number | undefined;
  let image: string | undefined;
  let pintu: string | undefined;
  let theme: string | undefined;
  let templateId: string | undefined;
  let goalId: string | undefined;
  let cycleId: string | undefined;
  let coreBlock: string | undefined;
  let recordSubtype: string | undefined;
  let recordId: string | undefined;
  let schemaVersion: number | undefined;
  let status: string | undefined;
  let templateSourceType: 'core-block' | 'goal-template' | undefined;
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

  // Grammar V5: discover the Record kind from the strict envelope first.
  // Only ASCII double-colon is Record metadata; single-colon prose is never a field.
  const envelopeCoreBlock = contentLines
    .map((rawLine) => rawLine.trim().match(/^([^:\r\n]{1,64})::\s*(.*)$/))
    .find((match) => match && ['核心block', 'coreblock'].includes(normalizeMetaKey(match[1])))?.[2]?.trim();
  if (envelopeCoreBlock) coreBlock = envelopeCoreBlock;
  const recordSchema = getRecordSchemaDefinition(coreBlock);
  const supportsCustomFields = Boolean(recordSchema?.capabilities.customFields);
  const supportsBody = Boolean(recordSchema && getRecordFieldContract(recordSchema.coreBlock, '内容'));

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

        if (['记录id', 'recordid'].includes(key)) recordId = value.trim() || undefined;
        else if (['记录版本', 'recordversion', 'schemaversion'].includes(key)) {
          const parsed = Number.parseInt(value.trim(), 10);
          if (Number.isFinite(parsed)) schemaVersion = parsed;
        }
        else if (['分类', '类别', 'category', 'categorypath', '分类路径'].includes(key)) categoryKey = decodeMarkdownString(value, FIELD_CODEC_PRESETS.categoryPath) || '';
        else if (['记录子类型', 'recordsubtype', 'subtype'].includes(key)) recordSubtype = value.trim() || undefined;
        else if (['模板id', 'templateid'].includes(key)) templateId = value.trim();
        else if (['模板来源', 'templatesource', 'templatesourcetype'].includes(key)) {
          const source = value.trim();
          if (['core-block', 'goal-template'].includes(source)) templateSourceType = source as any;
        }
        else if (['主题', 'theme', '主题路径', 'themepath'].includes(key)) theme = decodeMarkdownString(value, FIELD_CODEC_PRESETS.themePath);
        else if (['标签', 'tag', 'tags'].includes(key)) tags.push(...(decodeMarkdownFieldValue(value, FIELD_CODEC_PRESETS.tags) as string[]));
        else if (['目标id', 'goalid'].includes(key)) goalId = value.trim();
        else if (['周期id', 'cycleid'].includes(key)) cycleId = value.trim();
        else if (['系列id', 'seriesid'].includes(key)) seriesId = value.trim();
        else if (['重复单位', 'recurrenceunit'].includes(key)) {
          const unit = value.trim().toLowerCase();
          if (['day','week','month','quarter','year'].includes(unit)) recurrenceUnit = unit as ParsedRecordMetadata['recurrenceUnit'];
        }
        else if (['重复间隔', 'recurrenceinterval'].includes(key)) {
          const interval = Number.parseInt(value.trim(), 10);
          if (Number.isInteger(interval) && interval > 0) recurrenceInterval = interval;
        }
        else if (['重复锚点', 'recurrenceanchor'].includes(key)) {
          const anchor = value.trim().toLowerCase();
          if (['scheduled','start','due','completion'].includes(anchor)) recurrenceAnchor = anchor as ParsedRecordMetadata['recurrenceAnchor'];
        }
        else if (['系列开始日期', 'seriesstartdate'].includes(key)) seriesStartDate = parseDate(value);
        else if (['当前任务id', 'currenttaskid'].includes(key)) currentTaskId = value.trim() || undefined;
        else if (['滚动策略', 'rolloverpolicy'].includes(key)) { if (value.trim().toLowerCase() === 'carry') rolloverPolicy = 'carry'; }
        else if (coreBlock === 'task-session' && ['任务id', 'taskid'].includes(key)) taskId = value.trim() || undefined;
        else if (coreBlock === 'task-session' && ['开始于', 'sessionstartedat'].includes(key)) sessionStartedAt = normalizeStoredDateTime(value);
        else if (coreBlock === 'task-session' && ['结束于', 'sessionendedat'].includes(key)) sessionEndedAt = normalizeStoredDateTime(value);
        else if (coreBlock === 'task-session' && ['时长', 'sessiondurationminutes'].includes(key)) sessionDurationMinutes = decodeMarkdownNumber(value);
        else if (coreBlock === 'task-session' && ['结果', 'sessionresult'].includes(key)) {
          const result = value.trim().toLowerCase();
          if (['work-block-ended','task-completed'].includes(result)) sessionResult = result as ParsedRecordMetadata['sessionResult'];
        }
        else if (coreBlock === 'task-session' && ['来源', 'sessionsource'].includes(key)) {
          const source = value.trim().toLowerCase();
          if (['timer','energy-view','unknown'].includes(source)) sessionSource = source as ParsedRecordMetadata['sessionSource'];
        }
        else if (coreBlock === 'task-session' && ['建议时长', 'suggesteddurationminutes'].includes(key)) suggestedDurationMinutes = decodeMarkdownNumber(value);
        else if (coreBlock === 'task-session' && ['开始精力记录id', 'startenergyrecordid'].includes(key)) startEnergyRecordId = value.trim() || undefined;
        else if (coreBlock === 'task-session' && ['结束精力记录id', 'endenergyrecordid'].includes(key)) endEnergyRecordId = value.trim() || undefined;
        else if (coreBlock === 'task-session' && ['精力变化', 'energydelta'].includes(key)) energyDelta = decodeMarkdownNumber(value);
        else if (coreBlock === 'task-session' && ['脑力变化', 'braindelta'].includes(key)) brainDelta = decodeMarkdownNumber(value);
        else if (coreBlock === 'task-session' && ['体力变化', 'physicaldelta'].includes(key)) physicalDelta = decodeMarkdownNumber(value);
        else if (['核心block', 'coreblock'].includes(key)) coreBlock = value.trim();
        else if (['状态', 'status'].includes(key)) status = value.trim().toLowerCase();
        else if (key === '目标') goalPath = decodeMarkdownString(value, FIELD_CODEC_PRESETS.goalPath);
        else if (['日期', 'date'].includes(key)) date = parseDate(value);
        else if (['计划时间', 'scheduledat'].includes(key)) scheduledAt = normalizeStoredDateTime(value);
        else if (['开始时间', 'startat'].includes(key)) startAt = normalizeStoredDateTime(value);
        else if (['结束时间', 'endat'].includes(key)) endAt = normalizeStoredDateTime(value);
        else if (['截止时间', 'dueat'].includes(key)) dueAt = normalizeStoredDateTime(value);
        else if (['计划日期', 'scheduleddate'].includes(key)) scheduledDate = parseDate(value);
        else if (['开始日期', 'startdate'].includes(key)) startDate = parseDate(value);
        else if (['截止日期', 'duedate'].includes(key)) dueDate = parseDate(value);
        else if (['创建于', 'createdat'].includes(key)) createdAt = normalizeStoredDateTime(value);
        else if (['完成于', 'completedat'].includes(key)) completedAt = normalizeStoredDateTime(value);
        else if (['取消于', 'cancelledat'].includes(key)) cancelledAt = normalizeStoredDateTime(value);
        else if (['跳过于', 'skippedat'].includes(key)) skippedAt = normalizeStoredDateTime(value);
        else if (['优先级', 'priority'].includes(key)) {
          const p = value.trim().toLowerCase();
          if (['lowest','low','medium','high','highest'].includes(p)) priority = p as ParsedRecordMetadata['priority'];
        }
        else if (['预计时长', 'expectedduration', 'expecteddurationminutes'].includes(key)) expectedDurationMinutes = decodeMarkdownNumber(value);
        else if (['精力要求', 'energydemand'].includes(key)) energyDemand = value.trim().toLowerCase() || undefined;
        else if (['脑力要求', 'braindemand'].includes(key)) brainDemand = value.trim().toLowerCase() || undefined;
        else if (['体力要求', 'physicaldemand'].includes(key)) physicalDemand = value.trim().toLowerCase() || undefined;
        else if (['可用场景', 'availabilitycontexts'].includes(key)) {
          const allowed = new Set(['any', 'work', 'home', 'commute', 'out']);
          const aliases: Record<string, string> = { '任意': 'any', '工作': 'work', '公司': 'work', '家': 'home', '居家': 'home', '通勤': 'commute', '外出': 'out' };
          const values = String(value || '').split(/[,，\n]/).map(part => part.trim()).filter(Boolean).map(part => aliases[part] || part.toLowerCase()).filter(part => allowed.has(part));
          availabilityContexts = Array.from(new Set(values)) as ParsedRecordMetadata['availabilityContexts'];
        }
        else if (['恢复意图', 'recoveryintent'].includes(key)) recoveryIntent = decodeMarkdownFieldValue(value, FIELD_CODEC_PRESETS.boolean) as boolean | undefined;
        else if (['周期', 'period'].includes(key)) period = decodeMarkdownString(value);
        else if (['评分', 'rating'].includes(key)) {
          const decodedRating = decodeMarkdownNumber(value);
          if (decodedRating !== undefined) rating = decodedRating;
          else {
            const visualRating = String(value || '').trim();
            if (visualRating) {
              extra[rawKey] = decodeUnknownMarkdownKvValue(visualRating);
              if (!pintu) pintu = visualRating;
              if (!image) image = visualRating;
            }
          }
        }
        else if (['图标', 'icon'].includes(key)) icon = value.trim();
        else if (['评图', 'pintu', '图片', 'image'].includes(key)) { image = decodeMarkdownString(value, FIELD_CODEC_PRESETS.image); pintu = image; }
        else if (['内容', 'content', '任务内容'].includes(key)) {
          if (supportsBody) {
            contentStarted = true;
            content = value;
          }
        }
        else if (supportsCustomFields) extra[rawKey] = decodeUnknownMarkdownKvValue(value);
    } else {
      // V5 does not guess metadata or body from arbitrary prose. A body starts only
      // at the schema-owned 内容:: marker. This is what prevents '晚上：...' and
      // '7:30 ...' from becoming fields.
      continue;
    }
  }

  const finalTags = unique(tags);
  return {
    recordId, schemaVersion, title: buildTitle(content, finalTags), content: content.trim(),
    categoryKey: categoryKey || '', status, date, scheduledAt, startAt, endAt, dueAt, scheduledDate, startDate, dueDate,
    completedAt, cancelledAt, skippedAt, createdAt, tags: finalTags, goalPath,
    goalId, cycleId, coreBlock, recordSubtype, extra, icon, period, rating, image, pintu, theme, templateId,
    templateSourceType, priority, expectedDurationMinutes, energyDemand, brainDemand, physicalDemand, availabilityContexts, recoveryIntent, seriesId,
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

const TASK_FIELD_ORDER: Array<[string, string[]]> = [
  ['状态', ['状态','status']], ['目标ID', ['目标ID','goalId']], ['目标', ['目标','goalPath']],
  ['主题', ['主题','themePath']], ['创建于', ['创建于','createdAt']],
  ['开始时间', ['开始时间','startAt']], ['结束时间', ['结束时间','endAt']],
  ['优先级', ['优先级','priority']], ['预计时长', ['预计时长','expectedDurationMinutes']],
  ['精力要求', ['精力要求','energyDemand']], ['脑力要求', ['脑力要求','brainDemand']],
  ['体力要求', ['体力要求','physicalDemand']], ['可用场景', ['可用场景','availabilityContexts']], ['恢复意图', ['恢复意图','recoveryIntent']],
  ['计划时间', ['计划时间','scheduledAt']], ['截止时间', ['截止时间','dueAt']],
  ['计划日期', ['计划日期','scheduledDate']], ['开始日期', ['开始日期','startDate']], ['截止日期', ['截止日期','dueDate']],
  ['完成于', ['完成于','completedAt']], ['取消于', ['取消于','cancelledAt']], ['跳过于', ['跳过于','skippedAt']],
  ['系列ID', ['系列ID','seriesId']], ['模板ID', ['模板ID','templateId']], ['模板来源', ['模板来源','templateSourceType']],
];

const TASK_SESSION_FIELD_ORDER: Array<[string, string[]]> = [
  ['任务ID', ['任务ID','taskId']], ['系列ID', ['系列ID','seriesId']], ['目标ID', ['目标ID','goalId']],
  ['目标', ['目标','goalPath']], ['主题', ['主题','themePath']],
  ['开始于', ['开始于','sessionStartedAt']], ['结束于', ['结束于','sessionEndedAt']],
  ['时长', ['时长','sessionDurationMinutes']], ['结果', ['结果','sessionResult']], ['来源', ['来源','sessionSource']],
  ['建议时长', ['建议时长','suggestedDurationMinutes']], ['开始精力记录ID', ['开始精力记录ID','startEnergyRecordId']],
  ['结束精力记录ID', ['结束精力记录ID','endEnergyRecordId']], ['精力变化', ['精力变化','energyDelta']],
  ['脑力变化', ['脑力变化','brainDelta']], ['体力变化', ['体力变化','physicalDelta']],
];

const TASK_SERIES_FIELD_ORDER: Array<[string, string[]]> = [
  ['状态', ['状态','status']], ['目标ID', ['目标ID','goalId']], ['目标', ['目标','goalPath']],
  ['主题', ['主题','themePath']], ['优先级', ['优先级','priority']], ['预计时长', ['预计时长','expectedDurationMinutes']],
  ['精力要求', ['精力要求','energyDemand']], ['脑力要求', ['脑力要求','brainDemand']], ['体力要求', ['体力要求','physicalDemand']],
  ['可用场景', ['可用场景','availabilityContexts']], ['恢复意图', ['恢复意图','recoveryIntent']],
  ['重复单位', ['重复单位','recurrenceUnit']], ['重复间隔', ['重复间隔','recurrenceInterval']],
  ['重复锚点', ['重复锚点','recurrenceAnchor']], ['系列开始日期', ['系列开始日期','seriesStartDate']],
  ['当前任务ID', ['当前任务ID','currentTaskId']], ['滚动策略', ['滚动策略','rolloverPolicy']],
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

/** Canonical Record v2 encoder. Grammar V5 always emits custom metadata before an optional terminal body. */
export function encodeRecordBlock(document: RecordDocument): string {
  const schemaVersion = document.schemaVersion ?? RECORD_SCHEMA_VERSION;
  const fields = document.fields || {};
  const lines = ['<!-- start -->', `记录ID:: ${document.recordId}`, `记录版本:: ${schemaVersion}`, `核心Block:: ${document.coreBlock}`];
  const emitted = new Set<string>();

  if (document.coreBlock === 'task') {
    for (const [label, keys] of TASK_FIELD_ORDER) {
      let value = firstValue(fields, keys);
      if (label === '状态' && !value) value = 'open';
      if (label === '创建于' && !value) value = new Date().toISOString();
      if (value && TASK_READABLE_DATETIME_LABELS.has(label)) value = formatRecordDateTimeForMarkdown(value);
      if (value) { lines.push(`${label}:: ${value}`); keys.forEach(key => emitted.add(key)); }
    }
    for (const [key, raw] of Object.entries(fields)) {
      if (emitted.has(key) || BODY_FIELD_ALIASES.includes(key) || ['记录ID','recordId','id','记录版本','schemaVersion','核心Block','coreBlock'].includes(key)) continue;
      const value = markdownScalar(raw);
      if (value) lines.push(`${key}:: ${value}`);
    }
    emitBody(lines, bodyValue(fields));
  } else if (document.coreBlock === 'task-session') {
    for (const [label, keys] of TASK_SESSION_FIELD_ORDER) {
      const value = firstValue(fields, keys);
      if (value) lines.push(`${label}:: ${value}`);
    }
  } else if (document.coreBlock === 'task-series') {
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
    const schema = getRecordSchemaDefinition(document.coreBlock);
    const supportsBody = Boolean(schema && getRecordFieldContract(schema.coreBlock, '内容'));
    for (const [key, raw] of Object.entries(fields)) {
      if (supportsBody && BODY_FIELD_ALIASES.includes(key)) continue;
      if (['记录ID','recordId','id','记录版本','schemaVersion','核心Block','coreBlock'].includes(key)) continue;
      const value = markdownScalar(raw);
      if (value) lines.push(`${key}:: ${value}`);
    }
    if (supportsBody) emitBody(lines, bodyValue(fields));
  }

  lines.push('<!-- end -->');
  return lines.join('\n');
}

/** Canonical R4 writer for a schema-filtered RecordDraft. */
export function encodeRecordDraft(input: { recordId: string; schemaVersion?: number; draft: RecordDraft }): string {
  return encodeRecordBlock({
    recordId: input.recordId,
    schemaVersion: input.schemaVersion ?? RECORD_SCHEMA_VERSION,
    coreBlock: input.draft.coreBlock,
    fields: input.draft.fields,
  });
}

/** Adds/replaces the universal envelope in an existing Record Block. */
export function ensureRecordEnvelope(markdown: string, input: { recordId: string; coreBlock: string; schemaVersion?: number }): string {
  const trimmed = markdown.trim();
  const lines = trimmed.split(/\r?\n/);
  if (lines[0]?.trim() !== '<!-- start -->' || lines[lines.length - 1]?.trim() !== '<!-- end -->') {
    throw new Error('Record Foundation v2 只允许写入 Markdown Record Block。');
  }
  const body = lines.slice(1, -1).filter(line => !/^\s*(?:记录ID|recordId|记录版本|schemaVersion|核心Block|coreBlock)\s*::/i.test(line));
  return ['<!-- start -->', `记录ID:: ${input.recordId}`, `记录版本:: ${input.schemaVersion ?? RECORD_SCHEMA_VERSION}`, `核心Block:: ${input.coreBlock}`, ...body, '<!-- end -->'].join('\n');
}
