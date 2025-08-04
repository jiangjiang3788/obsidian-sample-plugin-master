// src/services/inputService.ts
import { App, TAbstractFile, TFile, TFolder, Notice } from 'obsidian';
import { lastSegment } from '../utils/templates';
import type ThinkPlugin from '../main';

/* ------------------------------------------------------------------ */
/* 类型定义                                                            */
/* ------------------------------------------------------------------ */
type InputSettings = Record<string, any>;

export interface TaskThemeConfig {
  path: string;                            // 主题路径，如 “生活/读书”
  icon?: string;                           // 图标 emoji
  file: string;                            // 任务写入文件
  fields: string[];                        // 需要渲染的字段
  fieldOptions?: Record<string, string[]>; // 字段可选值（下拉用）
}

/* ------------------------------------------------------------------ */
/* 主服务                                                              */
/* ------------------------------------------------------------------ */
export class InputService {
  constructor(private app: App, private plugin: ThinkPlugin) {}

  /* ---------- 统一读取插件设置 ---------- */
  private get settings(): InputSettings {
    // 保底结构，防止空指针
    return this.plugin.inputSettings || { base: {}, themes: [] };
  }

  /* ------------------------------------------------------------------
     一、公共工具
  ------------------------------------------------------------------ */
  /** 根据主题与类别解析“目标文件模板” */
  private resolveTargetFilePath(
    themePath: string,
    kind: 'task' | 'block',
    blockName?: string,
  ): string | null {
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
    // {{主题}} → 路径最后一段
    const leaf = lastSegment(themePath);
    return (tpl || '').replace(/\{\{\s*主题\s*\}\}/g, leaf);
  }

  /* ---------- 文件保证 ---------- */
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

  private async appendToFile(file: TFile, payload: string) {
    const txt  = await this.app.vault.read(file);
    const next = (txt.endsWith('\n') ? txt : txt + '\n') + payload + '\n';
    await this.app.vault.modify(file, next);
  }

  /* ------------------------------------------------------------------
     二、写入 API
  ------------------------------------------------------------------ */
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

  /* ------------------------------------------------------------------
     三、主题 / 分类解析
  ------------------------------------------------------------------ */
  /** 提取所有顶级分类（去重 + 排序） */
  getTopCategories(): string[] {
    const set = new Set<string>();
    (this.settings.themes || []).forEach((t: any) => {
      const top = t.path?.split('/')?.[0];
      if (top) set.add(top);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'zh'));
  }

  /** 获取指定 top 下的“任务主题”完整配置 */
  listTaskThemesByTop(top: string): TaskThemeConfig[] {
    const s      = this.settings;
    const base   = s.base?.task ?? {};
    const themes = s.themes || [];

    const out: TaskThemeConfig[] = [];
    for (const t of themes) {
      const isTop   = t.path?.startsWith(top + '/') || t.path === top;
      const enabled = t.task?.enabled ?? false;
      if (!isTop || !enabled) continue;

      const taskCfg = t.task ?? {};
      out.push({
        path: t.path,
        icon: t.icon,
        file: taskCfg.file ?? base.file ?? `${t.path}.md`,
        fields: taskCfg.fields ?? base.fields ?? [],
        fieldOptions: taskCfg.fieldOptions ?? base.fieldOptions ?? {},
      });
    }
    return out;
  }

  /** 获取指定 top 下、某个块类型启用的主题（仅返回 path/icon） */
  listBlockThemesByTop(top: string, blockName: string): Array<{ path: string; icon?: string }> {
    const s      = this.settings;
    const themes = s.themes || [];

    return themes
      .filter((t: any) => {
        const isTop = t.path?.startsWith(top + '/') || t.path === top;
        const enabled = t.blocks?.[blockName]?.enabled ?? false;
        return isTop && enabled;
      })
      .map((t: any) => ({ path: t.path, icon: t.icon }))
      .sort((a, b) => a.path.localeCompare(b.path, 'zh'));
  }
}
