// src/services/inputService.ts
import { App, TAbstractFile, TFile, TFolder, Notice } from 'obsidian';
import { lastSegment } from '../utils/templates';
import type ThinkPlugin from '../main';

type InputSettings = Record<string, any>;

export class InputService {
  constructor(private app: App, private plugin: ThinkPlugin) {}

  /** 聚合读取设置（直接用你插件里的 inputSettings） */
  private get settings(): InputSettings {
    return this.plugin.inputSettings || { base: {}, themes: [] };
  }

  /** 根据主题与类别解析“目标文件模板” */
  private resolveTargetFilePath(themePath: string, kind: 'task' | 'block', blockName?: string): string | null {
    const s = this.settings;
    const theme = (s.themes || []).find((t: any) => t.path === themePath) || null;

    if (kind === 'task') {
      const file = theme?.task?.file ?? s.base?.task?.file;
      return file ? this.applyFileTemplate(file, themePath) : null;
    }

    // block
    const themeBlk = theme?.blocks?.[blockName!];
    const baseBlk  = s.base?.blocks?.[blockName!];
    const file = themeBlk?.file ?? baseBlk?.file;
    return file ? this.applyFileTemplate(file, themePath) : null;
  }

  private applyFileTemplate(tpl: string, themePath: string) {
    const leaf = lastSegment(themePath);
    return (tpl || '').replace(/\{\{\s*主题\s*\}\}/g, leaf);
  }

  /** 递归创建上级目录 */
  private async ensureFolder(folderPath: string) {
    const vault = this.app.vault;
    if (!folderPath || folderPath === '/' || folderPath === '.') return;
    const segs = folderPath.split('/').filter(Boolean);
    let cur = '';
    for (const s of segs) {
      cur = cur ? `${cur}/${s}` : s;
      const af = vault.getAbstractFileByPath(cur);
      if (!af) await vault.createFolder(cur).catch(() => {});
      else if (af instanceof TFile) throw new Error(`路径冲突：${cur} 是文件`);
    }
  }

  private async getOrCreateFile(fp: string): Promise<TFile> {
    const vault = this.app.vault;
    const af = vault.getAbstractFileByPath(fp);
    if (af && af instanceof TFile) return af;
    if (af && af instanceof TFolder) throw new Error(`目标是文件夹：${fp}`);

    const folder = fp.includes('/') ? fp.substring(0, fp.lastIndexOf('/')) : '';
    if (folder) await this.ensureFolder(folder);
    return await vault.create(fp, '');
  }

  /** 统一写入：将文本追加到文件末尾（留空行） */
  private async appendToFile(file: TFile, payload: string) {
    const txt = await this.app.vault.read(file);
    const next = (txt.endsWith('\n') ? txt : txt + '\n') + payload + '\n';
    await this.app.vault.modify(file, next);
  }

  /** 任务写入 */
  async writeTask(themePath: string, fileHint: string | null, payload: string) {
    const fp = fileHint ?? this.resolveTargetFilePath(themePath, 'task');
    if (!fp) throw new Error('未配置任务写入文件路径');
    const f = await this.getOrCreateFile(fp);
    await this.appendToFile(f, payload);
  }

  /** 块写入（计划/总结/思考/打卡） */
  async writeBlock(themePath: string, blockName: string, fileHint: string | null, payload: string) {
    const fp = fileHint ?? this.resolveTargetFilePath(themePath, 'block', blockName);
    if (!fp) throw new Error(`未配置 ${blockName} 写入文件路径`);
    const f = await this.getOrCreateFile(fp);
    await this.appendToFile(f, payload);
  }

  /** 过滤可选主题（按大类 + enabled） */
  listThemesByTop(top: string, kind: 'task' | 'block', blockName?: string): Array<{ path: string; icon?: string }> {
    const s = this.settings;
    const arr: Array<{ path: string; icon?: string }> = [];
    (s.themes || []).forEach((t: any) => {
      const isTop = (t.path || '').startsWith(top + '/')
        || t.path === top;
      if (!isTop) return;

      if (kind === 'task') {
        const enabled = t.task?.enabled ?? false;
        if (enabled) arr.push({ path: t.path, icon: t.icon });
      } else {
        const enabled = t.blocks?.[blockName!]?.enabled ?? false;
        if (enabled) arr.push({ path: t.path, icon: t.icon });
      }
    });
    return arr.sort((a, b) => a.path.localeCompare(b.path, 'zh'));
  }
}