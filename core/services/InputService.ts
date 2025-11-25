// src/core/services/inputService.ts
import { singleton, inject } from 'tsyringe';
import { App, TFile, TFolder } from 'obsidian';
import type { BlockTemplate, ThemeDefinition } from '@/core/types/schema';
import { renderTemplate } from '@core/utils/templateUtils';
import { AppToken } from '@core/services/types';

@singleton()
export class InputService {
    // [核心修改] 构造函数通过 @inject 装饰器明确声明并接收 App 实例
    constructor(@inject(AppToken) private app: App) {}

    // [核心修改] init 方法已被彻底删除

    public async executeTemplate(template: BlockTemplate, formData: Record<string, any>, theme?: ThemeDefinition): Promise<string> {
        if (!template) throw new Error(`传入了无效的模板对象。`);

        const renderData = {
            ...formData,
            block: { name: template.name },
            theme: theme ? { path: theme.path, icon: theme.icon || '' } : {}
        };
        
        const outputContent = renderTemplate(template.outputTemplate, renderData).trim();
        const targetFilePath = renderTemplate(template.targetFile, renderData).trim();
        const header = template.appendUnderHeader ? renderTemplate(template.appendUnderHeader, renderData) : null;

        if (!targetFilePath) throw new Error("模板未定义目标文件路径 (targetFile)。");
        
        const file = await this.getOrCreateFile(targetFilePath);
        if (header) {
            await this.appendUnderHeader(file, header, outputContent);
        } else {
            const existingContent = await this.app.vault.read(file);
            const newContent = existingContent ? `${existingContent.trim()}\n\n${outputContent}` : outputContent;
            await this.app.vault.modify(file, newContent);
        }
        
        return targetFilePath;
    }
    
    public async getOrCreateFile(fp: string): Promise<TFile> {
        let file = this.app.vault.getAbstractFileByPath(fp);
        if (file instanceof TFile) {
            return file;
        }
        if (file instanceof TFolder) {
            throw new Error(`目标路径 "${fp}" 是一个文件夹，无法创建文件。`);
        }
        const folder = fp.includes('/') ? fp.slice(0, fp.lastIndexOf('/')) : '';
        if (folder) {
            await this.ensureFolder(folder);
        }
        try {
            return await this.app.vault.create(fp, '');
        } catch (error: any) {
            console.warn(`ThinkPlugin: 创建文件时遇到初始错误: ${error.message}. 正在尝试重新获取...`);
            await new Promise(resolve => setTimeout(resolve, 100));
            const existingFile = this.app.vault.getAbstractFileByPath(fp);
            if (existingFile instanceof TFile) {
                return existingFile;
            } else {
                console.error("ThinkPlugin: 文件创建失败，并且在捕获错误后仍无法找到该文件。", error);
                throw new Error(`创建文件 "${fp}" 失败。原始错误: ${error.message}`);
            }
        }
    }
    private async ensureFolder(path: string): Promise<void> {
        const segs = path.split('/').filter(Boolean);
        let cur = '';
        for (const seg of segs) {
            cur = cur ? `${cur}/${seg}` : seg;
            const af = this.app.vault.getAbstractFileByPath(cur);
            if (!af) {
                try {
                    await this.app.vault.createFolder(cur);
                } catch (e: any) {
                    throw new Error(`创建文件夹 "${cur}" 失败。请检查路径是否有效或存在权限问题。原始错误: ${e.message}`);
                }
            } else if (af instanceof TFile) {
                throw new Error(`路径冲突："${cur}" 是一个文件，无法在其下创建文件夹。`);
            }
        }
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
            const match = lines[i].match(/^(#+)\s/);
            if (match && match[1].length <= (header.match(/^(#+)\s/)?.[1].length || 0)) {
                insertAtIndex = i;
                break;
            }
        }
        if (insertAtIndex > 0 && lines[insertAtIndex - 1].trim() !== '') {
            lines.splice(insertAtIndex, 0, '', payload);
        } else {
            lines.splice(insertAtIndex, 0, payload);
        }
        await this.app.vault.modify(file, lines.join('\n'));
    }
}
