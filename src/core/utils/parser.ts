// Record Foundation v2 parser: runtime reads Markdown Record Blocks only.
import type { RecordEntity, RecordViewItem } from '@/core/records/RecordEntity';
import { getPeriodCount, dayjs } from './date';
import { decodeRecordContentLines } from '@/core/records/codec';
import { RECORD_SCHEMA_VERSION, isStableRecordId } from '@/core/records/RecordId';
import { normalizeRecurrenceInfo } from '@/core/records/task/taskRecurrence';
import { normalizeTaskSessionDurationMinutes } from '@/core/records/task/taskSession';
import { getRecordSchemaDefinition } from '@/core/records/schema';

/**
 * Parse one <!-- start --> ... <!-- end --> Record Block.
 * Missing/invalid Record IDs are isolated by returning null; runtime never falls
 * fall back to location-derived identity.
 */
export function parseRecordBlock(
  filePath: string,
  lines: string[],
  startIdx: number,
  endIdx: number,
  parentFolder: string,
): RecordEntity | null {
  const contentLines = lines.slice(startIdx + 1, endIdx);
  const parsed = decodeRecordContentLines(contentLines, parentFolder);
  if (!parsed.recordId || !isStableRecordId(parsed.recordId)) return null;
  if (parsed.schemaVersion !== RECORD_SCHEMA_VERSION) return null;
  if (!parsed.coreBlock) return null;

  const isTask = parsed.coreBlock === 'task';
  const isTaskSeries = parsed.coreBlock === 'task-series';
  const isTaskSession = parsed.coreBlock === 'task-session';
  if (isTask && !['open', 'done', 'cancelled', 'skipped'].includes(String(parsed.status || ''))) return null;
  if (isTask && parsed.status === 'skipped' && !parsed.seriesId) return null;
  if (isTaskSeries && !['active', 'stopped'].includes(String(parsed.status || ''))) return null;
  const recurrenceInfo = isTaskSeries
    ? normalizeRecurrenceInfo({ unit: parsed.recurrenceUnit, interval: parsed.recurrenceInterval, anchor: parsed.recurrenceAnchor })
    : null;
  if (isTaskSeries && !recurrenceInfo) return null;
  const sessionDuration = normalizeTaskSessionDurationMinutes(parsed.sessionDurationMinutes);
  if (isTaskSession && (!parsed.taskId || !parsed.sessionStartedAt || !parsed.sessionEndedAt || sessionDuration == null || !parsed.sessionResult || !parsed.sessionSource)) return null;
  const canonicalDate = parsed.scheduledDate || parsed.dueDate || parsed.startDate || parsed.date || (parsed.sessionStartedAt ? parsed.sessionStartedAt.slice(0, 10) : undefined);
  const schema = getRecordSchemaDefinition(parsed.coreBlock);
  const derivedCategory = parsed.coreBlock === 'thought' && parsed.recordSubtype
    ? `闪念/${parsed.recordSubtype}`
    : (schema?.categoryKey || parentFolder);
  const categoryKey = parsed.categoryKey || derivedCategory;
  const item: RecordViewItem = {
    id: parsed.recordId,
    schemaVersion: parsed.schemaVersion,
    title: parsed.title || '',
    content: parsed.content,
    rawSource: lines.slice(startIdx, endIdx + 1).join('\n'),
    editableText: parsed.content,
    status: parsed.status,
    tags: parsed.tags,
    goalPath: parsed.goalPath,
    recurrenceInfo: recurrenceInfo || undefined,
    created: 0,
    modified: 0,
    extra: parsed.extra,
    categoryKey,
    folder: parentFolder,
    theme: parsed.theme,
    coreBlock: parsed.coreBlock,
    priority: parsed.priority,
    createdAt: parsed.createdAt,
    energyDemand: parsed.energyDemand,
    brainDemand: parsed.brainDemand,
    physicalDemand: parsed.physicalDemand,
    scheduledDate: parsed.scheduledDate,
    startDate: parsed.startDate,
    dueDate: parsed.dueDate,
    completedAt: parsed.completedAt,
    cancelledAt: parsed.cancelledAt,
    skippedAt: parsed.skippedAt,
    seriesId: parsed.seriesId,
    seriesStartDate: parsed.seriesStartDate,
    currentTaskId: parsed.currentTaskId,
    rolloverPolicy: parsed.rolloverPolicy,
    taskId: parsed.taskId,
    sessionStartedAt: parsed.sessionStartedAt,
    sessionEndedAt: parsed.sessionEndedAt,
    sessionDurationMinutes: sessionDuration ?? undefined,
    sessionResult: parsed.sessionResult,
    sessionSource: parsed.sessionSource,
    suggestedDurationMinutes: parsed.suggestedDurationMinutes,
    startEnergyRecordId: parsed.startEnergyRecordId,
    endEnergyRecordId: parsed.endEnergyRecordId,
    energyDelta: parsed.energyDelta,
    brainDelta: parsed.brainDelta,
    physicalDelta: parsed.physicalDelta,
    recordSubtype: parsed.recordSubtype,
    doneDate: parsed.completedAt,
    cancelledDate: parsed.cancelledAt,
    date: canonicalDate,
  };

  if (parsed.goalId) item.goalId = parsed.goalId;
  if (parsed.cycleId) item.cycleId = parsed.cycleId;
  if (parsed.templateId) item.templateId = parsed.templateId;
  if (parsed.templateSourceType) item.templateSourceType = parsed.templateSourceType;
  if (parsed.icon) item.icon = parsed.icon;
  if (parsed.period) item.period = parsed.period;
  if (parsed.rating !== undefined) item.rating = parsed.rating;
  if (parsed.image) item.image = parsed.image;
  if (parsed.pintu) item.pintu = parsed.pintu;
  if (parsed.seriesId) item.extra['系列ID'] = parsed.seriesId;
  if (parsed.expectedDurationMinutes !== undefined) {
    item.expectedDurationMinutes = parsed.expectedDurationMinutes;
  }

  item.startISO = parsed.sessionStartedAt || parsed.startDate || parsed.scheduledDate || parsed.dueDate || parsed.date;
  item.endISO = parsed.sessionEndedAt || parsed.completedAt || parsed.cancelledAt || parsed.dueDate || item.startISO;
  if (item.startISO) item.startMs = Date.parse(item.startISO);
  if (item.endISO) item.endMs = Date.parse(item.endISO);

  if (item.period && item.date) item.periodCount = getPeriodCount(item.period, dayjs(item.date));
  return item;
}

