// src/utils/templates.ts
import { EMOJI } from '../config/constants';
import { normalizeDateStr } from './date';

export function lastSegment(path: string) {
  return (path || '').split('/').filter(Boolean).pop() || path || '';
}

/** 生成任务行，确保与 parser 对齐 */
export function makeTaskLine(opts: {
  prefix: '- [ ] ' | '- [x] ' | '- [-] ' | '';
  title: string;
  themePath?: string;         // 用于 #标签
  icon?: string;              // 放在标题最前的 emoji
  due?: string;               // YYYY-MM-DD
  start?: string;             // YYYY-MM-DD
  scheduled?: string;         // YYYY-MM-DD
  createdISO?: string;        // YYYY-MM-DD
  timeHHMM?: string;          // HH:mm
  duration?: string | number; // 任意
  repeat?: 'day' | 'week' | 'month' | 'year' | null;
  markDate?: string;          // 完成/取消时的日期 YYYY-MM-DD
  statusEmoji?: string;       // ✅ 或 ❌（配合 markDate）
}) {
  const tagStr = opts.themePath ? ` #${opts.themePath}` : '';
  const iconStr = opts.icon ? `${opts.icon} ` : '';
  const pieces: string[] = [];

  // 任务主干
  pieces.push(`${opts.prefix}${iconStr}${opts.title}${tagStr}`.trim());

  // 行内 KV
  if (opts.timeHHMM) pieces.push(`(时间::${opts.timeHHMM})`);
  if (opts.duration !== undefined && opts.duration !== '')
    pieces.push(`(时长::${String(opts.duration)})`);

  // 日期 emoji
  const addDate = (emoji: string, d?: string) => {
    if (d) pieces.push(`${emoji} ${normalizeDateStr(d)}`);
  };
  addDate(EMOJI.created, opts.createdISO);
  addDate(EMOJI.start, opts.start);
  addDate(EMOJI.scheduled, opts.scheduled);
  addDate(EMOJI.due, opts.due);

  // 重复
  if (opts.repeat) {
    pieces.push(`${EMOJI.repeat} every ${opts.repeat}${opts.repeat === 'day' ? '' : 's'}`);
  }

  // 完成/取消收尾
  if (opts.statusEmoji && opts.markDate) {
    pieces.push(`${opts.statusEmoji} ${normalizeDateStr(opts.markDate)}`);
  }

  return pieces.join(' ').trim();
}

/** 生成块（计划/总结/思考/打卡） */
export function makeBlock(opts: {
  category: string;           // 计划/总结/思考/打卡
  dateISO?: string;
  themeLabel?: string;        // 主题:: 文本（如 顶层大类：生活/电脑/… 的显示值）
  icon?: string;
  content: string;            // 可多行
  tags?: string[];            // 标签:: a, b
  extra?: Record<string, string | number | boolean>;
}) {
  const lines: string[] = ['<!-- start -->'];
  lines.push(`分类:: ${opts.category}`);
  if (opts.dateISO) lines.push(`日期:: ${normalizeDateStr(opts.dateISO)}`);
  if (opts.themeLabel) lines.push(`主题:: ${opts.themeLabel}`);
  if (opts.icon) lines.push(`图标:: ${opts.icon}`);

  if (opts.tags && opts.tags.length) {
    lines.push(`标签:: ${opts.tags.join(', ')}`);
  }
  if (opts.extra) {
    Object.entries(opts.extra).forEach(([k, v]) => lines.push(`${k}:: ${String(v)}`));
  }

  // 内容可以多行
  const content = (opts.content || '').trim();
  if (content.includes('\n')) {
    lines.push('内容:: ' + content.split('\n')[0]);
    lines.push(...content.split('\n').slice(1));
  } else {
    lines.push('内容:: ' + content);
  }
  lines.push('<!-- end -->');
  return lines.join('\n');
}