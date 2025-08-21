// src/core/utils/parser.ts
// 解析任务与块，直接生成 categoryKey（不再生成 status/category）
import { Item } from '@core/domain/schema';
import {
    TAG_RE, KV_IN_PAREN, DATE_YMD_RE, RE_TASK_PREFIX,
    RE_DONE_BOX, RE_CANCEL_BOX
} from '@core/utils/regex';
import { normalizeDateStr, extractDate } from '@core/utils/date';
import { EMOJI } from '@core/domain/constants';
import { cleanTaskText } from '@core/utils/text';

/* ---------- 工具 ---------- */
function pick(line: string, emoji: string) { return extractDate(line, emoji); }
const isDoneLine = (line: string) => RE_DONE_BOX.test(line);
const isCancelledLine = (line: string) => RE_CANCEL_BOX.test(line);

/** 解析任务行 */
export function parseTaskLine(
    filePath: string, rawLine: string, lineNo: number, parentFolder: string
): Item | null {
    const lineText = rawLine;
    if (!RE_TASK_PREFIX.test(lineText)) return null;

    /* ---- Item 基础结构 ---- */
    const item: Item = {
        id: `${filePath}#${lineNo}`,
        title: '', // 稍后填充
        content: lineText.trim(),
        type: 'task',
        tags: [], // 稍后填充
        recurrence: 'none', // 稍后填充
        created: 0,
        modified: 0,
        extra: {},
        categoryKey: '', // 稍后填充
    };

    /* ---- 状态 → categoryKey ---- */
    const status = isDoneLine(lineText) ? 'done' : isCancelledLine(lineText) ? 'cancelled' : 'open';
    item.categoryKey = `任务/${status}`;

    /* ---- 标签 ---- */
    const tagMatches = lineText.match(TAG_RE) || [];
    item.tags = tagMatches.map(t => t.replace('#', ''));

    /* ---- 重复性 ---- */
    const recMatch = lineText.match(/🔁\s*([^\n📅⏳🛫➕✅❌]*)/);
    if (recMatch && recMatch[1]) item.recurrence = recMatch[1].trim();

    /* ---- 括号 meta (包含新的核心字段解析) ---- */
    let m: RegExpExecArray | null;
    while ((m = KV_IN_PAREN.exec(lineText)) !== null) {
        const key = m[1].trim();
        const value = m[2].trim();
        const lowerKey = key.toLowerCase();

        if (['主题', '标签', 'tag', 'tags'].includes(lowerKey)) {
            value.split(/[,，]/).forEach(v => {
                const t = v.trim().replace(/^#/, '');
                if (t) item.tags.push(t);
            });
        } else if (['时间', 'time'].includes(key)) {
            item.time = value;
        } else if (['时长', 'duration'].includes(key)) {
            item.duration = Number(value) || undefined;
        } else {
            const num = Number(value);
            let parsed: any = value;
            if (value !== '' && !isNaN(num)) parsed = num;
            else if (/^(true|false)$/i.test(value)) parsed = value.toLowerCase() === 'true';
            item.extra[key] = parsed;
        }
    }
    item.tags = Array.from(new Set(item.tags));

    /* ---- 日期 ---- */
    const doneDate      = pick(lineText, EMOJI.done);
    const cancelledDate = pick(lineText, EMOJI.cancelled);
    const dueDate       = pick(lineText, EMOJI.due);
    const scheduledDate = pick(lineText, EMOJI.scheduled);
    const startDate     = pick(lineText, EMOJI.start);
    const createdDate   = pick(lineText, EMOJI.created);

    /* ---- 优先级 / 图标 / 标题 ---- */
    const pickPriority = (line: string): Item['priority'] | undefined => {
        if (line.includes('🔺')) return 'highest';
        if (line.includes('⏫')) return 'high';
        if (line.includes('🔼')) return 'medium';
        if (line.includes('⏽')) return 'low';
        if (line.includes('⏬')) return 'lowest';
        if (line.includes('🔽')) return 'low';
        return undefined;
    };

    const afterPrefix = lineText.replace(RE_TASK_PREFIX, '').trim();
    const iconMatch = afterPrefix.match(/^(\p{Extended_Pictographic}\uFE0F?)/u);
    let titleSrc = afterPrefix;
    if (iconMatch) {
        item.icon = iconMatch[1];
        titleSrc = titleSrc.replace(/^(?:\p{Extended_Pictographic}\uFE0F?\s*)+/u, '');
    }
    item.title = cleanTaskText(titleSrc) || '';
    item.priority = pickPriority(lineText);

    if (createdDate)   item.createdDate = createdDate;
    if (scheduledDate) item.scheduledDate = scheduledDate;
    if (startDate)     item.startDate = startDate;
    if (dueDate)       item.dueDate = dueDate;
    if (doneDate)      item.doneDate = doneDate;
    if (cancelledDate) item.cancelledDate = cancelledDate;

    item.startISO = startDate || scheduledDate || dueDate || createdDate;
    item.endISO   = doneDate || cancelledDate || dueDate;
    if (!item.startISO && status === 'open') {
        item.startISO = item.date = item.dueDate || item.scheduledDate || item.startDate || item.createdDate;
    }
    if (!item.endISO) item.endISO = item.startISO;

    if (item.startISO) item.startMs = Date.parse(item.startISO);
    if (item.endISO)   item.endMs   = Date.parse(item.endISO);

    return item;
}

/** 解析块内容 */
export function parseBlockContent(
    filePath: string, lines: string[], startIdx: number, endIdx: number, parentFolder: string
): Item | null {
    const contentLines = lines.slice(startIdx + 1, endIdx);
    let title = '';
    let categoryKey: string | null = null;
    let date: string | undefined;
    const tags: string[] = [];
    const extra: Record<string, string | number | boolean> = {};
    let contentText = '';
    let contentStarted = false;
    let iconVal: string | null = null;
    
    let periodVal: string | undefined;
    let ratingVal: number | undefined;
    let pintuVal: string | undefined; // [NEW] 声明变量

    for (let i = 0; i < contentLines.length; i++) {
        const rawLine = contentLines[i];
        const line = rawLine.trim();
        if (!contentStarted) {
            if (line === '') continue;
            // [MODIFIED] 正则表达式 `::?` 允许单冒号或双冒号
            const kv = line.match(/^([^:：]{1,20})::?\s*(.*)$/);
            if (kv) {
                const key = kv[1].trim();
                const value = kv[2] || '';
                const lower = key.toLowerCase();
                
                if (['分类', '类别', 'category'].includes(lower))      categoryKey = value.trim();
                else if (['主题', '标签', 'tag', 'tags'].includes(lower)) tags.push(...value.trim().split(/[,，]/).map(t => t.trim().replace(/^#/, '')));
                else if (['日期', 'date'].includes(lower))             date = normalizeDateStr(value.trim());
                else if (['周期', 'period'].includes(lower))           periodVal = value.trim();
                else if (['评分', 'rating'].includes(lower))           ratingVal = Number(value.trim()) || undefined;
                else if (['图标', 'icon'].includes(lower))             iconVal = value.trim();
                else if (['评图', 'pintu'].includes(lower))            pintuVal = value.trim(); // [NEW] 解析到pintuVal
                else if (['内容', 'content'].includes(lower)) {
                    contentStarted = true; contentText = value;
                } else {
                    const num = Number(value.trim());
                    let parsed: any = value.trim();
                    if (parsed !== '' && !isNaN(num)) parsed = num;
                    else if (/^(true|false)$/i.test(parsed)) parsed = parsed.toLowerCase() === 'true';
                    extra[key] = parsed;
                }
            } else { contentStarted = true; contentText = rawLine; }
        } else { contentText += (contentText ? '\n' : '') + rawLine; }
    }

    if (contentText.trim() !== '')      title = contentText.trim().split(/\r?\n/)[0];
    else if (tags.length > 0)          title = tags.join(', ');
    title = title.replace(/^(?:\p{Extended_Pictographic}\uFE0F?\s*)+/u, '').trim().slice(0, 20);

    if (!categoryKey) categoryKey = parentFolder || '';

    const item: Item = {
        id: `${filePath}#${startIdx + 1}`,
        title: title || '',
        content: contentText.trim(),
        type: 'block',
        tags: Array.from(new Set(tags)),
        recurrence: 'none',
        created: 0,
        modified: 0,
        extra,
        categoryKey,
    };
    if (iconVal) item.icon = iconVal;
    if (periodVal) item.period = periodVal;
    if (ratingVal) item.rating = ratingVal;
    if (pintuVal) item.pintu = pintuVal; // [NEW] 赋值到 item.pintu

    item.startISO = date;
    item.endISO   = date;
    if (item.startISO) item.startMs = Date.parse(item.startISO);
    if (item.endISO)   item.endMs   = item.startMs;

    item.date = date;
    return item;
}