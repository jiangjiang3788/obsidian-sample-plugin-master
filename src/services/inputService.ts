// src/services/inputService.ts
import { App, TFile, TFolder } from 'obsidian';
import { lastSegment } from '../utils/templates';
import type ThinkPlugin from '../main';

/* ---------- 类型 ---------- */
type InputSettings = Record<string, any>;

export interface TaskThemeConfig {
  path: string;
  icon?: string;
  file: string;
  fields: string[];
  fieldOptions?: Record<string, string[]>;
  template?: string;
}

/* ===================================================================== */
/*  InputService                                                         */
/* ===================================================================== */
export class InputService {
  constructor(private app: App, private plugin: ThinkPlugin) {}

  /* ---------- 快捷访问插件设置 ---------- */
  private get settings(): InputSettings {
    return this.plugin.inputSettings || { base: {}, themes: [] };
  }

  /* ------------------------------------------------------------------ */
  /* 一、文件路径解析                                                    */
  /* ------------------------------------------------------------------ */
  private applyFileTemplate(tpl: string, themePath: string) {
    return tpl.replace(/\{\{\s*主题\s*\}\}/g, lastSegment(themePath));
  }

  private resolveTargetFilePath(
    themePath: string,
    kind: 'task' | 'block',
    blockName?: string,
  ): string | null {
    const s     = this.settings;
    const theme = (s.themes || []).find((t: any) => t.path === themePath) || null;

    if (kind === 'task') {
      const file = theme?.task?.file ?? s.base?.task?.file;
      return file ? this.applyFileTemplate(file, themePath) : null;
    }

    // block
    const tBlk  = theme?.blocks?.[blockName!];
    const bBlk  = s.base?.blocks?.[blockName!];
    const file  = tBlk?.file ?? bBlk?.file;
    return file ? this.applyFileTemplate(file, themePath) : null;
  }

  /* ------------------------------------------------------------------ */
  /* 二、确保文件 / 目录存在                                             */
  /* ------------------------------------------------------------------ */
  private async ensureFolder(path: string) {
    if (!path) return;
    const segs = path.split('/').filter(Boolean);
    let cur = '';
    for (const s of segs) {
      cur = cur ? `${cur}/${s}` : s;
      const af = this.app.vault.getAbstractFileByPath(cur);
      if (!af) await this.app.vault.createFolder(cur).catch(() => {});
      else if (af instanceof TFile) throw new Error(`路径冲突：${cur} 是文件`);
    }
  }
  private async getOrCreateFile(fp: string) {
    const af = this.app.vault.getAbstractFileByPath(fp);
    if (af instanceof TFile) return af;
    if (af instanceof TFolder) throw new Error(`目标是文件夹：${fp}`);
    const folder = fp.includes('/') ? fp.substring(0, fp.lastIndexOf('/')) : '';
    if (folder) await this.ensureFolder(folder);
    return await this.app.vault.create(fp, '');
  }
  private async appendToFile(file: TFile, payload: string) {
    const txt = await this.app.vault.read(file);
    await this.app.vault.modify(file, (txt.endsWith('\n') ? txt : txt + '\n') + payload + '\n');
  }

  /* ------------------------------------------------------------------ */
  /* 三、写入 API                                                        */
  /* ------------------------------------------------------------------ */
  /** 返回实际文件路径，并在控制台打印写入位置 */
  async writeTask(themePath: string, fileHint: string | null, payload: string): Promise<string> {
    const fp = fileHint ?? this.resolveTargetFilePath(themePath, 'task');
    if (!fp) throw new Error('未配置任务写入文件路径');
    console.log(`[Think] 准备写入任务 → ${fp}`);
    await this.appendToFile(await this.getOrCreateFile(fp), payload);
    console.log(`[Think] 已写入任务 → ${fp}`);
    return fp;
  }

  async writeBlock(themePath: string, blockName: string, fileHint: string | null, payload: string): Promise<string> {
    const fp = fileHint ?? this.resolveTargetFilePath(themePath, 'block', blockName);
    if (!fp) throw new Error(`未配置 ${blockName} 写入文件路径`);
    console.log(`[Think] 准备写入 ${blockName} → ${fp}`);
    await this.appendToFile(await this.getOrCreateFile(fp), payload);
    console.log(`[Think] 已写入 ${blockName} → ${fp}`);
    return fp;
  }

  /* ------------------------------------------------------------------ */
  /* 四、分类 / 主题检索                                                 */
  /* ------------------------------------------------------------------ */
  /** 仅返回“至少存在启用 task” 的顶级分类 */
  getTaskTopCategories(): string[] {
    const set = new Set<string>();
    (this.settings.themes || []).forEach((t: any) => {
      if (t.task?.enabled) set.add(t.path.split('/')[0]);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'zh'));
  }

  /** 返回指定 top 下所有启用 task 的主题（完整配置） */
  listTaskThemesByTop(top: string): TaskThemeConfig[] {
    const { themes = [], base = {} } = this.settings;
    const baseTask = base.task ?? {};

    return themes
      .filter((t: any) =>
        (t.path === top || t.path.startsWith(top + '/')) && (t.task?.enabled ?? false),
      )
      .map((t: any) => {
        const task = t.task ?? {};
        return {
          path         : t.path,
          icon         : t.icon,
          file         : task.file        ?? baseTask.file        ?? `${t.path}.md`,
          fields       : task.fields      ?? baseTask.fields      ?? [],
          fieldOptions : task.fieldOptions?? baseTask.fieldOptions?? {},
          template     : task.template    ?? baseTask.template,
        };
      });
  }

  /* ----- 可选：按块检索主题（仅返回 path/icon） ----- */
  listBlockThemesByTop(top: string, blockName: string) {
    return (this.settings.themes || [])
      .filter((t: any) =>
        (t.path === top || t.path.startsWith(top + '/')) &&
        (t.blocks?.[blockName]?.enabled ?? false),
      )
      .map((t: any) => ({ path: t.path, icon: t.icon }))
      .sort((a, b) => a.path.localeCompare(b.path, 'zh'));
  }

  /* ---------- 向后兼容旧接口 ---------- */
  /** @deprecated 改用 listTaskThemesByTop */
  listThemesByTop(top: string) {
    return this.listTaskThemesByTop(top);
  }
}