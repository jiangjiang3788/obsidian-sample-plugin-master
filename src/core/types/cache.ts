// DataStore cache for Record Foundation v2.
import type { Item } from './schema';

export interface CachedItem {
  id: string;
  schemaVersion?: number;
  coreBlock?: string;
  status?: string;
  templateId?: string;
  templateSourceType?: 'core-block' | 'goal-template';
  filePath: string;
  startLine?: number;
  endLine?: number;
  filename?: string;
  title: string;
  content: string;
  rawSource?: string;
  tags: string[];
  goalId?: string;
  goalPath?: string;
  goalPaths?: string[];
  theme?: string;
  themePath?: string;
  rootTheme?: string;
  leafTheme?: string;
  categoryKey: string;
  recurrenceInfo?: Item['recurrenceInfo'];
  priority?: Item['priority'];
  expectedDurationMinutes?: number;
  createdDate?: string;
  scheduledDate?: string;
  startDate?: string;
  dueDate?: string;
  doneDate?: string;
  cancelledDate?: string;
  completedAt?: string;
  cancelledAt?: string;
  skippedAt?: string;
  startISO?: string;
  endISO?: string;
  seriesId?: string;
  seriesStartDate?: string;
  currentTaskId?: string;
  rolloverPolicy?: 'carry';
  taskId?: string;
  sessionStartedAt?: string;
  sessionEndedAt?: string;
  sessionDurationMinutes?: number;
  sessionResult?: string;
  sessionSource?: string;
  suggestedDurationMinutes?: number;
  startEnergyRecordId?: string;
  endEnergyRecordId?: string;
  energyDelta?: number;
  brainDelta?: number;
  physicalDelta?: number;
  date?: string;
  dateMs?: number;
  created: number;
  modified: number;
  extra?: Record<string, string | number | boolean>;
  titleLower?: string;
  contentLower?: string;
  tagsLower?: string[];
  goalPathsLower?: string[];
}

export interface CachedRecordIntegrityIssue {
  code: string;
  recordId?: string;
  path?: string;
  message: string;
}

export interface CacheV1 {
  schemaVersion: number;
  files: Record<string, { mtime: number; size: number; items: CachedItem[]; integrityIssues?: CachedRecordIntegrityIssue[] }>;
  indexes?: {
    byDateSorted?: Array<[number, string]>;
    byTag?: Record<string, string[]>;
    byTheme?: Record<string, string[]>;
  };
}

// v12: persist scanner integrity diagnostics so warm-start cannot hide malformed/missing-ID records.
export const CURRENT_CACHE_SCHEMA_VERSION = 12;

export function toCachedItem(it: Item): CachedItem {
  return {
    id: it.id,
    schemaVersion: it.schemaVersion,
    coreBlock: it.coreBlock,
    status: it.status,
    templateId: it.templateId,
    templateSourceType: it.templateSourceType,
    filePath: it.file?.path || it.source?.path || '',
    startLine: it.source?.startLine ?? it.file?.line,
    endLine: it.source?.endLine ?? it.file?.line,
    filename: it.filename ?? it.fileName,
    title: it.title || '',
    content: it.content || '',
    rawSource: it.rawSource,
    tags: [...(it.tags || [])],
    goalId: it.goalId,
    goalPath: it.goalPath,
    goalPaths: [...(it.goalPaths || [])],
    theme: it.theme,
    themePath: it.themePath,
    rootTheme: it.rootTheme,
    leafTheme: it.leafTheme,
    categoryKey: it.categoryKey,
    recurrenceInfo: it.recurrenceInfo,
    priority: it.priority,
    expectedDurationMinutes: it.expectedDurationMinutes,
    createdDate: it.createdDate,
    scheduledDate: it.scheduledDate,
    startDate: it.startDate,
    dueDate: it.dueDate,
    doneDate: it.doneDate,
    cancelledDate: it.cancelledDate,
    completedAt: it.completedAt,
    cancelledAt: it.cancelledAt,
    skippedAt: it.skippedAt,
    startISO: it.startISO,
    endISO: it.endISO,
    seriesId: it.seriesId,
    seriesStartDate: it.seriesStartDate,
    currentTaskId: it.currentTaskId,
    rolloverPolicy: it.rolloverPolicy,
    taskId: it.taskId,
    sessionStartedAt: it.sessionStartedAt,
    sessionEndedAt: it.sessionEndedAt,
    sessionDurationMinutes: it.sessionDurationMinutes,
    sessionResult: it.sessionResult,
    sessionSource: it.sessionSource,
    suggestedDurationMinutes: it.suggestedDurationMinutes,
    startEnergyRecordId: it.startEnergyRecordId,
    endEnergyRecordId: it.endEnergyRecordId,
    energyDelta: it.energyDelta,
    brainDelta: it.brainDelta,
    physicalDelta: it.physicalDelta,
    date: it.date,
    dateMs: it.dateMs ?? it.startMs ?? it.endMs,
    created: it.created,
    modified: it.modified,
    extra: it.extra || {},
    titleLower: (it as any).titleLower ?? it.title?.toLowerCase(),
    contentLower: (it as any).contentLower ?? it.content?.toLowerCase(),
    tagsLower: (it as any).tagsLower ?? (it.tags || []).map(t => t.toLowerCase()),
    goalPathsLower: (it as any).goalPathsLower ?? (it.goalPaths || []).map(t => t.toLowerCase()),
  };
}

export function fromCachedItem(c: CachedItem): Item {
  const folder = c.filePath.split('/').slice(0, -1).pop() || '';
  const it: Item & Record<string, any> = {
    id: c.id,
    schemaVersion: c.schemaVersion,
    coreBlock: c.coreBlock,
    status: c.status,
    templateId: c.templateId,
    templateSourceType: c.templateSourceType,
    title: c.title || '',
    content: c.content || '',
    rawSource: c.rawSource,
    tags: [...(c.tags || [])],
    goalId: c.goalId,
    goalPath: c.goalPath,
    goalIds: c.goalId ? [c.goalId] : [],
    goalPaths: [...(c.goalPaths || [])],
    theme: c.theme,
    themePath: c.themePath,
    rootTheme: c.rootTheme,
    leafTheme: c.leafTheme,
    categoryKey: c.categoryKey,
    recurrenceInfo: c.recurrenceInfo,
    priority: c.priority,
    expectedDurationMinutes: c.expectedDurationMinutes,
    createdDate: c.createdDate,
    scheduledDate: c.scheduledDate,
    startDate: c.startDate,
    dueDate: c.dueDate,
    doneDate: c.doneDate,
    cancelledDate: c.cancelledDate,
    completedAt: c.completedAt,
    cancelledAt: c.cancelledAt,
    skippedAt: c.skippedAt,
    startISO: c.startISO,
    endISO: c.endISO,
    seriesId: c.seriesId,
    seriesStartDate: c.seriesStartDate,
    currentTaskId: c.currentTaskId,
    rolloverPolicy: c.rolloverPolicy,
    taskId: c.taskId,
    sessionStartedAt: c.sessionStartedAt,
    sessionEndedAt: c.sessionEndedAt,
    sessionDurationMinutes: c.sessionDurationMinutes,
    sessionResult: c.sessionResult,
    sessionSource: c.sessionSource,
    suggestedDurationMinutes: c.suggestedDurationMinutes,
    startEnergyRecordId: c.startEnergyRecordId,
    endEnergyRecordId: c.endEnergyRecordId,
    energyDelta: c.energyDelta,
    brainDelta: c.brainDelta,
    physicalDelta: c.physicalDelta,
    date: c.date,
    dateMs: c.dateMs,
    created: c.created,
    modified: c.modified,
    filename: c.filename,
    fileName: c.filename,
    file: { path: c.filePath, line: c.startLine, folder },
    source: {
      path: c.filePath,
      startLine: c.startLine || 0,
      endLine: c.endLine || c.startLine || 0,
      modified: c.modified,
    },
    extra: c.extra || {},
  };
  it.titleLower = c.titleLower ?? c.title?.toLowerCase() ?? '';
  it.contentLower = c.contentLower ?? c.content?.toLowerCase() ?? '';
  it.tagsLower = c.tagsLower ?? (c.tags || []).map(t => t.toLowerCase());
  it.goalPathsLower = c.goalPathsLower ?? (c.goalPaths || []).map(t => t.toLowerCase());
  return it;
}
