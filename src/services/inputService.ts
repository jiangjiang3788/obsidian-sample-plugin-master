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
  private resolveTargetFilePath(themePath: string): string | null {
    const s     = this.settings;
    const theme = (s.themes || []).find((t: any) => t.path === themePath) || null;
    const file  = theme?.task?.file ?? s.base?.task?.file;
    return file ? this.applyFileTemplate(file, themePath) : null;
  }

  /* ------------------------------------------------------------------ */
  /* 二、文件 / 目录辅助                                                 */
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

  /* ------------------------------------------------------------------ */
  /* 三、在指定 ## 标题下插入                                            */
  /* ------------------------------------------------------------------ */
  private async appendUnderHeader(file: TFile, headerTitle: string, payload: string) {
    const raw = await this.app.vault.read(file);
    const esc = headerTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re  = new RegExp(`^##\\s+${esc}\\s*$`, 'm');
    const lines = raw.split('\n');

    // 若标题不存在 → 文件末尾加标题
    if (!re.test(raw)) {
      if (lines.length && lines[lines.length - 1].trim() !== '') lines.push('');
      lines.push(`## ${headerTitle}`, '');
    }

    // 找标题行及块末尾
    const idxHeader = lines.findIndex(l => re.test(l));
    let idxInsert = idxHeader + 1;
    while (idxInsert < lines.length && !/^##\s+/.test(lines[idxInsert])) idxInsert++;

    lines.splice(idxInsert, 0, payload);
    await this.app.vault.modify(file, lines.join('\n'));
  }

  /* ------------------------------------------------------------------ */
  /* 四、写入任务 / 块                                                   */
  /* ------------------------------------------------------------------ */
  async writeTask(themePath: string, fileHint: string | null, payload: string): Promise<string> {
    const fp = fileHint ?? this.resolveTargetFilePath(themePath);
    if (!fp) throw new Error('未配置任务写入文件路径');
    const file = await this.getOrCreateFile(fp);
    await this.appendUnderHeader(file, themePath, payload);
    return fp;
  }

  async writeBlock(themePath: string, blockName: string, fileHint: string | null, payload: string): Promise<string> {
    const fp = fileHint ?? this.resolveTargetFilePath(themePath);
    if (!fp) throw new Error(`未配置 ${blockName} 写入文件路径`);
    const file = await this.getOrCreateFile(fp);
    await this.appendUnderHeader(file, themePath, payload);
    return fp;
  }

  /* ------------------------------------------------------------------ */
  /* 五、分类 / 主题检索                                                 */
  /* ------------------------------------------------------------------ */
  /** 返回开启 task 的顶级分类 */
  getTaskTopCategories(): string[] {
    const set = new Set<string>();
    (this.settings.themes || []).forEach((t: any) => {
      if (t.task?.enabled) set.add(t.path.split('/')[0]);
    });
    return Array.from(set).sort((a,b)=>a.localeCompare(b,'zh'));
  }

  /** 返回指定 top 下所有启用 task 的主题 */
  listTaskThemesByTop(top: string): TaskThemeConfig[] {
    const { themes = [], base = {} } = this.settings;
    const baseTask = base.task ?? {};

    return themes
      .filter((t: any)=>(t.path===top||t.path.startsWith(top+'/')) && (t.task?.enabled??false))
      .map((t: any)=>{
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

  /** ★ 新增：返回指定 top 下、启用 block(category) 的主题（仅 path/icon） */
  listBlockThemesByTop(top: string, category: string): { path: string; icon?: string }[] {
    return (this.settings.themes || [])
      .filter((t: any)=>
        (t.path===top || t.path.startsWith(top+'/')) &&
        (t.blocks?.[category]?.enabled ?? false)
      )
      .map((t: any)=>({ path: t.path, icon: t.icon }))
      .sort((a,b)=>a.path.localeCompare(b.path,'zh'));
  }
}