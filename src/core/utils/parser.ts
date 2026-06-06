// src/core/utils/parser.ts
// 解析任务与块，直接生成 categoryKey（不再生成 status/category）
import { Item } from '@/core/types/schema';
import {
    RE_TASK_PREFIX,
    RE_DONE_BOX, RE_CANCEL_BOX
} from './regex';
// [修改] 导入 getPeriodCount 和 dayjs
import { extractDate, getPeriodCount, dayjs } from './date';
import { EMOJI } from '@/core/types/constants';
import { cleanTaskText, extractTaskEditableText, explainTaskEditableTextExtraction } from './text';
import { extractRecurrenceText } from './mark';
import { applyTaskMetadata, decodeTaskMetadata, decodeBlockContentLines } from '@/core/records/codec';
import { recordDebugLog } from './recordDebug';

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
        // 任务 content 统一为清洗后的正文；完整原始任务行保存在 rawSource / 完整数据字段中。
        content: '',
        rawSource: lineText.trim(),
        type: 'task',
        tags: [], // 稍后填充
        recurrence: 'none', // 稍后填充
        created: 0,
        modified: 0,
        extra: {},
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

    /* ---- 标签 / 括号 meta ---- */
    // Task inline KV 统一交给 MarkdownTaskCodec，避免 parser、写回、字段系统各自维护一份 key 判断。
    applyTaskMetadata(item, decodeTaskMetadata(lineText));

    /* ---- 重复性 ---- */
    const recurrenceText = extractRecurrenceText(lineText);
    if (recurrenceText) item.recurrence = recurrenceText;

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
    // 字段语义统一：任务与 Block 的 content 都代表用户正文，而不是原始 Markdown 行。
    item.content = item.editableText;
    // 不再把正文 alias 写入 extra。正文是核心字段，extra 只保留用户显式未知 KV，
    // 避免字段选择器被 `extra.正文/extra.内容/...` 污染。
    recordDebugLog('任务读取/parser.parseTaskLine', '正文提取', {
        原始任务行: lineText,
        去掉Checkbox和开头图标后的候选正文: titleSrc,
        统一提取入口: editableExtraction,
        最终EditableText: editableText,
        正文长度: editableText.length,
        是否包含连续空格: /\s{2,}/.test(editableText),
        清洗过程: explainTaskEditableTextExtraction(lineText),
        itemTitle: item.title,
        itemContent: item.content,
        说明: '完整原始任务行仍保存在 item.rawSource / 完整数据字段；不再写入 item.extra[正文]。',
    });
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

/** 解析块内容 */
export function parseBlockContent(
    filePath: string, lines: string[], startIdx: number, endIdx: number, parentFolder: string
): Item | null {
    const contentLines = lines.slice(startIdx + 1, endIdx);
    const parsed = decodeBlockContentLines(contentLines, parentFolder);

    const item: Item = {
        id: `${filePath}#${startIdx + 1}`,
        title: parsed.title || '',
        content: parsed.content,
        rawSource: lines.slice(startIdx, endIdx + 1).join('\n'),
        editableText: parsed.content,
        type: 'block',
        tags: parsed.tags,
        goalPaths: parsed.goalPaths,
        recurrence: 'none',
        created: 0,
        modified: 0,
        extra: parsed.extra,
        categoryKey: parsed.categoryKey,
        folder: parentFolder,
        theme: parsed.theme,
    };

    if (parsed.templateId) item.templateId = parsed.templateId;
    if (parsed.templateSourceType) item.templateSourceType = parsed.templateSourceType;
    if (parsed.icon) item.icon = parsed.icon;
    if (parsed.period) item.period = parsed.period;
    if (parsed.rating !== undefined) item.rating = parsed.rating;
    if (parsed.image) item.image = parsed.image;
    if (parsed.pintu) item.pintu = parsed.pintu;

    item.startISO = parsed.date;
    item.endISO = parsed.date;
    if (item.startISO) item.startMs = Date.parse(item.startISO);
    if (item.endISO) item.endMs = item.startMs;

    item.date = parsed.date;

    if (item.period && item.date) {
        item.periodCount = getPeriodCount(item.period, dayjs(item.date));
    }

    return item;
}
