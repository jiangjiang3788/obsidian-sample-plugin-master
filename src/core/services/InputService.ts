// src/core/services/InputService.ts
import { singleton, inject } from 'tsyringe';
import type { VaultPort } from '@core/ports/VaultPort';
import { VAULT_PORT_TOKEN } from '@core/ports/VaultPort';
import type { BlockTemplate, ThemeDefinition, Item } from '@core/types/schema';
import { DataStore } from '@core/services/DataStore';
import {
  resolveBlockRangeForMutation,
  resolveTaskLineIndexForMutation,
} from '@core/recordInput/mutationLocator';
import { createRecordConflictError } from '@core/recordInput/mutationErrors';
import { buildRecordOutputPlan } from '@core/recordInput/snapshot/OutputPlanner';
import { appendUnderHeader } from '@core/recordInput/mutation/HeaderAppender';
import { mergeTaskLinePreservingSourceContext } from '@core/recordInput/mutation/TaskLinePatch';

export interface RecordWriteOptions {
  signal?: AbortSignal;
  autoRefresh?: boolean;
}


@singleton()
export class InputService {
  constructor(
    @inject(VAULT_PORT_TOKEN) private vault: VaultPort,
    @inject(DataStore) private dataStore: DataStore,
  ) {}

  previewTemplateExecution(
    template: BlockTemplate,
    formData: Record<string, any>,
    theme?: ThemeDefinition,
    templateMeta?: { templateId?: string | null; templateSourceType?: 'core-block' | 'goal-template' | null },
  ): { renderData: Record<string, any>; outputContent: string; targetFilePath: string; header: string | null } {
    if (!template) throw new Error('传入了无效的模板对象。');

    const outputPlan = buildRecordOutputPlan({ template, formData, theme, templateMeta });
    return {
      renderData: outputPlan.renderData,
      outputContent: outputPlan.outputContent,
      targetFilePath: outputPlan.targetFilePath || '',
      header: outputPlan.targetHeader,
    };
  }

  async executeTemplate(
    template: BlockTemplate,
    formData: Record<string, any>,
    theme?: ThemeDefinition,
    templateMeta?: { templateId?: string | null; templateSourceType?: 'core-block' | 'goal-template' | null },
    options: RecordWriteOptions = {},
  ): Promise<string> {
    const signal = options.signal;
    this.throwIfAborted(signal);
    const preview = this.previewTemplateExecution(template, formData, theme, templateMeta);
    const { outputContent, targetFilePath, header } = preview;

    if (!targetFilePath) throw new Error('模板未定义目标文件路径 (targetFile)。');
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
    template: BlockTemplate,
    formData: Record<string, any>,
    theme?: ThemeDefinition,
    templateMeta?: { templateId?: string | null; templateSourceType?: 'core-block' | 'goal-template' | null },
    options: RecordWriteOptions = {},
  ): Promise<string> {
    return this.executeTemplate(template, formData, theme, templateMeta, options);
  }

  async updateExistingRecord(
    item: Item,
    template: BlockTemplate,
    formData: Record<string, any>,
    theme?: ThemeDefinition,
    templateMeta?: { templateId?: string | null; templateSourceType?: 'core-block' | 'goal-template' | null },
    options: RecordWriteOptions = {},
  ): Promise<string> {
    const signal = options.signal;
    const autoRefresh = options.autoRefresh !== false;
    this.throwIfAborted(signal);
    const path = item.file?.path || this.parseItemId(item.id).path;
    const lineNo = item.file?.line || this.parseItemId(item.id).lineNo;
    if (!path || !lineNo) {
      throw createRecordConflictError('record_locator_invalid', '无法定位原始记录。');
    }

    const existingContent = await this.vault.readFile(path);
    if (existingContent == null) {
      throw createRecordConflictError('record_path_missing', `找不到文件: ${path}`);
    }
    this.throwIfAborted(signal);

    const outputPlan = buildRecordOutputPlan({ template, formData, theme, templateMeta });
    const nextText = outputPlan.outputContent.trim();
    if (!nextText) throw new Error('编辑后的输出内容为空，已取消保存。');

    const lines = existingContent.split('\n');
    const nextLines = nextText.split(/\r?\n/);
    const expectedIndex = Math.max(0, lineNo - 1);

    if (item.type === 'block') {
      const range = resolveBlockRangeForMutation(lines, item, expectedIndex);
      lines.splice(range.startIndex, range.endIndex - range.startIndex + 1, ...nextLines);
    } else {
      const startIndex = resolveTaskLineIndexForMutation(lines, item, expectedIndex);
      const preservedTaskText = mergeTaskLinePreservingSourceContext(lines[startIndex] || item.rawSource || item.content || '', nextText);
      lines.splice(startIndex, 1, ...preservedTaskText.split(/\r?\n/));
    }

    await this.vault.writeFile(path, lines.join('\n'));
    if (autoRefresh) {
      await this.dataStore.scanFileByPath(path);
      this.dataStore.notifyChange();
    }
    return path;
  }

  async deleteExistingRecord(item: Item, options: RecordWriteOptions = {}): Promise<string> {
    const signal = options.signal;
    const autoRefresh = options.autoRefresh !== false;
    this.throwIfAborted(signal);
    const path = item.file?.path || this.parseItemId(item.id).path;
    const lineNo = item.file?.line || this.parseItemId(item.id).lineNo;
    if (!path || !lineNo) {
      throw createRecordConflictError('record_locator_invalid', '无法定位原始记录。');
    }

    const existingContent = await this.vault.readFile(path);
    if (existingContent == null) {
      throw createRecordConflictError('record_path_missing', `找不到文件: ${path}`);
    }
    this.throwIfAborted(signal);

    const lines = existingContent.split('\n');
    const expectedIndex = Math.max(0, lineNo - 1);

    if (item.type === 'block') {
      const range = resolveBlockRangeForMutation(lines, item, expectedIndex);
      lines.splice(range.startIndex, range.endIndex - range.startIndex + 1);
    } else {
      const startIndex = resolveTaskLineIndexForMutation(lines, item, expectedIndex);
      lines.splice(startIndex, 1);
    }

    await this.vault.writeFile(path, lines.join('\n'));
    if (autoRefresh) {
      await this.dataStore.scanFileByPath(path);
      this.dataStore.notifyChange();
    }
    return path;
  }

  private parseItemId(itemId: string): { path: string; lineNo: number } {
    const hashIndex = itemId.lastIndexOf('#');
    if (hashIndex === -1) throw createRecordConflictError('record_locator_invalid', `无效的条目ID格式: ${itemId}`);
    const path = itemId.substring(0, hashIndex);
    const lineNo = parseInt(itemId.substring(hashIndex + 1), 10);
    if (!path || Number.isNaN(lineNo)) {
      throw createRecordConflictError('record_locator_invalid', `无效的条目ID格式: ${itemId}`);
    }
    return { path, lineNo };
  }

  private throwIfAborted(signal?: AbortSignal) {
    if (signal?.aborted) {
      const error = new Error('AbortError');
      (error as any).name = 'AbortError';
      throw error;
    }
  }

}