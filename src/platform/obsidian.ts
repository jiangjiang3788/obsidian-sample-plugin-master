// src/platform/obsidian.ts
import { singleton, inject } from 'tsyringe';
import { App, TFile, TAbstractFile } from 'obsidian';
// NOTE: 这里不能从 @core/public 导入，否则会与 core/public -> core/services 形成循环依赖。
import { AppToken } from '@core/services/types';

/**
 * 对 Obsidian API 的最薄包装。
 */
@singleton()
export class ObsidianPlatform {
    // [核心修改] 使用 @inject 装饰器明确指定依赖
    constructor(@inject(AppToken) public app: App) {}

    // ... 其余方法保持不变 ...
    async readFile(file: TFile): Promise<string> {
        return this.app.vault.read(file);
    }
    getMarkdownFiles(): TFile[] {
        return this.app.vault.getMarkdownFiles();
    }

    /**
     * Phase2: 提供不泄漏 TFile 的查询方式，供 core 使用。
     */
    getMarkdownFilePaths(): string[] {
        return this.app.vault.getMarkdownFiles().map((f) => f.path);
    }
    async writeFile(file: TFile, content: string) {
        return this.app.vault.modify(file, content);
    }
    getByPath(path: string): TAbstractFile | null {
        return this.app.vault.getAbstractFileByPath(path) ?? null;
    }
    async ensureFile(path: string, initial = ''): Promise<TFile> {
        const af = this.getByPath(path);
        if (af instanceof TFile) return af;
        return this.app.vault.create(path, initial);
    }
    onVault(event: string, cb: (...a: any[]) => any) {
        return this.app.vault.on(event as any, cb as any);
    }
}
