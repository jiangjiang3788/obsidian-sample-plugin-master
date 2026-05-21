// src/core/utils/parser.ts
// 解析任务与块，直接生成 categoryKey（不再生成 status/category）
import { Item } from '@/core/types/schema';
import {
    TAG_RE, KV_IN_PAREN, RE_TASK_PREFIX,
    RE_DONE_BOX, RE_CANCEL_BOX
} from './regex';
// [修改] 导入 getPeriodCount 和 dayjs
import { normalizeDateStr, extractDate, getPeriodCount, dayjs } from './date';
import { EMOJI } from '@/core/types/constants';
import { cleanTaskText, extractTaskEditableText, explainTaskEditableTextExtraction } from './text';
import { recordDebugLog } from './recordDebug';
import { extractRecurrenceText } from './mark';
import { addFieldOrigin } from '@/core/types/fieldOrigin';

/* ---------- 工具 ---------- */
function pick(line: string, emoji: string) { return extractDate(line, emoji); }
const isDoneLine = (line: string) => RE_DONE_BOX.test(line);
const isCancelledLine = (line: string) => RE_CANCEL_BOX.test(line);

/** 解析任务行 */
export function parseTaskLine(
    filePath: string, rawLine: string, lineNo: number, parentFolder: string, currentHeader?: string
): Item | null {
    const lineText = rawLine;
    if (!RE_TASK_PREFIX.test(lineText)) return null;

    /* ---- Item 基础结构 ---- */
    const item: Item = {
        id: `${filePath}#${lineNo}`,
        title: '', // 稍后填充
        content: lineText.trim(),
        rawSource: lineText.trim(),
        type: 'task',
        tags: [], // 稍后填充
        recurrence: 'none', // 稍后填充
        created: 0,
        modified: 0,
        extra: {},
        fieldOrigins: {},
        categoryKey: '', // 稍后填充
        // [新增] 填充 folder
        folder: parentFolder,
        // [Day2新增] 主题字段，稍后从标题填充
        theme: undefined,
    };

    /* ---- 状态 → categoryKey ---- */
    const status = isDoneLine(lineText) ? 'done' : isCancelledLine(lineText) ? 'cancelled' : 'open';
    // [修改] 简化分类：完成任务 vs 未完成任务
    item.categoryKey = (status === 'done' || status === 'cancelled') ? '完成任务' : '未完成任务';

    /* ---- 标签 ---- */
    const tagMatches = lineText.match(TAG_RE) || [];
    item.tags = tagMatches.map(t => t.replace('#', ''));
    if (item.tags.length > 0) {
        addFieldOrigin(item, 'tags', {
            value: [...item.tags],
            kind: 'markdown_tag',
            sourcePath: filePath,
            sourceLine: lineNo,
            parser: 'parseTaskLine',
            confidence: 'explicit',
        });
    }

    /* ---- 重复性 ---- */
    const recurrenceText = extractRecurrenceText(lineText);
    if (recurrenceText) item.recurrence = recurrenceText;

    /* ---- 括号 meta (包含新的核心字段解析) ---- */
    let m: RegExpExecArray | null;
    while ((m = KV_IN_PAREN.exec(lineText)) !== null) {
        const key = m[1].trim();
        const value = m[2].trim();
        const lowerKey = key.toLowerCase();

        // 语义止血：
        // - (主题::xxx) 只写入 item.theme，不再混入 tags
        // - tags 仅来自 #tag 或 (标签::) /(tags::)
        if (['主题', 'theme'].includes(lowerKey)) {
            item.theme = value;
            addFieldOrigin(item, 'theme', {
                value,
                kind: 'markdown_task_kv',
                rawKey: key,
                sourcePath: filePath,
                sourceLine: lineNo,
                parser: 'parseTaskLine',
                confidence: 'explicit',
            });
        } else if (['模板id', 'templateid'].includes(lowerKey)) {
            item.templateId = value;
            addFieldOrigin(item, 'templateId', { value, kind: 'markdown_task_kv', rawKey: key, sourcePath: filePath, sourceLine: lineNo, parser: 'parseTaskLine', confidence: 'explicit' });
        } else if (['模板来源', 'templatesource', 'templatesourcetype'].includes(lowerKey)) {
            if (value === 'block' || value === 'override') {
                item.templateSourceType = value;
                addFieldOrigin(item, 'templateSourceType', { value, kind: 'markdown_task_kv', rawKey: key, sourcePath: filePath, sourceLine: lineNo, parser: 'parseTaskLine', confidence: 'explicit' });
            }
        } else if (['标签', 'tag', 'tags'].includes(lowerKey)) {
            const parsedTags: string[] = [];
            value.split(/[,，]/).forEach(v => {
                const t = v.trim().replace(/^#/, '');
                if (t) {
                    item.tags.push(t);
                    parsedTags.push(t);
                }
            });
            if (parsedTags.length > 0) {
                addFieldOrigin(item, 'tags', { value: parsedTags, kind: 'markdown_task_kv', rawKey: key, sourcePath: filePath, sourceLine: lineNo, parser: 'parseTaskLine', confidence: 'explicit' });
            }
        } else if (['时间', 'time', 'start'].includes(lowerKey)) { // [核心修改]
            item.startTime = value;
            addFieldOrigin(item, 'startTime', { value, kind: 'markdown_task_kv', rawKey: key, sourcePath: filePath, sourceLine: lineNo, parser: 'parseTaskLine', confidence: 'explicit' });
        } else if (['结束', 'end'].includes(lowerKey)) { // [核心修改]
            item.endTime = value;
            addFieldOrigin(item, 'endTime', { value, kind: 'markdown_task_kv', rawKey: key, sourcePath: filePath, sourceLine: lineNo, parser: 'parseTaskLine', confidence: 'explicit' });
        } else if (['时长', 'duration'].includes(lowerKey)) { // [核心修改]
            item.duration = Number(value) || undefined;
            addFieldOrigin(item, 'duration', { value: item.duration, kind: 'markdown_task_kv', rawKey: key, sourcePath: filePath, sourceLine: lineNo, parser: 'parseTaskLine', confidence: 'explicit' });
        } else {
            const num = Number(value);
            let parsed: any = value;
            if (value !== '' && !isNaN(num)) parsed = num;
            else if (/^(true|false)$/i.test(value)) parsed = value.toLowerCase() === 'true';
            item.extra[key] = parsed;
            addFieldOrigin(item, `extra.${key}`, {
                value: parsed,
                kind: 'markdown_task_kv',
                rawKey: key,
                sourcePath: filePath,
                sourceLine: lineNo,
                parser: 'parseTaskLine',
                confidence: 'explicit',
            });
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
    // SNAPSHOT-MIGRATION: 任务正文统一从完整 raw line 提取。
    // 不再从 titleSrc 局部文本提取，避免 parser / snapshot / edit resolver 三处结果不一致。
    const editableExtraction = extractTaskEditableText(lineText);
    const editableText = editableExtraction.editableText;
    item.title = editableText || cleanTaskText(titleSrc) || '';
    item.editableText = editableText || item.title || '';
    // 不再把正文 alias 写入 extra。正文是核心语义字段，extra 只保留用户显式未知 KV，
    // 避免字段选择器被 `extra.正文/extra.内容/...` 污染。
    if (typeof window !== 'undefined' && (window as any).__THINK_RECORD_DEBUG__) {
        // 中文调试：任务正文解析阶段。不会影响数据，只输出到控制台。
        console.groupCollapsed('[记录调试][任务读取] parser.parseTaskLine 正文提取');
        console.log('原始任务行:', lineText);
        console.log('去掉 checkbox 和开头图标后的候选正文 titleSrc:', titleSrc);
        console.log('统一提取入口 extractTaskEditableText(lineText):', editableExtraction);
        console.log('最终 editableText:', editableText);
        console.log('正文长度/是否包含连续空格:', { length: editableText.length, hasDoubleSpace: /\s{2,}/.test(editableText) });
        console.log('清洗过程:', explainTaskEditableTextExtraction(lineText));
        console.log('写入 item.title:', item.title);
        console.log('不再写入 item.extra[正文]；正文通过 item.editableText / snapshot.semantic.editableText 暴露。');
        console.groupEnd();
    }
    item.priority = pickPriority(lineText);
    
    // 主题只来自显式元数据 (主题::xxx)/(theme::xxx)。
    // 当前章节标题会在 DataStore 中写入 item.header，但不会再作为 item.theme fallback。

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

/** 解析块内容 (无变化) */
// ... parseBlockContent function remains unchanged ...
export function parseBlockContent(
    filePath: string, lines: string[], startIdx: number, endIdx: number, parentFolder: string
): Item | null {
    const contentLines = lines.slice(startIdx + 1, endIdx);
    let title = '';
    let categoryKey: string | null = null;
    let date: string | undefined;
    const tags: string[] = [];
    const extra: Record<string, string | number | boolean> = {};
    const pendingOrigins: Array<{ field: string; value?: unknown; rawKey?: string; kind: 'markdown_block_kv' | 'markdown_tag' }> = [];
    let contentText = '';
    let contentStarted = false;
    let iconVal: string | null = null;

    let periodVal: string | undefined;
    let ratingVal: number | undefined;
    let pintuVal: string | undefined;
    // [Day2新增] 主题字段
    let themeVal: string | undefined;

    for (let i = 0; i < contentLines.length; i++) {
        const rawLine = contentLines[i];
        const line = rawLine.trim();
        if (!contentStarted) {
            if (line === '') continue;
            const kv = line.match(/^([^:：]{1,20})[:：]{1,2}\s*(.*)$/);
            if (kv) {
                const key = kv[1].trim();
                const value = kv[2] || '';
                const lower = key.toLowerCase();

                if (['分类', '类别', 'category'].includes(lower)) {
                    categoryKey = value.trim();
                    pendingOrigins.push({ field: 'categoryKey', value: categoryKey, rawKey: key, kind: 'markdown_block_kv' });
                }
                else if (['模板id', 'templateid'].includes(lower)) {
                    extra['templateId'] = value.trim();
                    pendingOrigins.push({ field: 'templateId', value: value.trim(), rawKey: key, kind: 'markdown_block_kv' });
                }
                else if (['模板来源', 'templatesource', 'templatesourcetype'].includes(lower)) {
                    extra['templateSourceType'] = value.trim();
                    pendingOrigins.push({ field: 'templateSourceType', value: value.trim(), rawKey: key, kind: 'markdown_block_kv' });
                }
                else if (['主题'].includes(lower)) {
                    // [Day2新增] 主题字段单独处理
                    themeVal = value.trim();
                    pendingOrigins.push({ field: 'theme', value: themeVal, rawKey: key, kind: 'markdown_block_kv' });
                }
                else if (['标签', 'tag', 'tags'].includes(lower)) {
                    const parsedTags = value.trim().split(/[,，]/).map(t => t.trim().replace(/^#/, '')).filter(Boolean);
                    tags.push(...parsedTags);
                    if (parsedTags.length > 0) pendingOrigins.push({ field: 'tags', value: parsedTags, rawKey: key, kind: 'markdown_block_kv' });
                }
                else if (['日期', 'date'].includes(lower)) {
                    date = normalizeDateStr(value.trim());
                    pendingOrigins.push({ field: 'date', value: date, rawKey: key, kind: 'markdown_block_kv' });
                }
                else if (['周期', 'period'].includes(lower)) {
                    periodVal = value.trim();
                    pendingOrigins.push({ field: 'period', value: periodVal, rawKey: key, kind: 'markdown_block_kv' });
                }
                else if (['评分', 'rating'].includes(lower)) {
                    ratingVal = Number(value.trim()) || undefined;
                    pendingOrigins.push({ field: 'rating', value: ratingVal, rawKey: key, kind: 'markdown_block_kv' });
                }
                else if (['图标', 'icon'].includes(lower)) {
                    iconVal = value.trim();
                    pendingOrigins.push({ field: 'icon', value: iconVal, rawKey: key, kind: 'markdown_block_kv' });
                }
                else if (['评图', 'pintu'].includes(lower)) {
                    pintuVal = value.trim();
                    pendingOrigins.push({ field: 'pintu', value: pintuVal, rawKey: key, kind: 'markdown_block_kv' });
                }
                else if (['内容', 'content'].includes(lower)) {
                    contentStarted = true; contentText = value;
                    pendingOrigins.push({ field: 'content', value, rawKey: key, kind: 'markdown_block_kv' });
                } else {
                    const num = Number(value.trim());
                    let parsed: any = value.trim();
                    if (parsed !== '' && !isNaN(num)) parsed = num;
                    else if (/^(true|false)$/i.test(parsed)) parsed = parsed.toLowerCase() === 'true';
                    extra[key] = parsed;
                    pendingOrigins.push({ field: `extra.${key}`, value: parsed, rawKey: key, kind: 'markdown_block_kv' });
                }
            } else { contentStarted = true; contentText = rawLine; }
        } else { contentText += (contentText ? '\n' : '') + rawLine; }
    }

    if (contentText.trim() !== '')      title = contentText.trim().split(/\r?\n/)[0];
    else if (tags.length > 0)        title = tags.join(', ');
    title = title.replace(/^(?:\p{Extended_Pictographic}\uFE0F?\s*)+/u, '').trim().slice(0, 20);

    if (!categoryKey) categoryKey = parentFolder || '';

    const item: Item = {
        id: `${filePath}#${startIdx + 1}`,
        title: title || '',
        content: contentText.trim(),
        rawSource: lines.slice(startIdx, endIdx + 1).join('\n'),
        editableText: contentText.trim(),
        type: 'block',
        tags: Array.from(new Set(tags)),
        recurrence: 'none',
        created: 0,
        modified: 0,
        extra,
        fieldOrigins: {},
        categoryKey,
        folder: parentFolder,
        // [Day2新增] 主题字段
        theme: themeVal,
    };
    const parsedTemplateId = typeof extra['templateId'] === 'string' ? String(extra['templateId']) : undefined;
    const parsedTemplateSourceType = extra['templateSourceType'] === 'block' || extra['templateSourceType'] === 'override' ? extra['templateSourceType'] as 'block' | 'override' : undefined;
    if (parsedTemplateId) item.templateId = parsedTemplateId;
    if (parsedTemplateSourceType) item.templateSourceType = parsedTemplateSourceType;
    delete extra['templateId'];
    delete extra['templateSourceType'];

    if (iconVal) item.icon = iconVal;
    if (periodVal) item.period = periodVal;
    if (ratingVal) item.rating = ratingVal;
    if (pintuVal) item.pintu = pintuVal;

    pendingOrigins.forEach(origin => {
        addFieldOrigin(item, origin.field, {
            value: origin.value,
            kind: origin.kind,
            rawKey: origin.rawKey,
            sourcePath: filePath,
            sourceLine: startIdx + 1,
            parser: 'parseBlockContent',
            confidence: 'explicit',
        });
    });

    item.startISO = date;
    item.endISO   = date;
    if (item.startISO) item.startMs = Date.parse(item.startISO);
    if (item.endISO)   item.endMs   = item.startMs;

    item.date = date;

    if (item.period && item.date) {
        item.periodCount = getPeriodCount(item.period, dayjs(item.date));
    }

    return item;
}
