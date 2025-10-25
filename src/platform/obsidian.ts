// src/platform/obsidian.ts
import { singleton, inject } from 'tsyringe';
import { App, TFile, TAbstractFile } from 'obsidian';
// [新增] 导入 App 的注入令牌
import { AppToken } from '@lib/services/core/types';

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