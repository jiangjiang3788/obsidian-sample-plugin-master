// src/core/services/inputService.ts
import { App, TFile, TFolder, moment } from 'obsidian';
// [修改] 导入新的 BlockTemplate 类型，不再需要 InputTemplate
import type { BlockTemplate } from '@core/domain/schema';

export class InputService {
    constructor(private app: App) { }

    /**
     * 模板渲染引擎 (保持不变)
     * @param templateString - 包含 {{key}} 或 {{key.subkey}} 的模板字符串
     * @param data - 包含表单数据的对象
     * @returns 渲染后的字符串
     */
    private renderTemplate(templateString: string, data: Record<string, any>): string {
        return templateString.replace(/\{\{\s*([^}]+?)\s*\}\}/g, (_, placeholder) => {
            const key = placeholder.trim();

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
                    return ''; // or `{{${key}}}` to show missing value
                }
            }
            return value !== null && value !== undefined ? String(value) : '';
        });
    }

    /**
     * [重构] 执行一个录入模板
     * @param template - 一个完整的、已经合并了覆写规则的 BlockTemplate 对象
     * @param formData - 从 QuickInputModal 收集的表单数据
     */
    public async executeTemplate(template: BlockTemplate, formData: Record<string, any>): Promise<string> {
        if (!template) {
            throw new Error(`传入了无效的模板对象。`);
        }
        
        // 1. 准备渲染数据
        // 将所有字段的 key-value 对平铺到 renderData 中
        // 例如，如果一个字段的 key 是 'status', 其选择的 option 是 { value: 'done', label: '完成', extra: '✅' }
        // 那么 renderData 中将会有 status.value, status.label, status.extra
        const renderData = { ...formData };
        // 同时，为模板添加一些默认变量
        renderData['block'] = template.name;

        // 2. 渲染最终输出内容
        const outputContent = this.renderTemplate(template.outputTemplate, renderData).trim();

        // 3. 渲染目标文件路径和标题
        const targetFilePath = this.renderTemplate(template.targetFile, renderData);
        const header = template.appendUnderHeader ? this.renderTemplate(template.appendUnderHeader, renderData) : null;

        if (!targetFilePath) {
            throw new Error("模板未定义目标文件路径 (targetFile)。");
        }
        if (!outputContent) {
            throw new Error("渲染后的输出内容为空。");
        }

        // 4. 写入文件
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

    // --- 文件操作帮助函数 (保持不变) ---
    private async ensureFolder(path: string) {
        const segs = path.split('/').filter(Boolean);
        let cur = '';
        for (const seg of segs) {
            cur = cur ? `${cur}/${seg}` : seg;
            const af = this.app.vault.getAbstractFileByPath(cur);
            if (!af) await this.app.vault.createFolder(cur).catch(() => { });
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