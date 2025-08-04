// src/services/inputService.ts
import { App, TFile, TFolder } from 'obsidian';
import { lastSegment } from '../utils/templates';
import type ThinkPlugin from '../main';

type InputSettings = Record<string, any>;

export interface TaskThemeConfig {
  path: string;
  icon?: string;
  file: string;
  fields: string[];
  fieldOptions?: Record<string, string[]>;
  template?: string;
}

export class InputService {
  constructor(private app: App, private plugin: ThinkPlugin) {}

  /* ------------------------------------------------------------------ */
  /*  读取插件设置                                                      */
  /* ------------------------------------------------------------------ */
  private get settings(): InputSettings {
    return this.plugin.inputSettings || { base: {}, themes: [] };
  }

  /* ------------------------------------------------------------------ */
  /*  路径解析                                                          */
  /* ------------------------------------------------------------------ */
  private apply(template: string, themePath: string): string {
    return template.replace(/\{\{\s*主题\s*\}\}/g, lastSegment(themePath));
  }

  private resolveFilePath(
    themePath: string,
    kind: 'task' | 'block',
    blockName?: string,
  ): string | null {
    const s = this.settings;
    const theme = (s.themes || []).find((t: any) => t.path === themePath) || null;

    if (kind === 'task') {
      const file = theme?.task?.file ?? s.base?.task?.file;
      return file ? this.apply(file, themePath) : null;
    }

    const tBlk = theme?.blocks?.[blockName!];
    const bBlk = s.base?.blocks?.[blockName!];
    const file = tBlk?.file ?? bBlk?.file;
    return file ? this.apply(file, themePath) : null;
  }

  /* ------------------------------------------------------------------ */
  /*  文件 / 目录保证                                                   */
  /* ------------------------------------------------------------------ */
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

  private async getOrCreateFile(fp: string) {
    const af = this.app.vault.getAbstractFileByPath(fp);
    if (af instanceof TFile) return af;
    if (af instanceof TFolder) throw new Error(`目标是文件夹：${fp}`);
    const folder = fp.includes('/') ? fp.slice(0, fp.lastIndexOf('/')) : '';
    if (folder) await this.ensureFolder(folder);
    return await this.app.vault.create(fp, '');
  }

  /* ------------------------------------------------------------------ */
  /*  在 ## 主题标题块下追加内容                                        */
  /* ------------------------------------------------------------------ */
  private async appendUnderHeader(file: TFile, header: string, payload: string) {
    const esc = header.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`^##\\s+${esc}\\s*$`, 'm');
    const text = await this.app.vault.read(file);
    const lines = text.split('\n');

    if (!regex.test(text)) {
      if (lines.length && lines[lines.length - 1].trim() !== '') lines.push('');
      lines.push(`## ${header}`, '');
    }

    const idxHeader = lines.findIndex(l => regex.test(l));
    let idxInsert = idxHeader + 1;
    while (idxInsert < lines.length && !/^##\s+/.test(lines[idxInsert])) idxInsert++;

    lines.splice(idxInsert, 0, payload);
    await this.app.vault.modify(file, lines.join('\n'));
  }

  /* ------------------------------------------------------------------ */
  /*  写入 API                                                          */
  /* ------------------------------------------------------------------ */
  async writeTask(themePath: string, fileHint: string | null, payload: string): Promise<string> {
    const fp = fileHint ?? this.resolveFilePath(themePath, 'task');
    if (!fp) throw new Error('未配置任务写入文件路径');
    const file = await this.getOrCreateFile(fp);
    await this.appendUnderHeader(file, themePath, payload);
    return fp;
  }

  async writeBlock(
    themePath: string,
    blockName: string,
    fileHint: string | null,
    payload: string,
  ): Promise<string> {
    const fp = fileHint ?? this.resolveFilePath(themePath, 'block', blockName);
    if (!fp) throw new Error(`未配置 ${blockName} 写入文件路径`);
    const file = await this.getOrCreateFile(fp);
    await this.appendUnderHeader(file, themePath, payload);
    return fp;
  }

  /* ------------------------------------------------------------------ */
  /*  分类 / 主题检索                                                   */
  /* ------------------------------------------------------------------ */
  /** 返回启用 task 的顶级分类 */
  getTaskTopCategories(): string[] {
    const set = new Set<string>();
    (this.settings.themes || []).forEach((t: any) => {
      if (t.task?.enabled) set.add(t.path.split('/')[0]);
    });
    return [...set].sort((a, b) => a.localeCompare(b, 'zh'));
  }

  /** 返回指定顶级分类下启用 task 的完整主题配置 */
  listTaskThemesByTop(top: string): TaskThemeConfig[] {
    const { themes = [], base = {} } = this.settings;
    const baseTask = base.task ?? {};

    return themes
      .filter(
        (t: any) =>
          (t.path === top || t.path.startsWith(top + '/')) && (t.task?.enabled ?? false),
      )
      .map((t: any) => {
        const task = t.task ?? {};
        return {
          path: t.path,
          icon: t.icon,
          file: task.file ?? baseTask.file ?? `${t.path}.md`,
          fields: task.fields ?? baseTask.fields ?? [],
          fieldOptions: task.fieldOptions ?? baseTask.fieldOptions ?? {},
          template: task.template ?? baseTask.template,
        };
      });
  }

  /** 返回指定顶级分类下启用指定 block 的主题（只含 path/icon） */
  listBlockThemesByTop(top: string, blockName: string) {
    return (this.settings.themes || [])
      .filter(
        (t: any) =>
          (t.path === top || t.path.startsWith(top + '/')) &&
          (t.blocks?.[blockName]?.enabled ?? false),
      )
      .map((t: any) => ({ path: t.path, icon: t.icon }))
      .sort((a, b) => a.path.localeCompare(b.path, 'zh'));
  }
}