// src/core/services/inputService.ts
import { App, TFile, TFolder, moment } from 'obsidian';
import { AppStore } from '@state/AppStore';
import type { InputTemplate, TemplateFieldOptionValues } from '@core/domain/schema';

export class InputService {
  constructor(private app: App) {}

  /**
   * 简单的模板渲染引擎
   * @param templateString - 包含 {{key}} 或 {{key.subkey}} 的模板字符串
   * @param data - 包含表单数据和模板字段选项的对象
   * @returns 渲染后的字符串
   */
  private renderTemplate(templateString: string, data: Record<string, any>): string {
    return templateString.replace(/\{\{\s*([^}]+?)\s*\}\}/g, (_, placeholder) => {
      const key = placeholder.trim();
      
      // 处理动态日期 {{moment:YYYY-MM-DD}}
      if (key.startsWith('moment:')) {
        const format = key.substring(7);
        return moment().format(format);
      }
      
      const keys = key.split('.');
      let value = data;

      for (const k of keys) {
        if (value && typeof value === 'object' && k in value) {
          value = value[k];
        } else {
          return ''; // or return `{{${key}}}` to show missing value
        }
      }
      return value !== null && value !== undefined ? String(value) : '';
    });
  }

  /**
   * 执行一个录入模板
   * @param templateId - 要执行的模板的ID
   * @param formData - 从 QuickInputModal 收集的表单数据
   */
  public async executeTemplate(templateId: string, formData: Record<string, TemplateFieldOptionValues | string>) {
    const settings = AppStore.instance.getSettings().inputSettings;
    if (!settings || !settings.templates) {
      throw new Error("输入设置未找到。");
    }

    const template = settings.templates.find(t => t.id === templateId);
    if (!template) {
      throw new Error(`ID为 "${templateId}" 的模板未找到。`);
    }

    // 1. 准备渲染数据
    const renderData = { ...formData };

    // 2. 渲染最终输出内容
    const outputContent = this.renderTemplate(template.outputTemplate, renderData);

    // 3. 渲染目标文件路径和标题
    const targetFilePath = this.renderTemplate(template.targetFile, renderData);
    const header = template.appendUnderHeader ? this.renderTemplate(template.appendUnderHeader, renderData) : null;

    if (!targetFilePath) {
      throw new Error("模板未定义目标文件路径 (targetFile)。");
    }

    // 4. 写入文件
    const file = await this.getOrCreateFile(targetFilePath);
    if (header) {
      await this.appendUnderHeader(file, header, outputContent);
    } else {
      const existingContent = await this.app.vault.read(file);
      const newContent = existingContent ? `${existingContent}\n\n${outputContent}` : outputContent;
      await this.app.vault.modify(file, newContent);
    }
    return targetFilePath;
  }

  // --- 文件操作帮助函数 (与旧版类似，保持不变) ---
  private async ensureFolder(path: string) {
    const segs = path.split('/').filter(Boolean);
    let cur = '';
    for (const seg of segs) {
      cur = cur ? `${cur}/${seg}` : seg;
      const af = this.app.vault.getAbstractFileByPath(cur);
      if (!af) await this.app.vault.createFolder(cur).catch(() => {});
      else if (af instanceof TFile) throw new Error(`路径冲突：${cur} 是文件`);
    }
  }

  private async getOrCreateFile(fp: string): Promise<TFile> {
    const af = this.app.vault.getAbstractFileByPath(fp);
    if (af instanceof TFile) return af;
    if (af instanceof TFolder) throw new Error(`目标是文件夹：${fp}`);
    const folder = fp.includes('/') ? fp.slice(0, fp.lastIndexOf('/')) : '';
    if (folder) await this.ensureFolder(folder);
    return await this.app.vault.create(fp, '');
  }
  
  private async appendUnderHeader(file: TFile, header: string, payload: string) {
    const esc = header.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`^${esc}\\s*$`, 'm');
    const text = await this.app.vault.read(file);
    const lines = text.split('\n');

    let headerLineIndex = lines.findIndex(l => regex.test(l));

    if (headerLineIndex === -1) {
      if (lines.length && lines[lines.length - 1].trim() !== '') lines.push('');
      lines.push(header, '');
      headerLineIndex = lines.length - 2;
    }

    let insertAtIndex = lines.length;
    for (let i = headerLineIndex + 1; i < lines.length; i++) {
        // Find the next header of the same or higher level
        const match = lines[i].match(/^(#+)\s/);
        if (match && match[1].length <= header.match(/^(#+)\s/)?.[1].length) {
            insertAtIndex = i;
            break;
        }
    }
    
    // Add a blank line if the last line before insertion is not empty
    if (insertAtIndex > 0 && lines[insertAtIndex - 1].trim() !== '') {
        lines.splice(insertAtIndex, 0, '', payload);
    } else {
        lines.splice(insertAtIndex, 0, payload);
    }
    
    await this.app.vault.modify(file, lines.join('\n'));
  }
}