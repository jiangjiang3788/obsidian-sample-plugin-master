// src/core/services/InputService.ts
import { singleton, inject } from 'tsyringe';
import type { VaultPort } from '@core/ports/VaultPort';
import { VAULT_PORT_TOKEN } from '@core/ports/VaultPort';
import type { RecordCaptureTemplate } from '@/core/recordInput/CaptureTemplate';
import type { RecordViewItem } from '@/core/records/RecordEntity';
import { DataStore } from '@core/services/DataStore';
import { resolveRecordBlockRangeById } from '@core/recordInput/mutationLocator';
import { createRecordConflictError } from '@core/recordInput/mutationErrors';
import { buildRecordOutputPlan } from '@core/recordInput/snapshot/OutputPlanner';
import { appendUnderHeaderText } from '@core/recordInput/mutation/HeaderAppender';
import { withRecordFileLocks, mutateRecordFile } from '@core/records/RecordFileCoordinator';
import { originalRecordCreatedAt, preserveRecordMetadataOnEdit } from '@core/recordInput/mutation/preserveFields';

export interface RecordWriteOptions {
  signal?: AbortSignal;
  autoRefresh?: boolean;
  /** Reuse an already allocated stable ID (create preview or move transaction). */
  recordId?: string;
  /** Invocation-only context. It may influence create orchestration but is never persisted as Record fields. */
  context?: Record<string, unknown> | null;
  /** Original persisted block for a path-changing edit. */
  sourceBlock?: string;
  /** Guard deletion after moving: do not erase changes made since source copy. */
  expectedRecordBlock?: string;
}


@singleton()
export class InputService {
  constructor(
    @inject(VAULT_PORT_TOKEN) private vault: VaultPort,
    @inject(DataStore) private dataStore: DataStore,
  ) {}

  previewTemplateExecution(
    template: RecordCaptureTemplate,
    formData: Record<string, any>,
    recordId?: string,
    context?: Record<string, unknown> | null,
  ): { recordId?: string | null; renderData: Record<string, any>; outputContent: string; targetFilePath: string; header: string | null } {
    if (!template) throw new Error('传入了无效的模板对象。');

    const outputPlan = buildRecordOutputPlan({ template, formData, recordId, context });
    return {
      recordId: outputPlan.recordId,
      renderData: outputPlan.renderData,
      outputContent: outputPlan.outputContent,
      targetFilePath: outputPlan.targetFilePath || '',
      header: outputPlan.targetHeader,
    };
  }

  async executeTemplate(
    template: RecordCaptureTemplate,
    formData: Record<string, any>,
    options: RecordWriteOptions = {},
  ): Promise<string> {
    const signal = options.signal;
    this.throwIfAborted(signal);
    const preview = this.previewTemplateExecution(template, formData, options.recordId, options.context);
    const { outputContent, targetFilePath, header } = preview;

    if (!targetFilePath) throw new Error('模板未定义目标文件路径。');
    return this.appendDirectRecord(targetFilePath, outputContent, header, options);
  }

  /**
   * Direct Record 共用落盘入口。
   * 不解析模板，只负责把已经生成好的稳定 Markdown 写到指定文件/目标标题下。
   */
  async appendDirectRecord(
    targetFilePath: string,
    outputContent: string,
    header: string | null = null,
    options: RecordWriteOptions = {},
  ): Promise<string> {
    const signal = options.signal;
    if (!targetFilePath) throw new Error('直接记录未定义目标文件路径。');
    if (!outputContent.trim()) throw new Error('直接记录输出内容为空。');
    this.throwIfAborted(signal);

    await withRecordFileLocks(this.vault, [targetFilePath], async () => {
      await mutateRecordFile(this.vault, targetFilePath, (existingContent) => {
        this.throwIfAborted(signal);
        const before = existingContent ?? '';
        // Stable Record IDs make a repeated commit idempotent after an uncertain
        // scan result; do not add a second copy in the same file.
        if (options.recordId) {
          const escapedId = options.recordId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          if (new RegExp(`^\\s*记录ID::\\s*${escapedId}\\s*$`, 'm').test(before)) {
            // A repeated ID is only idempotent if the exact payload was already
            // committed. Never skip a different payload and delete a moved source.
            if (before.replace(/\r\n/g, '\n').includes(outputContent.replace(/\r\n/g, '\n'))) return before;
            throw createRecordConflictError('record_write_conflict', `目标文件中已存在相同 ID 但内容不同的记录 ${options.recordId}。`);
          }
        }
        if (header) return appendUnderHeaderText(before, header, outputContent);
        return before.trim() ? `${before.trim()}\n\n${outputContent}` : outputContent;
      });
    });
    return targetFilePath;
  }



  /**
   * 计划第 6.5 步：安全迁移保存。
   * 只负责“先写新位置”，删除旧记录由 usecase 在确认写入成功后再执行。
   */
  async createRecordAtPlannedLocation(
    template: RecordCaptureTemplate,
    formData: Record<string, any>,
    options: RecordWriteOptions = {},
  ): Promise<string> {
    if (!options.sourceBlock) return this.executeTemplate(template, formData, options);
    const preview = this.previewTemplateExecution(template, formData, options.recordId, options.context);
    if (!preview.targetFilePath) throw new Error('模板未定义目标文件路径。');
    const merged = preserveRecordMetadataOnEdit(options.sourceBlock, preview.outputContent, template);
    return this.appendDirectRecord(preview.targetFilePath, merged, preview.header, options);
  }

  async readExistingRecordBlock(item: RecordViewItem): Promise<string> {
    const indexed = this.dataStore.getRecordLocation(item.id);
    const path = item.source?.path || item.file?.path || indexed?.path || '';
    const startLine = item.source?.startLine || item.file?.line || indexed?.startLine || 0;
    if (!path) throw createRecordConflictError('record_locator_invalid', `无法定位记录标识 ${item.id}。`);
    const content = await this.vault.readFile(path);
    if (content == null) throw createRecordConflictError('record_path_missing', `找不到文件：${path}`);
    const lines = content.split(/\r?\n/);
    const range = resolveRecordBlockRangeById(lines, item.id, startLine > 0 ? startLine - 1 : null);
    const originalBlock = lines.slice(range.startIndex, range.endIndex + 1).join('\n');
    this.assertOriginalRecordUnchanged(item, originalBlock);
    return originalBlock;
  }

  async updateExistingRecord(
    item: RecordViewItem,
    template: RecordCaptureTemplate,
    formData: Record<string, any>,
    options: RecordWriteOptions = {},
  ): Promise<string> {
    const signal = options.signal;
    const autoRefresh = options.autoRefresh !== false;
    this.throwIfAborted(signal);
    const indexed = this.dataStore.getRecordLocation(item.id);
    const path = item.source?.path || item.file?.path || indexed?.path || '';
    const startLine = item.source?.startLine || item.file?.line || indexed?.startLine || 0;
    if (!path) throw createRecordConflictError('record_locator_invalid', `无法定位记录标识 ${item.id}。`);

    await withRecordFileLocks(this.vault, [path], async () => {
      await mutateRecordFile(this.vault, path, (existingContent) => {
        if (existingContent == null) throw createRecordConflictError('record_path_missing', `找不到文件：${path}`);
        this.throwIfAborted(signal);
        const lines = existingContent.split('\n');
        const range = resolveRecordBlockRangeById(lines, item.id, startLine > 0 ? startLine - 1 : null);
        const originalBlock = lines.slice(range.startIndex, range.endIndex + 1).join('\n');
        this.assertOriginalRecordUnchanged(item, originalBlock);
        const createdAt = originalRecordCreatedAt(originalBlock) || item.createdAt;
        const preservedForm = item.recordType === 'task'
          ? { ...formData, ...(createdAt ? { createdAt } : {}), status: item.status, seriesId: item.seriesId }
          : formData;
        const outputPlan = buildRecordOutputPlan({ template, formData: preservedForm, recordId: item.id });
        const nextText = outputPlan.outputContent.trim();
        if (!nextText) throw new Error('编辑后的输出内容为空，已取消保存。');
        const merged = preserveRecordMetadataOnEdit(originalBlock, nextText, template);
        lines.splice(range.startIndex, range.endIndex - range.startIndex + 1, ...merged.split(/\r?\n/));
        return lines.join('\n');
      });
    });
    if (autoRefresh) {
      await this.dataStore.scanFileByPath(path);
      this.dataStore.notifyChange();
    }
    return path;
  }

  async deleteExistingRecord(item: RecordViewItem, options: RecordWriteOptions = {}): Promise<string> {
    const signal = options.signal;
    const autoRefresh = options.autoRefresh !== false;
    this.throwIfAborted(signal);
    const indexed = this.dataStore.getRecordLocation(item.id);
    const path = item.source?.path || item.file?.path || indexed?.path || '';
    const startLine = item.source?.startLine || item.file?.line || indexed?.startLine || 0;
    if (!path) throw createRecordConflictError('record_locator_invalid', `无法定位记录标识 ${item.id}。`);

    await withRecordFileLocks(this.vault, [path], async () => {
      await mutateRecordFile(this.vault, path, (existingContent) => {
        if (existingContent == null) throw createRecordConflictError('record_path_missing', `找不到文件：${path}`);
        this.throwIfAborted(signal);
        const lines = existingContent.split('\n');
        const range = resolveRecordBlockRangeById(lines, item.id, startLine > 0 ? startLine - 1 : null);
        const currentBlock = lines.slice(range.startIndex, range.endIndex + 1).join('\n');
        this.assertOriginalRecordUnchanged(item, currentBlock);
        if (options.expectedRecordBlock && currentBlock !== options.expectedRecordBlock) {
          throw createRecordConflictError('record_write_conflict', `原记录在迁移期间已被修改：${path}`);
        }
        lines.splice(range.startIndex, range.endIndex - range.startIndex + 1);
        return lines.join('\n');
      });
    });
    if (autoRefresh) {
      await this.dataStore.scanFileByPath(path);
      this.dataStore.notifyChange();
    }
    return path;
  }

  async isRecordWritten(path: string, recordId: string): Promise<boolean> {
    const content = await this.vault.readFile(path);
    if (content == null) return false;
    try {
      resolveRecordBlockRangeById(content.split(/\r?\n/), recordId);
      return true;
    } catch {
      return false;
    }
  }

  private assertOriginalRecordUnchanged(item: RecordViewItem, currentBlock: string): void {
    if (item.rawSource && item.rawSource.replace(/\r\n/g, '\n') !== currentBlock.replace(/\r\n/g, '\n')) {
      throw createRecordConflictError('record_write_conflict', `记录 ${item.id} 在编辑期间已被外部修改，请先重新扫描。`);
    }
  }

  private throwIfAborted(signal?: AbortSignal) {
    if (signal?.aborted) {
      const error = new Error('AbortError');
      (error as any).name = 'AbortError';
      throw error;
    }
  }

}