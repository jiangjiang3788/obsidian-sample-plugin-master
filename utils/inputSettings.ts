// utils/inputSettings.ts
//-----------------------------------------------------------
// 统一读取 / 解析 “通用输入设置 (inputSettings)”
//
// • 支持新结构：{ base: {...}, themes:[{ path:'健康', ... }, ...] }
// • 继承链：base → <exact theme path>   ← 无父级逐层合并
// • 增量写法：fields+  ⇒ 在继承基础上追加（去重）
// • 向后兼容：若仍是旧平面结构，直接返回旧对象
//-----------------------------------------------------------

import type { App } from 'obsidian';
import type ThinkPlugin from '../main';

/* ---------- 类型 ---------- */
export interface InputTypeCfg {
  enabled?: boolean;          // true=启用, false=禁用, undefined=继承
  file?: string;              // 任务/块写入的文件模板
  fields?: string[];          // 全量覆盖
  /** 增量：在继承基础上追加字段，解析时会与 fields 合并去重 */
  ['fields+']?: string[];
  /* 其他自定义键 (displayMode / colorMapping / emojiMapping / imageMapping …) */
  [k: string]: any;
}
export interface ThemeCfg {
  path: string;               // 主题路径，如 "健康/睡眠"
  icon?: string;
  title?: string;             // 可选：二级标题
  task?: InputTypeCfg;
  blocks?: Record<string, InputTypeCfg>;   // 子类配置
  [k: string]: any;           // 允许随意扩展
}
export interface InputSettings {
  /** 共性默认 */
  base: {
    task?:   InputTypeCfg;
    blocks?: Record<string, InputTypeCfg>;
    [k: string]: any;
  };
  /** 每个主题的专属配置 */
  themes: ThemeCfg[];
}

/* ---------- 私有缓存 ---------- */
let _cache: { raw: any; parsed: InputSettings } | null = null;

/* ---------- 工具：深度克隆 ---------- */
function deepClone<T>(o: T): T {
  return JSON.parse(JSON.stringify(o));
}

/* ---------- 合并两个 InputTypeCfg ---------- */
function mergeType(parent: InputTypeCfg = {}, child: InputTypeCfg = {}): InputTypeCfg {
  const res: InputTypeCfg = { ...parent, ...child };

  // enabled: 覆盖
  if ('enabled' in child) res.enabled = child.enabled;

  // file: 覆盖
  if ('file' in child) res.file = child.file;

  // fields: 全量覆盖
  if ('fields' in child) res.fields = child.fields?.slice();

  // fields+ : 追加
  if ('fields+' in child) {
    const base = res.fields ? res.fields.slice() : parent.fields?.slice() ?? [];
    const plus = child['fields+'] ?? [];
    res.fields = Array.from(new Set([...base, ...plus]));
    delete res['fields+'];   // 规范化
  }

  // 其它键：覆盖
  for (const k of Object.keys(child)) {
    if (['enabled', 'file', 'fields', 'fields+'].includes(k)) continue;
    res[k] = deepClone(child[k]);
  }
  return res;
}

/* ---------- 合并主题 ---------- */
function mergeTheme(base: ThemeCfg, child: ThemeCfg): ThemeCfg {
  const merged: ThemeCfg = { ...base, ...child };

  // 单独合并 task / blocks
  merged.task   = mergeType(base.task ?? {}, child.task ?? {});

  // blocks：动态键
  const allKeys = new Set([
    ...Object.keys(base.blocks ?? {}),
    ...Object.keys(child.blocks ?? {}),
  ]);
  merged.blocks = {};
  for (const k of allKeys) {
    merged.blocks[k] = mergeType(
      base.blocks?.[k] ?? {},
      child.blocks?.[k] ?? {},
    );
  }
  return merged;
}

/* ---------- 对外 API ---------- */

/** 原样返回插件存储的 inputSettings（未经解析） */
export function getRawInputSettings(app: App): any {
  const p = app.plugins.getPlugin('think-plugin') as ThinkPlugin | null;
  return p?.inputSettings ?? {};
}

/**
 * 按路径获取“解析后”的主题配置  
 * 继承链：base → 精确匹配的 theme（若存在）
 */
export function resolveTheme(app: App, themePath: string): ThemeCfg {
  const raw = getRawInputSettings(app);
  if (!_cache || _cache.raw !== raw) {
    // ---------- 初始化 / 重新解析 ----------
    const parsed: InputSettings = {
      base  : deepClone(raw.base  ?? {}),
      themes: deepClone(raw.themes ?? []),
    };
    _cache = { raw, parsed };
  }

  const { base, themes } = _cache.parsed;

  // 若未采用新结构，退回旧数据
  if (!base || !Array.isArray(themes)) return { path: themePath } as ThemeCfg;

  const exact = themes.find(t => t.path === themePath);
  if (!exact) return mergeTheme({ path: themePath } as any, { task: base.task, blocks: base.blocks } as any);

  // 合并：base → exact
  const merged = mergeTheme(
    { path: themePath, task: base.task, blocks: base.blocks } as any,
    exact,
  );

  return merged;
}

/**
 * 获取某路径下 *具体某输入类型* 的最终配置  
 * @param path  主题路径，如 `健康/睡眠`
 * @param type  `"task"` 或 block 子类名称（如 `"打卡"`）
 */
export function resolveInputCfg(app: App, path: string, type: string): InputTypeCfg {
  const theme = resolveTheme(app, path);
  if (type === 'task') return theme.task ?? {};
  return theme.blocks?.[type] ?? {};
}

/* ---------- 向后兼容旧 API ---------- */
/** 旧版：返回整个 inputSettings（保持行为不变以免报错） */
export function getInputSettings(app: App): Record<string, any> {
  return getRawInputSettings(app);
}