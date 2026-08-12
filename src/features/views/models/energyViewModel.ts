import type { GoalDefinition } from '@core/goal/public';
import { buildGoalBuckets, getItemGoalKey, normalizeGoalPath } from '@core/goal/public';
import {
  buildEnergyManagement,
  buildEnergyDataQuality,
  buildEnergyPatterns,
  buildEnergyPeriod,
  isEnergyItem,
  type EnergyManagementModel,
  type EnergyDataQualityModel,
  type EnergyPatternAnalytics,
  type EnergyPeriodModel,
} from '@core/energy/public';
import type { CurrentView, RecordViewItem, ThemeDefinition, TimerState } from '@core/types/public';
import { dayjs } from '@core/utils/public';
import { ENERGY_VIEW_DEFAULT_CONFIG, type EnergyViewConfig } from '@core/view/public';
import { buildGoalEnergyContext, buildGoalEnergySummary, type GoalEnergyContextModel, type GoalEnergySummaryModel } from './energySummaryModel';
import { buildEnergyTaskListModel, type EnergyTaskListModel } from './energyTaskListModel';

export interface EnergyPeriodSampleModel {
  id: string;
  date: string;
  time: string;
  minuteOfDay: number;
  score: number;
  brainScore?: number;
  physicalScore?: number;
  captureMode: 'realtime' | 'retrospective';
  context?: GoalEnergyContextModel | null;
  item: RecordViewItem;
}

export interface EnergyPeriodDayModel {
  date: string;
  sampled: boolean;
  samples: EnergyPeriodSampleModel[];
  dailyScore?: number;
  dailyBrainScore?: number;
  dailyPhysicalScore?: number;
}

export interface EnergyPeriodRenderModel extends Omit<EnergyPeriodModel, 'days'> {
  label: string;
  days: EnergyPeriodDayModel[];
}

export interface EnergyReviewLineModel {
  key: 'data' | 'overall' | 'recovery' | 'depletion' | 'foundation' | 'attention' | 'now';
  label: string;
  text: string;
}



export interface EnergyGoalPanelModel {
  key: string;
  title: string;
  goalPath: string;
  icon?: string | null;
  summary: GoalEnergySummaryModel;
  period: EnergyPeriodRenderModel | null;
  reviewLines: EnergyReviewLineModel[];
  quality: EnergyDataQualityModel;
  patterns?: EnergyPatternAnalytics | null;
  management?: EnergyManagementModel | null;
}

export interface EnergyViewRenderModel {
  config: EnergyViewConfig;
  currentView: CurrentView;
  periodLabel: string;
  goalPanels: EnergyGoalPanelModel[];
  totalEnergySamples: number;
  sampledGoalCount: number;
  taskList: EnergyTaskListModel;
}

interface EnergyViewModuleLike {
  viewConfig?: Partial<EnergyViewConfig>;
}

function normalizedGoalFilter(value: unknown): string {
  return normalizeGoalPath(String(value || '').trim()) || '';
}

function dateText(value: Date): string {
  return dayjs(value).format('YYYY-MM-DD');
}

function periodLabel(currentView: CurrentView, dateRange: [Date, Date]): string {
  const start = dayjs(dateRange[0]);
  const end = dayjs(dateRange[1]);
  if (currentView === '天') return `${start.format('YYYY-MM-DD')}`;
  if (currentView === '周') return `${start.format('MM-DD')} — ${end.format('MM-DD')}`;
  if (currentView === '月') return start.format('YYYY-MM');
  if (currentView === '季') return `${start.year()} Q${start.quarter()}`;
  return start.format('YYYY');
}

function periodRenderModel(period: EnergyPeriodModel | null, goalItems: RecordViewItem[], label: string, contextRecords: RecordViewItem[]): EnergyPeriodRenderModel | null {
  if (!period) return null;
  return {
    ...period,
    label,
    days: period.days.map((day) => ({
      ...day,
      samples: day.samples.map((sample) => ({
        id: sample.itemId,
        date: sample.date,
        time: sample.time,
        minuteOfDay: sample.minuteOfDay,
        score: sample.score,
        brainScore: sample.brainScore,
        physicalScore: sample.physicalScore,
        captureMode: sample.captureMode,
        context: buildGoalEnergyContext(sample.item, contextRecords),
        item: sample.item,
      })),
    })),
  };
}

function signed(value: number): string {
  const rounded = Math.round(value);
  return `${rounded > 0 ? '+' : ''}${rounded}`;
}

function compactReviewLines(args: {
  periodItems: RecordViewItem[];
  patterns: EnergyPatternAnalytics | null;
  management: EnergyManagementModel | null;
  quality: EnergyDataQualityModel;
}): EnergyReviewLineModel[] {
  const { periodItems, patterns, management, quality } = args;
  const lines: EnergyReviewLineModel[] = [];

  if (quality.level === 'limited') {
    lines.push({ key: 'data', label: '数据', text: quality.message });
  }

  const dayparts = (patterns?.dayparts || []).filter((row) => row.sampleCount >= 3 && row.meanScore != null);
  if (dayparts.length >= 2) {
    const best = [...dayparts].sort((a, b) => (b.meanScore || 0) - (a.meanScore || 0))[0];
    const low = [...dayparts].sort((a, b) => (a.meanScore || 0) - (b.meanScore || 0))[0];
    const gap = Math.abs((best.meanScore || 0) - (low.meanScore || 0));
    if (best.key !== low.key && gap >= 10) {
      lines.push({ key: 'overall', label: '状态', text: `${best.label}相对较高（${Math.round(best.meanScore || 0)}，N=${best.sampleCount}），${low.label}相对较低（${Math.round(low.meanScore || 0)}，N=${low.sampleCount}）。` });
    }
  }

  const recovery = management?.recoveryCandidates?.[0];
  if (recovery) {
    const prefix = recovery.evidence === 'supported' ? '' : '初步观察：';
    lines.push({ key: 'recovery', label: '恢复', text: `${prefix}${recovery.label}后偏回升（平均 ${signed(recovery.meanDelta)}，N=${recovery.sampleCount}）。` });
  }
  const depletion = management?.cautionCandidates?.[0];
  if (depletion) {
    const prefix = depletion.evidence === 'supported' ? '' : '初步观察：';
    lines.push({ key: 'depletion', label: '消耗', text: `${prefix}${depletion.label}后偏下降（平均 ${signed(depletion.meanDelta)}，N=${depletion.sampleCount}）。` });
  }

  const stop = patterns?.stopProxy;
  if (stop && stop.followedByWorkCount >= 3 && stop.evidence !== 'insufficient' && (stop.longContinuationRatio || 0) >= 0.5) {
    lines.push({ key: 'attention', label: '注意', text: `高精力后继续工作过久的情况较多（N=${stop.followedByWorkCount}），先定停止点更合适。` });
  }

  if (lines.length === 0 && periodItems.some(isEnergyItem)) {
    lines.push({ key: 'overall', label: '状态', text: '本周期已有记录，但暂时没有达到最小重复样本的稳定模式。' });
  }
  return lines.slice(0, 5);
}



function recordOccurrenceDate(item: RecordViewItem): string {
  if (item.coreBlock === 'task-session' && item.sessionStartedAt) {
    const date = new Date(item.sessionStartedAt);
    if (Number.isFinite(date.getTime())) {
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    }
  }
  return String(item.date || item.doneDate || item.startDate || item.scheduledDate || item.createdDate || '').slice(0, 10);
}

function recordAtOrBefore(item: RecordViewItem, today: string, nowTime: string): boolean {
  const itemDate = recordOccurrenceDate(item);
  if (!itemDate) return true;
  if (itemDate < today) return true;
  if (itemDate > today) return false;
  if (item.coreBlock === 'task-session' && item.sessionEndedAt) return Date.parse(item.sessionEndedAt) <= Date.now();
  if (!isEnergyItem(item)) return true;
  const itemTime = String(item.startTime || item.extra?.['时间'] || '00:00').slice(0, 5);
  return itemTime <= nowTime;
}

function evidenceRecordsForGoal(
  records: RecordViewItem[],
  goalKey: string,
  goals: GoalDefinition[],
  startDate?: string,
  endDate?: string,
): RecordViewItem[] {
  const goalTaskIds = new Set(records
    .filter((item) => item.coreBlock === 'task' && getItemGoalKey(item, goals) === goalKey)
    .map((item) => item.id));
  const sessions = records.filter((item) => {
    if (item.coreBlock !== 'task-session') return false;
    if (getItemGoalKey(item, goals) !== goalKey && !goalTaskIds.has(String(item.taskId || ''))) return false;
    if (!startDate || !endDate) return true;
    const date = recordOccurrenceDate(item);
    return Boolean(date && date >= startDate && date <= endDate);
  });
  const requiredIds = new Set<string>();
  for (const session of sessions) {
    for (const value of [session.id, session.taskId, session.startEnergyRecordId, session.endEnergyRecordId]) {
      const id = String(value || '').trim();
      if (id) requiredIds.add(id);
    }
  }
  return records.filter((item) => requiredIds.has(item.id));
}

function itemInRange(item: RecordViewItem, startDate: string, endDate: string): boolean {
  const date = recordOccurrenceDate(item);
  return Boolean(date && date >= startDate && date <= endDate);
}

export function buildEnergyViewModel(args: {
  items: RecordViewItem[];
  records?: RecordViewItem[];
  module: EnergyViewModuleLike;
  currentView: CurrentView;
  dateRange: [Date, Date];
  goals?: GoalDefinition[];
  themes?: ThemeDefinition[];
  timers?: TimerState[];
}): EnergyViewRenderModel {
  const { items = [], records = items, module, goals = [], themes = [], timers = [], currentView, dateRange } = args;
  const rawConfig = { ...ENERGY_VIEW_DEFAULT_CONFIG, ...(module?.viewConfig || {}) };
  const config: EnergyViewConfig = {
    ...rawConfig,
    windowDays: Math.max(1, Math.min(31, Math.floor(Number(rawConfig.windowDays) || 7))),
    recentSampleLimit: Math.max(1, Math.min(20, Math.floor(Number(rawConfig.recentSampleLimit) || 5))),
    maxGoals: Math.max(0, Math.min(20, Math.floor(Number(rawConfig.maxGoals) || 0))),
    goalPath: String(rawConfig.goalPath || '').trim(),
    analysisWindowDays: Math.max(7, Math.min(90, Math.floor(Number(rawConfig.analysisWindowDays) || 30))),
  };

  const startDate = dateText(dateRange[0]);
  const endDate = dateText(dateRange[1]);
  const now = dayjs();
  const today = now.format('YYYY-MM-DD');
  const nowTime = now.format('HH:mm');
  const displayPeriodLabel = periodLabel(currentView, dateRange);
  const requestedGoal = normalizedGoalFilter(config.goalPath);
  const buckets = buildGoalBuckets(items, goals, { includeUnassigned: false, includeKnownGoals: false, themes });
  const panels: EnergyGoalPanelModel[] = [];

  for (const bucket of buckets) {
    const bucketPath = normalizedGoalFilter(bucket.goalPath || bucket.name);
    if (requestedGoal && bucketPath !== requestedGoal && normalizedGoalFilter(bucket.name) !== requestedGoal) continue;

    const goalItems = items.filter((item) => getItemGoalKey(item, goals) === bucket.name);
    if (!goalItems.some(isEnergyItem)) continue;
    const periodItems = goalItems.filter((item) => itemInRange(item, startDate, endDate));

    const allGoalEvidenceRecords = evidenceRecordsForGoal(records, bucket.name, goals);
    const periodEvidenceRecords = evidenceRecordsForGoal(records, bucket.name, goals, startDate, endDate);
    const currentEvidenceRecords = allGoalEvidenceRecords.filter((item) => recordAtOrBefore(item, today, nowTime));
    const summary = buildGoalEnergySummary(goalItems, config.recentSampleLimit, {
      contextRecords: records,
      effectRecords: allGoalEvidenceRecords,
    });
    if (!summary) continue;
    const patterns = buildEnergyPatterns(periodItems, { activityRecords: periodEvidenceRecords, analysisWindowDays: Math.max(7, Math.min(config.analysisWindowDays, 90)) });
    const currentHistoryItems = goalItems.filter((item) => recordAtOrBefore(item, today, nowTime));
    const management = buildEnergyManagement(currentHistoryItems, { evidenceRecords: currentEvidenceRecords, analysisWindowDays: config.analysisWindowDays, highEnergyThreshold: 60 });
    const periodManagement = buildEnergyManagement(periodItems, { evidenceRecords: periodEvidenceRecords, analysisWindowDays: config.analysisWindowDays, highEnergyThreshold: 60 });
    const quality = buildEnergyDataQuality(periodItems, { startDate, endDate, effectRecords: periodEvidenceRecords });
    const period = periodRenderModel(buildEnergyPeriod(goalItems, { currentView, startDate, endDate }), goalItems, displayPeriodLabel, records);

    panels.push({
      key: bucket.name,
      title: bucket.alias || bucket.name,
      goalPath: bucket.goalPath || bucket.name,
      icon: bucket.icon || null,
      summary,
      period,
      reviewLines: compactReviewLines({ periodItems, patterns, management: periodManagement, quality }),
      quality,
      patterns,
      management,
    });
  }

  panels.sort((left, right) => {
    const leftKey = `${left.summary.latestDate || ''} ${left.summary.latestTime || ''}`;
    const rightKey = `${right.summary.latestDate || ''} ${right.summary.latestTime || ''}`;
    return rightKey.localeCompare(leftKey);
  });
  const visible = config.maxGoals > 0 ? panels.slice(0, config.maxGoals) : panels;

  const globalCurrentHistoryItems = items.filter((item) => recordAtOrBefore(item, today, nowTime));
  const globalEvidenceRecords = records.filter((item) => recordAtOrBefore(item, today, nowTime));
  const globalManagement = buildEnergyManagement(globalCurrentHistoryItems, {
    evidenceRecords: globalEvidenceRecords,
    analysisWindowDays: config.analysisWindowDays,
    highEnergyThreshold: 60,
  });
  const taskList = buildEnergyTaskListModel({
    items,
    historyItems: records,
    timers,
    management: globalManagement,
    goals,
    today,
    dateRange,
  });

  return {
    config,
    currentView,
    periodLabel: displayPeriodLabel,
    goalPanels: visible,
    totalEnergySamples: visible.reduce((sum, panel) => sum + (panel.period?.totalSamples || 0), 0),
    sampledGoalCount: visible.length,
    taskList,
  };
}
