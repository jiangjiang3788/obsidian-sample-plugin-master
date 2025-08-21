// src/core/services/inputService.ts
import { App, TFile, TFolder, moment } from 'obsidian';
import type { BlockTemplate, ThemeDefinition } from '@core/domain/schema';

export class InputService {
    constructor(private app: App) { }

    private renderTemplate(templateString: string, data: Record<string, any>): string {
        return templateString.replace(/\{\{\s*([^}]+?)\s*\}\}/g, (_, placeholder) => {
            const key = placeholder.trim();

            // [新增] 优先处理简化后的快捷变量
            if (key === 'block') return data.block?.name || '';
            if (key === 'theme') return data.theme?.path || '';
            if (key === 'icon') return data.theme?.icon || '';

            // 处理 moment 动态日期
            if (key.startsWith('moment:')) {
                const format = key.substring(7);
                return moment().format(format);
            }

            // 处理标准的点状表示法 (e.g., my_field.value)
            const keys = key.split('.');
            let value: any = data;
            for (const k of keys) {
                if (value && typeof value === 'object' && k in value) {
                    value = value[k];
                } else {
                    // 如果路径中断，返回空字符串
                    return '';
                }
            }
            
            // 如果最终结果是一个包含 .value 的对象（来自下拉/单选/文本字段），则提取其 .value
            if (typeof value === 'object' && value !== null && 'value' in value) {
                return String((value as any).value);
            }

            return value !== null && value !== undefined ? String(value) : '';
        });
    }

    /**
     * [核心修改] executeTemplate 现在接收一个可选的 theme 对象
     * @param template - 一个完整的 BlockTemplate 对象
     * @param formData - 从 QuickInputModal 收集的表单数据
     * @param theme - (可选) 当前命令关联的主题对象
     */
    public async executeTemplate(template: BlockTemplate, formData: Record<string, any>, theme?: ThemeDefinition): Promise<string> {
        if (!template) {
            throw new Error(`传入了无效的模板对象。`);
        }

        const renderData = { 
            ...formData, 
            block: { name: template.name },
            theme: theme ? { path: theme.path, icon: theme.icon || '' } : {}
        };

        const outputContent = this.renderTemplate(template.outputTemplate, renderData).trim();
        const targetFilePath = this.renderTemplate(template.targetFile, renderData).trim();
        const header = template.appendUnderHeader ? this.renderTemplate(template.appendUnderHeader, renderData) : null;

        if (!targetFilePath) {
            throw new Error("模板未定义目标文件路径 (targetFile)。");
        }
        if (!outputContent) {
            throw new Error("渲染后的输出内容为空。");
        }
        
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

    // ... getOrCreateFile, ensureFolder, appendUnderHeader 等函数保持不变 ...
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

    private async getOrCreateFile(fp: string): Promise<TFile> {
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