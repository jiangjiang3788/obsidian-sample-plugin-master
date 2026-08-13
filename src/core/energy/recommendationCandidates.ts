import type { RecordViewItem, TaskAvailabilityContext } from '@/core/records/RecordEntity';
import { isTaskOpen } from '../records/task/taskStatus';
import { isTaskRecurring } from '../records/task/taskRecurrence';
import { asTaskSessionRecord } from '../records/task/taskSession';
import type { EnergyManagementModel } from './managementTypes';
import { classifyEnergyActivity } from './effects';
import type { EnergyActionCandidate, EnergyActionHistoricalEffect, EnergyActionLoad, EnergyActionSource } from './recommendationTypes';

export interface BuildEnergyActionCandidatesOptions {
  today?: string;
  maximumCandidates?: number;
  includePlans?: boolean;
  includeHabits?: boolean;
  includeRecurringTasks?: boolean;
  includeFutureTasks?: boolean;
  /** Current execution context is a hard eligibility boundary, not a ranking bonus. */
  currentContext?: TaskAvailabilityContext;
  /** Internal Record set used for persisted TaskSession duration evidence. */
  historyRecords?: RecordViewItem[];
}

export type EnergyCandidateExclusionReason =
  | 'not-action-source'
  | 'not-open-task'
  | 'explicitly-disabled'
  | 'recurring-task'
  | 'future-task'
  | 'context-unavailable'
  | 'plan-not-opted-in'
  | 'habit-not-opted-in'
  | 'missing-title';

export interface EnergyCandidateDiagnostics {
  totalItems: number;
  taskItems: number;
  openTasks: number;
  recurringOpenTasks: number;
  futureOpenTasks: number;
  contextUnavailableTasks: number;
  eligibleTasks: number;
  eligiblePlans: number;
  eligibleHabits: number;
  candidateCount: number;
  excludedByReason: Partial<Record<EnergyCandidateExclusionReason, number>>;
}

export interface EnergyActionCandidateBuildResult {
  candidates: EnergyActionCandidate[];
  diagnostics: EnergyCandidateDiagnostics;
}

function text(value: unknown): string {
  return String(value ?? '').trim();
}

function bool(value: unknown): boolean | undefined {
  if (typeof value === 'boolean') return value;
  const raw = text(value).toLowerCase();
  if (!raw) return undefined;
  if (['true', '1', 'yes', 'y', '是', '启用'].includes(raw)) return true;
  if (['false', '0', 'no', 'n', '否', '禁用'].includes(raw)) return false;
  return undefined;
}

function number(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const raw = text(value);
  if (!raw) return undefined;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function normalizedBlock(item: RecordViewItem): string {
  return text(item.coreBlock || item.extra?.['核心Block'])
    .replace(/^core\./i, '')
    .toLowerCase();
}

function sourceFor(item: RecordViewItem): EnergyActionSource | null {
  const block = normalizedBlock(item);
  if (block === 'task') return 'task';
  if (block === 'plan') return 'plan';
  if (block === 'habit') return 'habit';
  return null;
}

function load(value: unknown): EnergyActionLoad | undefined {
  const raw = text(value).toLowerCase();
  if (!raw) return undefined;
  if (['low', '低', '轻', '轻量'].includes(raw)) return 'low';
  if (['medium', 'mid', '中', '中等'].includes(raw)) return 'medium';
  if (['high', '高', '重', '高负荷'].includes(raw)) return 'high';
  return undefined;
}

const CONTEXT_ALIASES: Record<string, TaskAvailabilityContext> = {
  any: 'any', '任意': 'any',
  work: 'work', '工作': 'work', '公司': 'work',
  home: 'home', '家': 'home', '居家': 'home',
  commute: 'commute', '通勤': 'commute',
  out: 'out', '外出': 'out',
};

function availabilityContexts(value: unknown): TaskAvailabilityContext[] {
  const rows = Array.isArray(value) ? value : String(value ?? '').split(/[,，\n]/);
  const normalized = rows
    .map((row) => CONTEXT_ALIASES[text(row)] || CONTEXT_ALIASES[text(row).toLowerCase()])
    .filter((row): row is TaskAvailabilityContext => !!row);
  return Array.from(new Set(normalized));
}

function contextAllowed(item: RecordViewItem, currentContext: TaskAvailabilityContext | undefined): boolean {
  if (!currentContext || currentContext === 'any') return true;
  const contexts = availabilityContexts(item.availabilityContexts);
  if (contexts.length === 0 || contexts.includes('any')) return true;
  return contexts.includes(currentContext);
}

function median(values: number[]): number | undefined {
  const sorted = values.filter((value) => Number.isFinite(value) && value > 0).sort((a, b) => a - b);
  if (sorted.length < 2) return undefined;
  const middle = Math.floor(sorted.length / 2);
  const value = sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
  return Math.max(1, Math.min(240, Math.round(value)));
}

function historyDurationMaps(records: RecordViewItem[]): { byTaskId: Map<string, number>; bySeriesId: Map<string, number> } {
  const taskRows = new Map<string, number[]>();
  const seriesRows = new Map<string, number[]>();
  const byId = new Map(records.map((record) => [record.id, record] as const));

  for (const record of records) {
    const session = asTaskSessionRecord(record);
    if (!session) continue;
    const duration = number(session.sessionDurationMinutes);
    if (!duration || duration <= 0) continue;

    taskRows.set(session.taskId, [...(taskRows.get(session.taskId) || []), duration]);
    const task = byId.get(session.taskId);
    const seriesId = text(session.seriesId || task?.seriesId);
    if (seriesId) seriesRows.set(seriesId, [...(seriesRows.get(seriesId) || []), duration]);
  }

  const build = (rows: Map<string, number[]>) => new Map([...rows].flatMap(([key, values]) => {
    const value = median(values);
    return value == null ? [] : [[key, value] as const];
  }));

  return { byTaskId: build(taskRows), bySeriesId: build(seriesRows) };
}

function inferredDuration(item: RecordViewItem, history: ReturnType<typeof historyDurationMaps>): number | undefined {
  const direct = number(item.expectedDurationMinutes);
  if (direct != null && direct > 0) return Math.max(1, Math.min(240, Math.round(direct)));
  const seriesId = text(item.seriesId);
  if (seriesId) {
    const seriesDuration = history.bySeriesId.get(seriesId);
    if (seriesDuration != null) return seriesDuration;
  }
  return history.byTaskId.get(item.id);
}

function priorityValue(item: RecordViewItem): number {
  const map: Record<string, number> = {
    lowest: 20,
    low: 35,
    medium: 55,
    high: 75,
    highest: 95,
  };
  return map[item.priority || ''] ?? 50;
}

function parseDayDiff(value: string, today: string): number | null {
  if (!value || !today) return null;
  const valueMs = Date.parse(`${value}T12:00:00`);
  const todayMs = Date.parse(`${today}T12:00:00`);
  if (!Number.isFinite(valueMs) || !Number.isFinite(todayMs)) return null;
  return Math.round((valueMs - todayMs) / 86400000);
}

function dueBonus(item: RecordViewItem, today: string): number {
  const due = text(item.dueDate).slice(0, 10);
  const days = parseDayDiff(due, today);
  if (days == null) return 0;
  if (days < -30) return 0;
  if (days < 0) return 18;
  if (days <= 1) return 14;
  if (days <= 3) return 8;
  if (days <= 7) return 3;
  return 0;
}

function scheduleBonus(item: RecordViewItem, today: string): number {
  const date = text(item.scheduledDate || item.startDate).slice(0, 10);
  const diff = parseDayDiff(date, today);
  return diff === 0 ? 8 : 0;
}

function futureTask(item: RecordViewItem, today: string): boolean {
  const date = text(item.startDate || item.scheduledDate).slice(0, 10);
  const diff = parseDayDiff(date, today);
  return diff != null && diff > 0;
}

function candidateTitle(item: RecordViewItem): string {
  return text(item.content || item.editableText || item.title).slice(0, 120);
}

function normalizedLabel(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

function exclusionReason(
  item: RecordViewItem,
  source: EnergyActionSource,
  today: string,
  options: BuildEnergyActionCandidatesOptions,
): EnergyCandidateExclusionReason | null {
  const explicit = bool(item.extra?.['可推荐'] ?? item.extra?.['recommendable']);
  if (explicit === false) return 'explicitly-disabled';

  if (source === 'task') {
    if (!isTaskOpen(item)) return 'not-open-task';
    if (isTaskRecurring(item) && !options.includeRecurringTasks && explicit !== true) return 'recurring-task';
    if (futureTask(item, today) && options.includeFutureTasks !== true) return 'future-task';
    if (!contextAllowed(item, options.currentContext)) return 'context-unavailable';
    return null;
  }

  if (source === 'habit') {
    if (options.includeHabits === true && explicit === true && !item.doneDate && !item.cancelledDate) return null;
    return 'habit-not-opted-in';
  }
  if (source === 'plan') {
    if (options.includePlans === true && explicit === true && !item.doneDate && !item.cancelledDate) return null;
    return 'plan-not-opted-in';
  }
  return 'not-action-source';
}

function incrementReason(diagnostics: EnergyCandidateDiagnostics, reason: EnergyCandidateExclusionReason): void {
  diagnostics.excludedByReason[reason] = (diagnostics.excludedByReason[reason] || 0) + 1;
}

function personalEffectFor(candidate: EnergyActionCandidate, management?: EnergyManagementModel | null): EnergyActionHistoricalEffect | undefined {
  if (!management) return undefined;
  const title = normalizedLabel(candidate.title);
  const theme = normalizedLabel(candidate.theme || '');
  const rows = [...management.recoveryCandidates, ...management.cautionCandidates];
  const row = rows.find((entry) => normalizedLabel(entry.label) === title)
    || (theme ? rows.find((entry) => normalizedLabel(entry.label) === theme) : undefined);
  if (!row || row.sampleCount < 3) return undefined;
  return {
    meanDelta: row.meanDelta,
    sampleCount: row.sampleCount,
    meanBrainDelta: row.meanBrainDelta,
    meanPhysicalDelta: row.meanPhysicalDelta,
  };
}

/**
 * Discovery + eligibility + enrichment pipeline for Energy recommendations.
 *
 * V2 invariants:
 * - availability is a hard boundary before ranking;
 * - Task demand fields are read only from canonical Task properties, never extra;
 * - expected duration is the declared task duration, with Task/Series execution history as fallback;
 * - duration learning never borrows unrelated Goal/Theme sessions;
 * - recurring identity comes from seriesId and remains stable across occurrences.
 */
export function buildEnergyActionCandidateResult(items: RecordViewItem[], options: BuildEnergyActionCandidatesOptions = {}): EnergyActionCandidateBuildResult {
  const today = options.today || new Date().toISOString().slice(0, 10);
  const maximum = Math.max(1, Math.min(1000, Math.floor(options.maximumCandidates ?? 500)));
  const history = historyDurationMaps(options.historyRecords || items);
  const candidates: EnergyActionCandidate[] = [];
  const seen = new Set<string>();
  const diagnostics: EnergyCandidateDiagnostics = {
    totalItems: items.length,
    taskItems: 0,
    openTasks: 0,
    recurringOpenTasks: 0,
    futureOpenTasks: 0,
    contextUnavailableTasks: 0,
    eligibleTasks: 0,
    eligiblePlans: 0,
    eligibleHabits: 0,
    candidateCount: 0,
    excludedByReason: {},
  };

  for (const item of items) {
    const source = sourceFor(item);
    if (!source) {
      incrementReason(diagnostics, 'not-action-source');
      continue;
    }

    if (source === 'task') {
      diagnostics.taskItems += 1;
      if (isTaskOpen(item)) {
        diagnostics.openTasks += 1;
        if (isTaskRecurring(item)) diagnostics.recurringOpenTasks += 1;
        if (futureTask(item, today)) diagnostics.futureOpenTasks += 1;
        if (!contextAllowed(item, options.currentContext)) diagnostics.contextUnavailableTasks += 1;
      }
    }

    const reason = exclusionReason(item, source, today, options);
    if (reason) {
      incrementReason(diagnostics, reason);
      continue;
    }

    const title = candidateTitle(item);
    if (!title) {
      incrementReason(diagnostics, 'missing-title');
      continue;
    }

    if (source === 'task') diagnostics.eligibleTasks += 1;
    if (source === 'plan') diagnostics.eligiblePlans += 1;
    if (source === 'habit') diagnostics.eligibleHabits += 1;

    const dedupeKey = source === 'task' && item.seriesId ? `series:${item.seriesId}` : `${source}:${item.id}`;
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);

    const sharedLoad = load(item.energyDemand);
    const valueScore = Math.max(0, Math.min(100, priorityValue(item) + dueBonus(item, today) + scheduleBonus(item, today)));
    const contexts = availabilityContexts(item.availabilityContexts);
    candidates.push({
      id: item.id,
      title,
      source,
      goalId: item.goalId,
      goalPath: item.goalPath,
      seriesId: item.seriesId,
      theme: text(item.themePath || item.theme) || undefined,
      activityLabel: classifyEnergyActivity(item),
      durationMinutes: inferredDuration(item, history),
      brainLoad: load(item.brainDemand) || sharedLoad,
      physicalLoad: load(item.physicalDemand) || sharedLoad,
      valueScore,
      availabilityContexts: contexts.length ? contexts : undefined,
      recoveryIntent: item.recoveryIntent === true,
    });
  }

  const sorted = candidates
    .sort((left, right) => (right.valueScore || 0) - (left.valueScore || 0) || left.title.localeCompare(right.title, 'zh-CN'))
    .slice(0, maximum);
  diagnostics.candidateCount = sorted.length;
  return { candidates: sorted, diagnostics };
}

export function buildEnergyActionCandidates(items: RecordViewItem[], options: BuildEnergyActionCandidatesOptions = {}): EnergyActionCandidate[] {
  return buildEnergyActionCandidateResult(items, options).candidates;
}

export function attachEnergyRecommendationEvidence(
  candidates: EnergyActionCandidate[],
  management?: EnergyManagementModel | null,
): EnergyActionCandidate[] {
  return candidates.map((candidate) => {
    if (candidate.historicalEffect) return candidate;
    const historicalEffect = personalEffectFor(candidate, management);
    return historicalEffect ? { ...candidate, historicalEffect } : candidate;
  });
}
