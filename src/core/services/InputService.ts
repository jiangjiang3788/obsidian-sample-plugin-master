// src/core/services/InputService.ts
import { singleton, inject } from 'tsyringe';
import type { VaultPort } from '@core/ports/VaultPort';
import { VAULT_PORT_TOKEN } from '@core/ports/VaultPort';
import { renderTemplate } from '@core/utils/templateUtils';
import type { BlockTemplate, ThemeDefinition, Item } from '@core/types/schema';
import { DataStore } from '@core/services/DataStore';
import {
  resolveBlockRangeForMutation,
  resolveTaskLineIndexForMutation,
} from '@core/services/recordInput/mutationLocator';
import { createRecordConflictError } from '@core/services/recordInput/mutationErrors';

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
    templateMeta?: { templateId?: string | null; templateSourceType?: 'block' | 'override' | null },
  ): { renderData: Record<string, any>; outputContent: string; targetFilePath: string; header: string | null } {
    if (!template) throw new Error('传入了无效的模板对象。');

    const renderData = this.buildRenderData(template, formData, theme, templateMeta);
    const outputContent = renderTemplate(template.outputTemplate, renderData).trim();
    const targetFilePath = renderTemplate(template.targetFile, renderData).trim();
    const header = template.appendUnderHeader ? renderTemplate(template.appendUnderHeader, renderData) : null;

    return {
      renderData,
      outputContent,
      targetFilePath,
      header,
    };
  }

  async executeTemplate(
    template: BlockTemplate,
    formData: Record<string, any>,
    theme?: ThemeDefinition,
    templateMeta?: { templateId?: string | null; templateSourceType?: 'block' | 'override' | null },
    options: RecordWriteOptions = {},
  ): Promise<string> {
    const signal = options.signal;
    this.throwIfAborted(signal);
    const preview = this.previewTemplateExecution(template, formData, theme, templateMeta);
    const { outputContent, targetFilePath, header } = preview;

    if (!targetFilePath) throw new Error('模板未定义目标文件路径 (targetFile)。');
    this.throwIfAborted(signal);

    if (header) {
      await this.appendUnderHeader(targetFilePath, header, outputContent, signal);
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
    templateMeta?: { templateId?: string | null; templateSourceType?: 'block' | 'override' | null },
    options: RecordWriteOptions = {},
  ): Promise<string> {
    return this.executeTemplate(template, formData, theme, templateMeta, options);
  }

  async updateExistingRecord(
    item: Item,
    template: BlockTemplate,
    formData: Record<string, any>,
    theme?: ThemeDefinition,
    templateMeta?: { templateId?: string | null; templateSourceType?: 'block' | 'override' | null },
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

    const renderData = this.buildRenderData(template, formData, theme, templateMeta);
    const nextText = renderTemplate(template.outputTemplate, renderData).trim();
    if (!nextText) throw new Error('编辑后的输出内容为空，已取消保存。');

    const lines = existingContent.split('\n');
    const nextLines = nextText.split(/\r?\n/);
    const expectedIndex = Math.max(0, lineNo - 1);

    if (item.type === 'block') {
      const range = resolveBlockRangeForMutation(lines, item, expectedIndex);
      lines.splice(range.startIndex, range.endIndex - range.startIndex + 1, ...nextLines);
    } else {
      const startIndex = resolveTaskLineIndexForMutation(lines, item, expectedIndex);
      lines.splice(startIndex, 1, ...nextLines);
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

  private buildRenderData(
    template: BlockTemplate,
    formData: Record<string, any>,
    theme?: ThemeDefinition,
    templateMeta?: { templateId?: string | null; templateSourceType?: 'block' | 'override' | null },
  ) {
    const normalizedData: Record<string, any> = { ...formData };

    for (const field of template.fields || []) {
      const raw = normalizedData[field.key];
      if (!raw || typeof raw !== 'object') continue;

      const hasLabel = Object.prototype.hasOwnProperty.call(raw, 'label');
      const hasValue = Object.prototype.hasOwnProperty.call(raw, 'value');
      if (!hasLabel && !hasValue) continue;

      if (field.semanticType === 'ratingPair') {
        normalizedData[field.key] = { label: raw.label, value: raw.value };
        const auxKey = field.auxKey || '评图';
        if (raw.value !== undefined) normalizedData[auxKey] = raw.value;
      } else if (field.semanticType === 'path' || ['select', 'radio'].includes(field.type)) {
        normalizedData[field.key] = { label: raw.label, value: raw.value };
      }
    }

    return {
      ...normalizedData,
      block: { name: template.name, id: template.id, categoryKey: template.categoryKey },
      theme: theme ? { path: theme.path, icon: theme.icon || '' } : {},
      templateId: templateMeta?.templateId || template.id,
      templateSourceType: templateMeta?.templateSourceType || 'block',
    };
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

  private async appendUnderHeader(
    filePath: string,
    header: string,
    payload: string,
    signal?: AbortSignal,
  ): Promise<void> {
    const esc = header.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`^${esc}\\s*$`, 'm');

    const text = (await this.vault.readFile(filePath)) ?? '';
    this.throwIfAborted(signal);
    const lines = text.split('\n');

    let headerLineIndex = lines.findIndex((line) => regex.test(line));
    if (headerLineIndex === -1) {
      if (lines.length && lines[lines.length - 1].trim() !== '') lines.push('');
      lines.push(header, '');
      headerLineIndex = lines.length - 2;
    }

    let insertAtIndex = lines.length;
    const headerLevel = header.match(/^(#+)\s/)?.[1].length || 0;
    for (let index = headerLineIndex + 1; index < lines.length; index += 1) {
      const match = lines[index].match(/^(#+)\s/);
      if (match && match[1].length <= headerLevel) {
        insertAtIndex = index;
        break;
      }
    }

    if (insertAtIndex > 0 && lines[insertAtIndex - 1].trim() !== '') {
      lines.splice(insertAtIndex, 0, '', payload);
    } else {
      lines.splice(insertAtIndex, 0, payload);
    }

    this.throwIfAborted(signal);
    await this.vault.writeFile(filePath, lines.join('\n'));
  }
}
