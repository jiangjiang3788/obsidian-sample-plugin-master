import type { RecordEntity } from '@/core/records/RecordEntity';
import type { VaultPort } from '@/core/ports/VaultPort';
import type { DataStore } from '@/core/services/DataStore';
import { appendUnderHeaderText } from '@/core/recordInput/mutation/HeaderAppender';
import { resolveRecordBlockRangeById } from '@/core/recordInput/mutationLocator';
import { createRecordId, RECORD_SCHEMA_VERSION } from './RecordId';
import { RecordMutationTransaction, RecordTransactionRecoveryError } from './RecordMutationTransaction';
import { encodeRecordBlock, type RecordDocument } from './codec/MarkdownRecordCodec';

export interface NewRecord extends Omit<RecordDocument, 'recordId'> {
  recordId?: string;
  targetFilePath: string;
  targetHeader?: string | null;
}

export type RecordPatch = Record<string, unknown>;

export type RecordBatchOperation =
  | { kind: 'create'; record: NewRecord }
  | { kind: 'update'; recordId: string; patch: RecordPatch }
  | { kind: 'delete'; recordId: string };

export interface RecordBatchResult {
  writtenPaths: string[];
  createdRecordIds: string[];
}

const PATCH_FIELDS: Record<string, { label: string; aliases: string[] }> = {
  status: { label: '状态', aliases: ['状态', 'status'] },
  content: { label: '内容', aliases: ['内容', 'content'] },
  goalId: { label: '目标ID', aliases: ['目标ID', 'goalId'] },
  goalPath: { label: '目标', aliases: ['目标', 'goalPath'] },
  themePath: { label: '主题', aliases: ['主题', 'theme', 'themePath'] },
  createdAt: { label: '创建于', aliases: ['创建于', 'createdAt'] },
  scheduledDate: { label: '计划日期', aliases: ['计划日期', 'scheduledDate'] },
  startDate: { label: '开始日期', aliases: ['开始日期', 'startDate'] },
  dueDate: { label: '截止日期', aliases: ['截止日期', 'dueDate'] },
  completedAt: { label: '完成于', aliases: ['完成于', 'completedAt'] },
  cancelledAt: { label: '取消于', aliases: ['取消于', 'cancelledAt'] },
  skippedAt: { label: '跳过于', aliases: ['跳过于', 'skippedAt'] },
  priority: { label: '优先级', aliases: ['优先级', 'priority'] },
  expectedDurationMinutes: { label: '预计时长', aliases: ['预计时长', 'expectedDurationMinutes'] },
  energyDemand: { label: '精力要求', aliases: ['精力要求', 'energyDemand'] },
  brainDemand: { label: '脑力要求', aliases: ['脑力要求', 'brainDemand'] },
  physicalDemand: { label: '体力要求', aliases: ['体力要求', 'physicalDemand'] },
  availabilityContexts: { label: '可用场景', aliases: ['可用场景', 'availabilityContexts'] },
  recoveryIntent: { label: '恢复意图', aliases: ['恢复意图', 'recoveryIntent'] },
  seriesId: { label: '系列ID', aliases: ['系列ID', 'seriesId'] },
  recurrenceUnit: { label: '重复单位', aliases: ['重复单位', 'recurrenceUnit'] },
  recurrenceInterval: { label: '重复间隔', aliases: ['重复间隔', 'recurrenceInterval'] },
  recurrenceAnchor: { label: '重复锚点', aliases: ['重复锚点', 'recurrenceAnchor'] },
  seriesStartDate: { label: '系列开始日期', aliases: ['系列开始日期', 'seriesStartDate'] },
  currentTaskId: { label: '当前任务ID', aliases: ['当前任务ID', 'currentTaskId'] },
  rolloverPolicy: { label: '滚动策略', aliases: ['滚动策略', 'rolloverPolicy'] },
  taskId: { label: '任务ID', aliases: ['任务ID', 'taskId'] },
  sessionStartedAt: { label: '开始于', aliases: ['开始于', 'sessionStartedAt'] },
  sessionEndedAt: { label: '结束于', aliases: ['结束于', 'sessionEndedAt'] },
  sessionDurationMinutes: { label: '时长', aliases: ['时长', 'sessionDurationMinutes'] },
  sessionResult: { label: '结果', aliases: ['结果', 'sessionResult'] },
  sessionSource: { label: '来源', aliases: ['来源', 'sessionSource'] },
  suggestedDurationMinutes: { label: '建议时长', aliases: ['建议时长', 'suggestedDurationMinutes'] },
  startEnergyRecordId: { label: '开始精力记录ID', aliases: ['开始精力记录ID', 'startEnergyRecordId'] },
  endEnergyRecordId: { label: '结束精力记录ID', aliases: ['结束精力记录ID', 'endEnergyRecordId'] },
  energyDelta: { label: '精力变化', aliases: ['精力变化', 'energyDelta'] },
  brainDelta: { label: '脑力变化', aliases: ['脑力变化', 'brainDelta'] },
  physicalDelta: { label: '体力变化', aliases: ['体力变化', 'physicalDelta'] },
  templateId: { label: '模板ID', aliases: ['模板ID', 'templateId'] },
  templateSourceType: { label: '模板来源', aliases: ['模板来源', 'templateSourceType'] },
  startTime: { label: '时间', aliases: ['时间', 'startTime'] },
  endTime: { label: '结束', aliases: ['结束', 'endTime'] },
  duration: { label: '时长', aliases: ['时长', 'duration'] },
};

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function scalar(value: unknown): string {
  if (value == null) return '';
  if (Array.isArray(value)) return value.map(v => String(v).trim()).filter(Boolean).join(', ');
  if (typeof value === 'object') return '';
  return String(value).trim();
}

function resolvePatchField(rawKey: string): { label: string; aliases: string[] } {
  const normalized = rawKey.trim();
  const byCanonical = PATCH_FIELDS[normalized];
  if (byCanonical) return byCanonical;
  for (const definition of Object.values(PATCH_FIELDS)) {
    if (definition.aliases.some(alias => alias.toLowerCase() === normalized.toLowerCase())) return definition;
  }
  return { label: normalized, aliases: [normalized] };
}

export function patchRecordBlockMarkdown(markdown: string, patch: RecordPatch): string {
  const lines = markdown.split(/\r?\n/);
  const protectedKeys = new Set(['记录id','recordid','id','记录版本','recordversion','schemaversion','核心block','coreblock']);

  for (const [rawKey, value] of Object.entries(patch)) {
    const key = rawKey.trim();
    if (!key || protectedKeys.has(key.toLowerCase())) continue;
    const definition = resolvePatchField(key);
    const encoded = scalar(value);
    const contentIndex = lines.findIndex((line, i) => i > 0 && /^\s*(?:内容|content)\s*::/i.test(line));
    const metadataEnd = contentIndex >= 0 ? contentIndex : lines.length - 1;

    // Grammar V5 body is terminal. Replacing content replaces the whole body,
    // never just its first line, and metadata searches never enter body text.
    if (definition.label === '内容') {
      if (contentIndex >= 0) lines.splice(contentIndex, lines.length - 1 - contentIndex);
      if (encoded) {
        const bodyLines = encoded.replace(/\r\n/g, '\n').split('\n');
        lines.splice(lines.length - 1, 0, `内容:: ${bodyLines.shift() || ''}`, ...bodyLines);
      }
      continue;
    }

    const aliases = definition.aliases.map(alias => escapeRegex(alias)).join('|');
    const re = new RegExp(`^\\s*(?:${aliases})\\s*::`, 'i');
    const index = lines.findIndex((line, i) => i > 0 && i < metadataEnd && re.test(line));
    if (!encoded) {
      if (index >= 0) lines.splice(index, 1);
      continue;
    }
    const nextLine = `${definition.label}:: ${encoded.replace(/\r?\n/g, '\\n')}`;
    if (index >= 0) lines[index] = nextLine;
    else lines.splice(metadataEnd, 0, nextLine);
  }
  return lines.join('\n');
}

function appendRecordText(before: string, markdown: string, header?: string | null): string {
  if (header) return appendUnderHeaderText(before, header, markdown);
  return before.trim() ? `${before.trim()}\n\n${markdown}` : markdown;
}

export class RecordRepository {
  private readonly transaction: RecordMutationTransaction;

  constructor(
    private readonly vault: VaultPort,
    private readonly dataStore: DataStore,
  ) {
    this.transaction = new RecordMutationTransaction(vault);
  }

  async getById(recordId: string): Promise<RecordEntity | null> {
    return this.dataStore.getRecordEntityById(recordId);
  }

  async create(record: NewRecord): Promise<RecordEntity> {
    const recordId = record.recordId || createRecordId(record.coreBlock);
    await this.batch([{ kind: 'create', record: { ...record, recordId } }]);
    const created = this.dataStore.getRecordEntityById(recordId);
    if (!created) throw new Error(`record_create_scan_failed:${recordId}`);
    return created;
  }

  async update(recordId: string, patch: RecordPatch): Promise<RecordEntity> {
    await this.batch([{ kind: 'update', recordId, patch }]);
    const updated = this.dataStore.getRecordEntityById(recordId);
    if (!updated) throw new Error(`record_update_scan_failed:${recordId}`);
    return updated;
  }

  async delete(recordId: string): Promise<void> {
    await this.batch([{ kind: 'delete', recordId }]);
  }

  async batch(operations: RecordBatchOperation[]): Promise<RecordBatchResult> {
    const beforeByPath = new Map<string, string>();
    const afterByPath = new Map<string, string>();
    const createdRecordIds: string[] = [];
    const createdIdsInBatch = new Set<string>();

    const loadPath = async (path: string): Promise<string> => {
      if (!beforeByPath.has(path)) {
        const before = (await this.vault.readFile(path)) ?? '';
        beforeByPath.set(path, before);
        afterByPath.set(path, before);
      }
      return afterByPath.get(path) ?? '';
    };

    for (const operation of operations) {
      if (operation.kind === 'create') {
        const recordId = operation.record.recordId || createRecordId(operation.record.coreBlock);
        if (createdIdsInBatch.has(recordId) || this.dataStore.getRecordLocations(recordId).length > 0) {
          throw new Error(`record_id_duplicate_create:${recordId}`);
        }
        createdIdsInBatch.add(recordId);
        const markdown = encodeRecordBlock({
          recordId,
          schemaVersion: operation.record.schemaVersion ?? RECORD_SCHEMA_VERSION,
          coreBlock: operation.record.coreBlock,
          fields: operation.record.fields,
        });
        const current = await loadPath(operation.record.targetFilePath);
        afterByPath.set(
          operation.record.targetFilePath,
          appendRecordText(current, markdown, operation.record.targetHeader),
        );
        createdRecordIds.push(recordId);
        continue;
      }

      const location = this.dataStore.getRecordLocation(operation.recordId);
      if (!location) throw new Error(`record_location_unavailable:${operation.recordId}`);
      const current = await loadPath(location.path);
      const lines = current.split(/\r?\n/);
      const range = resolveRecordBlockRangeById(lines, operation.recordId, location.startLine - 1);
      if (operation.kind === 'delete') {
        lines.splice(range.startIndex, range.endIndex - range.startIndex + 1);
      } else {
        const currentBlock = lines.slice(range.startIndex, range.endIndex + 1).join('\n');
        const nextBlock = patchRecordBlockMarkdown(currentBlock, operation.patch);
        lines.splice(range.startIndex, range.endIndex - range.startIndex + 1, ...nextBlock.split('\n'));
      }
      afterByPath.set(location.path, lines.join('\n'));
    }

    const writes = [...afterByPath.entries()]
      .map(([path, after]) => ({ path, before: beforeByPath.get(path) ?? '', after }))
      .filter(write => write.before !== write.after);
    let committed;
    try {
      committed = await this.transaction.commit(writes);
    } catch (error) {
      if (error instanceof RecordTransactionRecoveryError) {
        this.dataStore.reportRecordIntegrityIssue({
          code: 'record_transaction_recovery_required',
          message: `Record transaction rollback was incomplete. Written: ${error.writtenPaths.join(', ')}; recovery failed: ${error.recoveryFailedPaths.join(', ')}.`,
        });
      }
      throw error;
    }
    const rescanFailures: Array<{ path: string; error: unknown }> = [];
    for (const path of committed.writtenPaths) {
      try {
        await this.dataStore.scanFileByPath(path, { bumpVersion: false, throwOnError: true });
      } catch (error) {
        rescanFailures.push({ path, error });
      }
    }
    if (committed.writtenPaths.length) this.dataStore.notifyChange();
    if (rescanFailures.length > 0) {
      throw new Error(`record_post_commit_rescan_failed:${rescanFailures.map(entry => entry.path).join(',')}`);
    }
    return { writtenPaths: committed.writtenPaths, createdRecordIds };
  }
}
