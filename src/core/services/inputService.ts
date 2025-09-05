// src/core/services/inputService.ts
import { singleton } from 'tsyringe';
import { App, TFile, TFolder, moment } from 'obsidian';
import type { BlockTemplate, ThemeDefinition } from '@core/domain/schema';

@singleton()
export class InputService {
    private app!: App;

    // [核心修复] 构造函数变为空
    constructor() { }

    // [核心修复] 新增 init 方法
    public init(app: App) {
        this.app = app;
    }

    // ... 所有其他方法保持不变 ...
    public renderTemplate(templateString: string, data: Record<string, any>): string {
        return templateString.replace(/\{\{\s*([^}]+?)\s*\}\}/g, (_, placeholder) => {
            const key = placeholder.trim();
            let result = '';

            try {
                if (key === 'block') {
                    result = data.block?.name || '';
                } else if (key === 'theme') {
                    result = data.theme?.path || '';
                } else if (key === 'icon') {
                    result = data.theme?.icon || '';
                } else if (key.startsWith('moment:')) {
                    const format = key.substring(7);
                    result = moment().format(format);
                } else {
                    const keys = key.split('.');
                    const rootKey = keys[0];
                    
                    if (!(rootKey in data)) {
                        return '';
                    }

                    let value: any = data[rootKey];
                    if (keys.length > 1) {
                        for (let i = 1; i < keys.length; i++) {
                            if (value && typeof value === 'object' && keys[i] in value) {
                                value = value[keys[i]];
                            } else {
                                value = '';
                                break;
                            }
                        }
                    }

                    if (typeof value === 'object' && value !== null && 'label' in value) {
                        result = String(value.label);
                    } else {
                        result = value !== null && value !== undefined ? String(value) : '';
                    }
                }
                return result;
            } catch (e: any) {
                console.error(`[ThinkPlugin] 解析模板变量 {{${key}}} 时发生错误:`, e);
                return `(解析错误: ${key})`;
            }
        });
    }

    public async executeTemplate(template: BlockTemplate, formData: Record<string, any>, theme?: ThemeDefinition): Promise<string> {
        if (!template) throw new Error(`传入了无效的模板对象。`);

        const renderData = {
            ...formData,
            block: { name: template.name },
            theme: theme ? { path: theme.path, icon: theme.icon || '' } : {}
        };
        
        const outputContent = this.renderTemplate(template.outputTemplate, renderData).trim();
        const targetFilePath = this.renderTemplate(template.targetFile, renderData).trim();
        const header = template.appendUnderHeader ? this.renderTemplate(template.appendUnderHeader, renderData) : null;

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