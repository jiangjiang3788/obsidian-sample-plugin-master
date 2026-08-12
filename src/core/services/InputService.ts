// src/core/services/InputService.ts
import { singleton, inject } from 'tsyringe';
import type { VaultPort } from '@core/ports/VaultPort';
import { VAULT_PORT_TOKEN } from '@core/ports/VaultPort';
import type { RecordCaptureTemplate } from '@/core/recordInput/CaptureTemplate';
import type { ThemeDefinition } from '@/core/theme/ThemeDefinition';
import type { RecordViewItem } from '@/core/records/RecordEntity';
import { DataStore } from '@core/services/DataStore';
import { resolveRecordBlockRangeById } from '@core/recordInput/mutationLocator';
import { createRecordConflictError } from '@core/recordInput/mutationErrors';
import { buildRecordOutputPlan } from '@core/recordInput/snapshot/OutputPlanner';
import { appendUnderHeader } from '@core/recordInput/mutation/HeaderAppender';

export interface RecordWriteOptions {
  signal?: AbortSignal;
  autoRefresh?: boolean;
  /** Reuse an already allocated stable ID (create preview or move transaction). */
  recordId?: string;
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
    theme?: ThemeDefinition,
    templateMeta?: { templateId?: string | null; templateSourceType?: 'core-block' | 'goal-template' | null },
    recordId?: string,
  ): { recordId?: string | null; renderData: Record<string, any>; outputContent: string; targetFilePath: string; header: string | null } {
    if (!template) throw new Error('传入了无效的模板对象。');

    const outputPlan = buildRecordOutputPlan({ template, formData, theme, templateMeta, recordId });
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
    theme?: ThemeDefinition,
    templateMeta?: { templateId?: string | null; templateSourceType?: 'core-block' | 'goal-template' | null },
    options: RecordWriteOptions = {},
  ): Promise<string> {
    const signal = options.signal;
    this.throwIfAborted(signal);
    const preview = this.previewTemplateExecution(template, formData, theme, templateMeta, options.recordId);
    const { outputContent, targetFilePath, header } = preview;

    if (!targetFilePath) throw new Error('模板未定义目标文件路径 (targetFile)。');
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
    if (!targetFilePath) throw new Error('Direct Record 未定义目标文件路径。');
    if (!outputContent.trim()) throw new Error('Direct Record 输出内容为空。');
    this.throwIfAborted(signal);

    if (header) {
      await appendUnderHeader(this.vault, targetFilePath, header, outputContent, {
        signal,
        throwIfAborted: (currentSignal) => this.throwIfAborted(currentSignal),
      });
      return targetFilePath;
    }

    const existingContent = await this.vault.readFile(targetFilePath);
    this.throwIfAborted(signal);
    const newContent = existingContent ? `${existingContent.trim()}\n\n${outputContent}` : outputContent;
    await this.vault.writeFile(targetFilePath, newContent);
    return targetFilePath;
  }



  /**
   * 计划第 6.5 步：安全迁移保存。
   * 只负责“先写新位置”，删除旧记录由 usecase 在确认写入成功后再执行。
   */
  async createRecordAtPlannedLocation(
    template: RecordCaptureTemplate,
    formData: Record<string, any>,
    theme?: ThemeDefinition,
    templateMeta?: { templateId?: string | null; templateSourceType?: 'core-block' | 'goal-template' | null },
    options: RecordWriteOptions = {},
  ): Promise<string> {
    return this.executeTemplate(template, formData, theme, templateMeta, options);
  }

  async updateExistingRecord(
    item: RecordViewItem,
    template: RecordCaptureTemplate,
    formData: Record<string, any>,
    theme?: ThemeDefinition,
    templateMeta?: { templateId?: string | null; templateSourceType?: 'core-block' | 'goal-template' | null },
    options: RecordWriteOptions = {},
  ): Promise<string> {
    const signal = options.signal;
    const autoRefresh = options.autoRefresh !== false;
    this.throwIfAborted(signal);
    const indexed = this.dataStore.getRecordLocation(item.id);
    const path = item.source?.path || item.file?.path || indexed?.path || '';
    const startLine = item.source?.startLine || item.file?.line || indexed?.startLine || 0;
    if (!path) throw createRecordConflictError('record_locator_invalid', `无法定位记录ID ${item.id}。`);

    const existingContent = await this.vault.readFile(path);
    if (existingContent == null) throw createRecordConflictError('record_path_missing', `找不到文件: ${path}`);
    this.throwIfAborted(signal);

    const outputPlan = buildRecordOutputPlan({ template, formData, theme, templateMeta, recordId: item.id });
    const nextText = outputPlan.outputContent.trim();
    if (!nextText) throw new Error('编辑后的输出内容为空，已取消保存。');

    const lines = existingContent.split('\n');
    const range = resolveRecordBlockRangeById(lines, item.id, startLine > 0 ? startLine - 1 : null);
    lines.splice(range.startIndex, range.endIndex - range.startIndex + 1, ...nextText.split(/\r?\n/));

    await this.vault.writeFile(path, lines.join('\n'));
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
    if (!path) throw createRecordConflictError('record_locator_invalid', `无法定位记录ID ${item.id}。`);

    const existingContent = await this.vault.readFile(path);
    if (existingContent == null) throw createRecordConflictError('record_path_missing', `找不到文件: ${path}`);
    this.throwIfAborted(signal);

    const lines = existingContent.split('\n');
    const range = resolveRecordBlockRangeById(lines, item.id, startLine > 0 ? startLine - 1 : null);
    lines.splice(range.startIndex, range.endIndex - range.startIndex + 1);
    await this.vault.writeFile(path, lines.join('\n'));
    if (autoRefresh) {
      await this.dataStore.scanFileByPath(path);
      this.dataStore.notifyChange();
    }
    return path;
  }

  private throwIfAborted(signal?: AbortSignal) {
    if (signal?.aborted) {
      const error = new Error('AbortError');
      (error as any).name = 'AbortError';
      throw error;
    }
  }

}