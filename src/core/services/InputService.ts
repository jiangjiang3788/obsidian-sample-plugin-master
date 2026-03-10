// src/core/services/InputService.ts
import { singleton, inject } from 'tsyringe';
import type { VaultPort } from '@core/ports/VaultPort';
import { VAULT_PORT_TOKEN } from '@core/ports/VaultPort';
import { renderTemplate } from '@core/utils/templateUtils';
import type { BlockTemplate, ThemeDefinition, Item } from '@core/types/schema';
import { DataStore } from '@core/services/DataStore';

@singleton()
export class InputService {
  constructor(
    @inject(VAULT_PORT_TOKEN) private vault: VaultPort,
    @inject(DataStore) private dataStore: DataStore,
  ) {}

  async executeTemplate(
    template: BlockTemplate,
    formData: Record<string, any>,
    theme?: ThemeDefinition,
    templateMeta?: { templateId?: string | null; templateSourceType?: 'block' | 'override' | null }
  ): Promise<string> {
    if (!template) throw new Error('传入了无效的模板对象。');

    const renderData = this.buildRenderData(template, formData, theme, templateMeta);
    const outputContent = renderTemplate(template.outputTemplate, renderData).trim();
    const targetFilePath = renderTemplate(template.targetFile, renderData).trim();
    const header = template.appendUnderHeader ? renderTemplate(template.appendUnderHeader, renderData) : null;

    if (!targetFilePath) throw new Error('模板未定义目标文件路径 (targetFile)。');

    if (header) {
      await this.appendUnderHeader(targetFilePath, header, outputContent);
      return targetFilePath;
    }

    const existingContent = await this.vault.readFile(targetFilePath);
    const newContent = existingContent ? `${existingContent.trim()}\n\n${outputContent}` : outputContent;
    await this.vault.writeFile(targetFilePath, newContent);
    return targetFilePath;
  }

  async updateExistingRecord(
    item: Item,
    template: BlockTemplate,
    formData: Record<string, any>,
    theme?: ThemeDefinition,
    templateMeta?: { templateId?: string | null; templateSourceType?: 'block' | 'override' | null },
    signal?: AbortSignal,
  ): Promise<string> {
    this.throwIfAborted(signal);
    const path = item.file?.path || this.parseItemId(item.id).path;
    const lineNo = item.file?.line || this.parseItemId(item.id).lineNo;
    if (!path || !lineNo) throw new Error('无法定位原始记录。');

    const existingContent = await this.vault.readFile(path);
    if (existingContent == null) throw new Error(`找不到文件: ${path}`);
    this.throwIfAborted(signal);

    const renderData = this.buildRenderData(template, formData, theme, templateMeta);
    const nextText = renderTemplate(template.outputTemplate, renderData).trim();
    if (!nextText) throw new Error('编辑后的输出内容为空，已取消保存。');

    const lines = existingContent.split('\n');
    const nextLines = nextText.split(/\r?\n/);
    const startIndex = Math.max(0, lineNo - 1);

    if (item.type === 'block') {
      const endIndex = this.findBlockEndIndex(lines, startIndex);
      lines.splice(startIndex, endIndex - startIndex + 1, ...nextLines);
    } else {
      lines.splice(startIndex, 1, ...nextLines);
    }

    await this.vault.writeFile(path, lines.join('\n'));
    this.throwIfAborted(signal);
    await this.dataStore.scanFileByPath(path);
    this.dataStore.notifyChange();
    return path;
  }

  private buildRenderData(
    template: BlockTemplate,
    formData: Record<string, any>,
    theme?: ThemeDefinition,
    templateMeta?: { templateId?: string | null; templateSourceType?: 'block' | 'override' | null }
  ) {
    const normalizedData: Record<string, any> = { ...formData };

    for (const field of template.fields || []) {
      const raw = normalizedData[field.key];
      if (!raw || typeof raw !== 'object') continue;

      const hasLabel = Object.prototype.hasOwnProperty.call(raw, 'label');
      const hasValue = Object.prototype.hasOwnProperty.call(raw, 'value');
      if (!hasLabel && !hasValue) continue;

      // 保留对象本体，供 {{字段.value}} / {{字段.label}} 使用；
      // 同时补充语义辅助键，方便评分/路径型字段统一。
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
    if (hashIndex === -1) throw new Error(`无效的条目ID格式: ${itemId}`);
    const path = itemId.substring(0, hashIndex);
    const lineNo = parseInt(itemId.substring(hashIndex + 1), 10);
    if (!path || Number.isNaN(lineNo)) throw new Error(`无效的条目ID格式: ${itemId}`);
    return { path, lineNo };
  }

  private findBlockEndIndex(lines: string[], startIndex: number): number {
    for (let i = startIndex; i < lines.length; i++) {
      if (lines[i].trim() === '<!-- end -->') return i;
    }
    throw new Error('未找到 block 结束标记 <!-- end -->。');
  }

  private throwIfAborted(signal?: AbortSignal) {
    if (signal?.aborted) {
      const error = new Error('AbortError');
      (error as any).name = 'AbortError';
      throw error;
    }
  }

  // ---------------------------------------------------------------------------
  // Internal helpers
  // ---------------------------------------------------------------------------

  /**
   * Append payload under a markdown header.
   * - If header doesn't exist, it will be appended at EOF.
   * - If file doesn't exist, it will be created.
   */
  private async appendUnderHeader(filePath: string, header: string, payload: string): Promise<void> {
    const esc = header.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`^${esc}\\s*$`, 'm');

    const text = (await this.vault.readFile(filePath)) ?? '';
    const lines = text.split('\n');

    let headerLineIndex = lines.findIndex((l) => regex.test(l));
    if (headerLineIndex === -1) {
      if (lines.length && lines[lines.length - 1].trim() !== '') lines.push('');
      lines.push(header, '');
      headerLineIndex = lines.length - 2;
    }

    let insertAtIndex = lines.length;
    const headerLevel = header.match(/^(#+)\s/)?.[1].length || 0;
    for (let i = headerLineIndex + 1; i < lines.length; i++) {
      const match = lines[i].match(/^(#+)\s/);
      if (match && match[1].length <= headerLevel) {
        insertAtIndex = i;
        break;
      }
    }

    if (insertAtIndex > 0 && lines[insertAtIndex - 1].trim() !== '') {
      lines.splice(insertAtIndex, 0, '', payload);
    } else {
      lines.splice(insertAtIndex, 0, payload);
    }

    await this.vault.writeFile(filePath, lines.join('\n'));
  }
}
