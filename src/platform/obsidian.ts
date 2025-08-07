// src/platform/obsidian.ts
import type { App, TFile, TAbstractFile } from 'obsidian';

/**
 * 对 Obsidian API 的最薄包装。
 * 先只暴露本插件真正用到的 4‑5 个方法，后面再补也没问题。
 */
export class ObsidianPlatform {
  constructor(public readonly app: App) {}

  /* 下面这些方法名字随便改，只要核心层能用就行 ------------------------ */

  /** 读取文件全文 */
  async readFile(file: TFile): Promise<string> {
    return this.app.vault.read(file);
  }

  getMarkdownFiles(): TFile[] {
  return this.app.vault.getMarkdownFiles();
}

  /** 修改文件全文 */
  async writeFile(file: TFile, content: string) {
    return this.app.vault.modify(file, content);
  }

  /** 根据路径拿到 File/Folder */
  getByPath(path: string): TAbstractFile | null {
    return this.app.vault.getAbstractFileByPath(path) ?? null;
  }

  /** 创建新文件（如已存在则返回原文件） */
  async ensureFile(path: string, initial = ''): Promise<TFile> {
    const af = this.getByPath(path);
    if (af instanceof TFile) return af;
    return this.app.vault.create(path, initial);
  }

  /** 监听 Vault 事件 —— 直接把原始 on 代理出去即可 */
  onVault(event: string, cb: (...a: any[]) => any) {
    return this.app.vault.on(event as any, cb as any);
  }
}