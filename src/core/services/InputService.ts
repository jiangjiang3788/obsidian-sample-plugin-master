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


function uniqPreserveOrder(values: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    const cleaned = value.trim();
    if (!cleaned || seen.has(cleaned)) continue;
    seen.add(cleaned);
    result.push(cleaned);
  }
  return result;
}

function extractTaskContextTokens(line: string): string[] {
  const source = String(line || '');
  const tokens: string[] = [];

  for (const match of source.matchAll(/#[\p{L}\p{N}_-]+/gu)) tokens.push(match[0]);
  for (const match of source.matchAll(/[📅⏳🛫➕✅❌]\s*\d{4}[-/]\d{2}[-/]\d{2}/gu)) tokens.push(match[0]);
  for (const match of source.matchAll(/🔁\s*every\s+(?:\d+\s+)?(?:day|week|month|year)s?(?:\s+when\s+done)?/giu)) tokens.push(match[0]);
  for (const match of source.matchAll(/[\(\[][^[\]()]*::[^\)\]]*[\)\]]/g)) tokens.push(match[0]);

  return uniqPreserveOrder(tokens);
}

function getTaskContextTokenIdentity(token: string): { kind: 'tag' | 'emoji-date' | 'recurrence' | 'kv' | 'literal'; key: string } {
  const trimmed = token.trim();
  if (trimmed.startsWith('#')) return { kind: 'tag', key: trimmed };
  const emoji = trimmed.match(/^([📅⏳🛫➕✅❌])/u)?.[1];
  if (emoji) return { kind: 'emoji-date', key: emoji };
  if (/^🔁/u.test(trimmed)) return { kind: 'recurrence', key: '🔁' };
  const kv = trimmed.match(/^[\(\[]\s*([^:\]\)]+?)\s*::/);
  if (kv?.[1]) return { kind: 'kv', key: kv[1].trim() };
  return { kind: 'literal', key: trimmed };
}

function taskLineContainsTokenIdentity(line: string, token: string): boolean {
  const identity = getTaskContextTokenIdentity(token);
  if (identity.kind === 'tag' || identity.kind === 'literal') return line.includes(identity.key);
  if (identity.kind === 'emoji-date' || identity.kind === 'recurrence') return line.includes(identity.key);
  if (identity.kind === 'kv') {
    const escaped = identity.key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`[\\(\\[]\\s*${escaped}\\s*::`).test(line);
  }
  return false;
}

function preserveTaskCheckboxStatus(originalLine: string, nextLine: string): string {
  const original = originalLine.match(/^(\s*[-*]\s*\[)([ xX-])(\]\s*)/);
  const next = nextLine.match(/^(\s*[-*]\s*\[)([ xX-])(\]\s*)/);
  if (!original || !next) return nextLine;
  if (original[2] === next[2]) return nextLine;
  return nextLine.replace(/^(\s*[-*]\s*\[)[ xX-](\]\s*)/, `$1${original[2]}$2`);
}

/**
 * SNAPSHOT-MIGRATION: task write-back safety layer.
 * The snapshot path is still replacing the rendered task line in-place. Until task
 * patch update is fully implemented, preserve source-line context tokens that are
 * not represented by the new template output. This avoids losing unknown tags,
 * emoji dates, recurrence marks, and custom `(key::value)` metadata during edit.
 */
function mergeTaskLinePreservingSourceContext(originalLine: string, renderedText: string): string {
  const nextLines = renderedText.split(/\r?\n/);
  if (nextLines.length !== 1) return renderedText;

  let nextLine = preserveTaskCheckboxStatus(originalLine, nextLines[0]);
  const tokensToAppend = extractTaskContextTokens(originalLine)
    .filter((token) => !taskLineContainsTokenIdentity(nextLine, token));

  if (!tokensToAppend.length) return nextLine;
  return `${nextLine.trimEnd()} ${tokensToAppend.join(' ')}`.trimEnd();
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
