// src/utils/templates.ts
import { EMOJI } from '@core/domain/constants';
import { normalizeDateStr } from './date';

/* ------------------------------------------------------------------ */
/*  公共工具                                                           */
/* ------------------------------------------------------------------ */

/** 取路径最后一段：a/b/c -> c */
export function lastSegment(path: string) {
  return (path || '').split('/').filter(Boolean).pop() || path || '';
}

/* ------------------------------------------------------------------ */
/*  任务行：模板渲染                                                   */
/* ------------------------------------------------------------------ */
export function makeTaskLine(opts: {
  themePath?: string;
  template?: string;                         // 例如 "{{任务状态}} {{icon}} {{内容}} ..."
  fields: Record<string, string | number | boolean | null | undefined>;
}): string {
  const { template = '{{前缀}}{{内容}}', fields } = opts;

  /** 字段安全化 */
  const safe: Record<string, string> = {};
  Object.entries(fields || {}).forEach(([k, v]) => { safe[k] = v == null ? '' : String(v); });
  if (!('前缀' in safe))      safe['前缀'] = '';
  if (!('任务前缀' in safe))  safe['任务前缀'] = safe['前缀'];

  /** 替换占位符：支持 {{key}} 和 {{@key}} */
  const PLACEHOLDER = /\{\{\s*@?([^}]+?)\s*\}\}/g;
  let line = template.replace(PLACEHOLDER, (_m, p1) => {
    const key = String(p1).trim();
    return key in safe ? safe[key] : '';
  });

  /** 若模板没有任何前缀占位符，则在最前面补一个 */
  const hasPrefixSlot = /\{\{\s*@?(?:前缀|任务前缀)\s*\}\}/.test(template);
  if (!hasPrefixSlot && !line.startsWith('- [')) {
    const fallback = safe['前缀'] || '- [ ] ';
    line = fallback + line;
  }

  /** 压缩多余空格并返回 */
  return line.replace(/[ \t]+/g, ' ').trim();
}

/* ------------------------------------------------------------------ */
/*  块：计划 / 总结 / 思考 / 打卡                                       */
/* ------------------------------------------------------------------ */
export function makeBlock(opts: {
  category: string;                          // 计划 / 总结 / 思考 / 打卡
  dateISO?: string;
  themeLabel?: string;                       // 主题:: 顶层显示
  icon?: string;
  content: string;                           // 可多行
  tags?: string[];                           // 标签:: a, b
  extra?: Record<string,string>;             // 周期 / 分类 ...
  fieldsOrder?: string[];                    // 自定义字段顺序
}) {
  /* 默认顺序；可通过 fieldsOrder 覆盖 */
  const order = opts.fieldsOrder ?? ['分类','日期','主题','图标','标签','周期','分类','内容'];

  /** 组装所有可能出现的字段 */
  const dict: Record<string,string> = {
    '分类': opts.category,
    '日期': opts.dateISO ? normalizeDateStr(opts.dateISO) : '',
    '主题': opts.themeLabel ?? '',
    '图标': opts.icon ?? '',
    '标签': opts.tags?.join(', ') ?? '',
    ...opts.extra,                            // 周期 / 分类 等
    '内容': (opts.content || '').trim()
  };

  /** helper */
  const kv = (k:string,v?:string)=> v ? `${k}:: ${v}` : '';

  const lines: string[] = ['<!-- start -->'];

  /* 按顺序输出 */
  order.forEach(f => {
    if (f==='内容' && dict['内容'].includes('\n')) {
      const [first,...rest] = dict['内容'].split('\n');
      lines.push('内容:: '+ first, ...rest);
    } else {
      const line = kv(f, dict[f]);
      if (line) lines.push(line);
    }
  });

  lines.push('<!-- end -->');
  return lines.join('\n');
}

/* ------------------------------------------------------------------ */
/*  旧版任务行（带 emoji & #标签）                                     */
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

  if (opts.repeat)
    pieces.push(`${EMOJI.repeat} every ${opts.repeat}${opts.repeat === 'day' ? '' : 's'}`);

  if (opts.statusEmoji && opts.markDate)
    pieces.push(`${opts.statusEmoji} ${normalizeDateStr(opts.markDate)}`);

  return pieces.join(' ').trim();
}