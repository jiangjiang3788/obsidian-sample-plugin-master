import type { RecordViewItem } from '@/core/records/RecordEntity';
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
  /** Internal Record set used for persisted TaskSession duration evidence. */
  historyRecords?: RecordViewItem[];
}

export type EnergyCandidateExclusionReason =
  | 'not-action-source'
  | 'not-open-task'
  | 'explicitly-disabled'
  | 'recurring-task'
  | 'future-task'
  | 'plan-not-opted-in'
  | 'habit-not-opted-in'
  | 'missing-title';

export interface EnergyCandidateDiagnostics {
  totalItems: number;
  taskItems: number;
  openTasks: number;
  recurringOpenTasks: number;
  futureOpenTasks: number;
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
  if (['true', '1', 'yes', 'y', '\u662f', '\u542f\u7528'].includes(raw)) return true;
  if (['false', '0', 'no', 'n', '\u5426', '\u7981\u7528'].includes(raw)) return false;
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
  return text(item.coreBlock || item.extra?.['\u6838\u5fc3Block'])
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
  if (['low', '\u4f4e', '\u8f7b', '\u8f7b\u91cf'].includes(raw)) return 'low';
  if (['medium', 'mid', '\u4e2d', '\u4e2d\u7b49'].includes(raw)) return 'medium';
  if (['high', '\u9ad8', '\u91cd', '\u9ad8\u8d1f\u8377'].includes(raw)) return 'high';
  return undefined;
}

function median(values: number[]): number | undefined {
  const sorted = values.filter((value) => Number.isFinite(value) && value > 0).sort((a, b) => a - b);
  if (sorted.length < 3) return undefined;
  const middle = Math.floor(sorted.length / 2);
  const value = sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
  return Math.max(10, Math.min(240, Math.round(value)));
}

function historyDurationMaps(records: RecordViewItem[]): { byGoalTheme: Map<string, number>; byTheme: Map<string, number> } {
  const goalThemeRows = new Map<string, number[]>();
  const themeRows = new Map<string, number[]>();
  const byId = new Map(records.map((record) => [record.id, record] as const));
  for (const record of records) {
    const session = asTaskSessionRecord(record);
    if (!session) continue;
    const duration = number(session.sessionDurationMinutes);
    if (!duration || duration <= 0) continue;
    const task = byId.get(session.taskId);
    const theme = text(session.themePath || task?.themePath || task?.theme);
    if (!theme) continue;
    const goal = text(session.goalId || task?.goalId);
    const themeKey = theme.toLowerCase();
    const goalThemeKey = `${goal.toLowerCase()}|${themeKey}`;
    themeRows.set(themeKey, [...(themeRows.get(themeKey) || []), duration]);
    if (goal) goalThemeRows.set(goalThemeKey, [...(goalThemeRows.get(goalThemeKey) || []), duration]);
  }
  return {
    byGoalTheme: new Map([...goalThemeRows].flatMap(([key, values]) => {
      const value = median(values);
      return value == null ? [] : [[key, value] as const];
    })),
    byTheme: new Map([...themeRows].flatMap(([key, values]) => {
      const value = median(values);
      return value == null ? [] : [[key, value] as const];
    })),
  };
}

function inferredDuration(item: RecordViewItem, history: ReturnType<typeof historyDurationMaps>): number | undefined {
  const explicit = number(item.extra?.['\u9884\u8ba1\u65f6\u957f'] ?? item.extra?.['expectedDuration'] ?? item.extra?.['expectedDurationMinutes']);
  const canonical = number(item.expectedDurationMinutes);
  const direct = explicit && explicit > 0 ? explicit : canonical && canonical > 0 ? canonical : undefined;
  if (direct != null) return Math.max(10, Math.min(240, Math.round(direct)));
  const theme = text(item.themePath || item.theme).toLowerCase();
  if (!theme) return undefined;
  const goal = text(item.goalId).toLowerCase();
  return (goal ? history.byGoalTheme.get(`${goal}|${theme}`) : undefined) || history.byTheme.get(theme);
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
  const explicit = bool(item.extra?.['\u53ef\u63a8\u8350'] ?? item.extra?.['recommendable']);
  if (explicit === false) return 'explicitly-disabled';

  if (source === 'task') {
    if (!isTaskOpen(item)) return 'not-open-task';
    if (isTaskRecurring(item) && !options.includeRecurringTasks && explicit !== true) return 'recurring-task';
    if (futureTask(item, today) && options.includeFutureTasks !== true) return 'future-task';
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
 * Important invariants:
 * - recurring identity comes from seriesId; non-recurring Tasks have no seriesId;
 * - an old start/scheduled date does not invalidate an open backlog task;
 * - only a future start/scheduled date blocks "do it now";
 * - very old overdue due dates do not receive an urgency bonus forever;
 * - Habit/Plan remain opt-in action sources.
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

    const dedupeKey = `${source}|${normalizedLabel(title)}|${text(item.goalId).toLowerCase()}|${text(item.themePath || item.theme).toLowerCase()}`;
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);

    const sharedLoad = load(item.extra?.['\u7cbe\u529b\u8981\u6c42'] ?? item.extra?.['energyLoad']);
    const valueScore = Math.max(0, Math.min(100, priorityValue(item) + dueBonus(item, today) + scheduleBonus(item, today)));
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
      brainLoad: load(item.extra?.['\u8111\u529b\u8981\u6c42'] ?? item.extra?.['brainLoad']) || sharedLoad,
      physicalLoad: load(item.extra?.['\u4f53\u529b\u8981\u6c42'] ?? item.extra?.['physicalLoad']) || sharedLoad,
      valueScore,
      recoveryIntent: bool(item.extra?.['\u6062\u590d\u610f\u56fe'] ?? item.extra?.['recoveryIntent']) === true,
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
