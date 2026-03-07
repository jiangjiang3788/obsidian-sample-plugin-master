// src/core/services/InputService.ts
// ---------------------------------------------------------------------------
// Phase2: core -> platform boundary
// - This service should not import 'obsidian'
// - All vault IO must go through VaultPort
// ---------------------------------------------------------------------------

import { singleton, inject } from 'tsyringe';
import type { BlockTemplate, ThemeDefinition } from '@/core/types/schema';
import { renderTemplate } from '@core/utils/templateUtils';
import type { VaultPort } from '@core/ports/VaultPort';
import { VAULT_PORT_TOKEN } from '@core/ports/VaultPort';

@singleton()
export class InputService {
  constructor(@inject(VAULT_PORT_TOKEN) private vault: VaultPort) {}

  /**
   * Execute a block template with the given form data.
   * - Renders output content & target file path
   * - Appends content to target file (optionally under a header)
   * - Returns the target file path
   */
  public async executeTemplate(
    template: BlockTemplate,
    formData: Record<string, any>,
    theme?: ThemeDefinition,
    templateMeta?: { templateId?: string | null; templateSourceType?: 'block' | 'override' | null }
  ): Promise<string> {
    if (!template) throw new Error('传入了无效的模板对象。');

    const renderData = {
      ...formData,
      block: { name: template.name, id: template.id, categoryKey: template.categoryKey },
      theme: theme ? { path: theme.path, icon: theme.icon || '' } : {},
      templateId: templateMeta?.templateId || template.id,
      templateSourceType: templateMeta?.templateSourceType || 'block',
    };

    const renderedContent = renderTemplate(template.outputTemplate, renderData).trim();
    const outputContent = this.injectTemplateMetadata(renderedContent, renderData.templateId, renderData.templateSourceType);
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



  private injectTemplateMetadata(
    outputContent: string,
    templateId?: string | null,
    templateSourceType?: 'block' | 'override' | null
  ): string {
    if (!templateId || !outputContent) return outputContent;

    if (/模板ID\s*[:：]{1,2}/.test(outputContent)) return outputContent;

    const sourceLine = templateSourceType ? `模板来源:: ${templateSourceType}` : '';

    if (outputContent.includes('<!-- start -->')) {
      const lines = outputContent.split('\n');
      const startIdx = lines.findIndex((line) => line.trim() === '<!-- start -->');
      if (startIdx !== -1) {
        const injectLines = [`模板ID:: ${templateId}`];
        if (sourceLine) injectLines.push(sourceLine);
        lines.splice(startIdx + 1, 0, ...injectLines);
        return lines.join('\n');
      }
    }

    const lines = outputContent.split('\n');
    const firstNonEmptyIndex = lines.findIndex((line) => line.trim() !== '');
    if (firstNonEmptyIndex !== -1 && /^\s*-\s*\[[ xX\-]?\]/.test(lines[firstNonEmptyIndex])) {
      lines[firstNonEmptyIndex] = `${lines[firstNonEmptyIndex]} (模板ID::${templateId})${sourceLine ? ` (模板来源::${templateSourceType})` : ''}`;
      return lines.join('\n');
    }

    const prefix = sourceLine ? `模板ID:: ${templateId}\n${sourceLine}\n` : `模板ID:: ${templateId}\n`;
    return `${prefix}${outputContent}`;
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
