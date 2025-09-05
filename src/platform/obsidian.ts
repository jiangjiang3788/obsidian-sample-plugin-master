// src/platform/obsidian.ts
import { singleton } from 'tsyringe'; // [核心修复] 将 injectable 改为 singleton，保持一致性
import type { App, TFile, TAbstractFile } from 'obsidian';

/**
 * 对 Obsidian API 的最薄包装。
 */
@singleton()
export class ObsidianPlatform {
    // [核心修复] 将 app 声明为可选，因为它将在 init 方法中被设置
    public app!: App;

    // [核心修复] 构造函数变为空，不再有任何依赖
    constructor() {}

    // [核心修复] 新增一个 init 方法，用于在所有服务都创建完毕后手动注入依赖
    public init(app: App) {
        this.app = app;
    }

    /* 下面这些方法保持不变 */

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