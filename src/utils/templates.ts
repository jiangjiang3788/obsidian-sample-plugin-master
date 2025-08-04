// src/utils/templates.ts
import { EMOJI } from '../config/constants';
import { normalizeDateStr } from './date';

/** 返回路径最后一段 */
export function lastSegment(path: string) {
  return (path || '').split('/').filter(Boolean).pop() || path || '';
}

/* ------------------------------------------------------------------ */
/* 新版模板渲染任务行（无自动 #标签）                                  */
/* ------------------------------------------------------------------ */
export function makeTaskLine(opts: {
  themePath?: string;          // 不再自动追加标签，可忽略
  template?: string;           // 如 "{{@任务前缀}} {{@图标}}{{任务内容}} ..."
  fields: Record<string, string | number | boolean | null | undefined>;
}): string {
  const { template = '{{前缀}}{{内容}}', fields } = opts;

  /* ---------- 字段安全化 ---------- */
  const safe: Record<string, string> = {};
  Object.entries(fields || {}).forEach(([k, v]) => {
    safe[k] = v == null ? '' : String(v);
  });
  if (!('前缀' in safe))      safe['前缀'] = '';
  if (!('任务前缀' in safe))  safe['任务前缀'] = safe['前缀'];

  /* ---------- 渲染占位符 ---------- */
  // 支持 {{key}} 与 {{@key}}
  const PLACEHOLDER = /\{\{\s*@?([^}]+?)\s*\}\}/g;
  let line = template.replace(PLACEHOLDER, (_m, p1) => {
    const key = String(p1).trim();
    return Object.prototype.hasOwnProperty.call(safe, key) ? safe[key] : '';
  });

  /* ---------- 若模板没写前缀占位符则补默认待办符 ---------- */
  if (!/\{\{\s*@?(?:前缀|任务前缀)\s*\}\}/.test(template) && !line.startsWith('- [')) {
    line = '- [ ] ' + line;
  }

  return line.replace(/[ \t]+/g, ' ').trim();
}

/* ------------------------------------------------------------------ */
/* 旧版任务行 & 生成块：保持原有逻辑                                   */
/* ------------------------------------------------------------------ */
export function makeTaskLineLegacy(opts: {
  prefix: '- [ ] ' | '- [x] ' | '- [-] ' | '';
  title: string;
  themePath?: string;
  icon?: string;
  due?: string;
  start?: string;
  scheduled?: string;
  createdISO?: string;
  timeHHMM?: string;
  duration?: string | number;
  repeat?: 'day' | 'week' | 'month' | 'year' | null;
  markDate?: string;
  statusEmoji?: string;
}) {
  const tagStr  = opts.themePath ? ` #${opts.themePath}` : '';
  const iconStr = opts.icon ? `${opts.icon} ` : '';
  const pieces: string[] = [];

  pieces.push(`${opts.prefix}${iconStr}${opts.title}${tagStr}`.trim());

  if (opts.timeHHMM) pieces.push(`(时间::${opts.timeHHMM})`);
  if (opts.duration !== undefined && opts.duration !== '')
    pieces.push(`(时长::${String(opts.duration)})`);

  const addDate = (emoji: string, d?: string) => {
    if (d) pieces.push(`${emoji} ${normalizeDateStr(d)}`);
  };
  addDate(EMOJI.created,   opts.createdISO);
  addDate(EMOJI.start,     opts.start);
  addDate(EMOJI.scheduled, opts.scheduled);
  addDate(EMOJI.due,       opts.due);

  if (opts.repeat) pieces.push(`${EMOJI.repeat} every ${opts.repeat}${opts.repeat === 'day' ? '' : 's'}`);

  if (opts.statusEmoji && opts.markDate)
    pieces.push(`${opts.statusEmoji} ${normalizeDateStr(opts.markDate)}`);

  return pieces.join(' ').trim();
}

export function makeBlock(opts: {
  category: string;
  dateISO?: string;
  themeLabel?: string;
  icon?: string;
  content: string;
  tags?: string[];
  extra?: Record<string, string | number | boolean>;
}) {
  const lines: string[] = ['<!-- start -->'];
  lines.push(`分类:: ${opts.category}`);
  if (opts.dateISO)   lines.push(`日期:: ${normalizeDateStr(opts.dateISO)}`);
  if (opts.themeLabel)lines.push(`主题:: ${opts.themeLabel}`);
  if (opts.icon)      lines.push(`图标:: ${opts.icon}`);
  if (opts.tags?.length) lines.push(`标签:: ${opts.tags.join(', ')}`);
  if (opts.extra) Object.entries(opts.extra).forEach(([k, v]) => lines.push(`${k}:: ${String(v)}`));

  const content = (opts.content || '').trim();
  if (content.includes('\n')) {
    const [first, ...rest] = content.split('\n');
    lines.push('内容:: ' + first);
    lines.push(...rest);
  } else {
    lines.push('内容:: ' + content);
  }
  lines.push('<!-- end -->');
  return lines.join('\n');
}