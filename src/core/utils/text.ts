// utils/text.ts
// 统一的任务文本清理工具，在 parser / snapshot / 编辑回填 / TaskExecution 等场景复用。

/** 去掉任务行前缀（- [ ] / - [x] 等）。 */
function stripTaskPrefix(text: string): string {
  return String(text || '').replace(/^\s*[-*+]\s*\[[ xX-]\]\s*/, '').trimStart();
}

/** 删除首部连续 emoji/icon。只删除正文最开头的图标，例如 `🖥 长治学院` 里的 `🖥`。 */
function stripLeadingTaskIcons(text: string): string {
  return String(text || '').replace(/^\s*(?:\p{Extended_Pictographic}\uFE0F?\s*)+/u, '').trimStart();
}

/** 删除 Obsidian Tasks / 自定义模板里的内联元数据。 */
function stripTaskMetadata(text: string): string {
  let result = String(text || '');

  // 循环任务：保留正文，剥掉 recurrence 说明。
  result = result.replace(
    /\s*🔁\s*every\s+(?:\d+\s+)?(?:day|week|month|year)s?(?:\s+when\s+done)?(?=$|\s*(?:[\(\[][^^\(\[\])]*::|📅|⏳|🛫|➕|✅|❌|#))/gi,
    ' '
  );

  // 自定义内联字段：(主题::工作/设计) / [主题::工作/设计]
  result = result.replace(/\s*[\(\[][\s\S]*?::[\s\S]*?[\)\]]/g, ' ');

  // Obsidian Tasks 常见日期 emoji。
  result = result
    .replace(/\s*📅\s*\d{4}[-/]\d{2}[-/]\d{2}/g, ' ')
    .replace(/\s*⏳\s*\d{4}[-/]\d{2}[-/]\d{2}/g, ' ')
    .replace(/\s*🛫\s*\d{4}[-/]\d{2}[-/]\d{2}/g, ' ')
    .replace(/\s*➕\s*\d{4}[-/]\d{2}[-/]\d{2}/g, ' ')
    .replace(/\s*✅\s*\d{4}[-/]\d{2}[-/]\d{2}/g, ' ')
    .replace(/\s*❌\s*\d{4}[-/]\d{2}[-/]\d{2}/g, ' ');

  // tag 不是正文。
  result = result.replace(/\s*#[\p{L}\p{N}_/-]+/gu, ' ');

  return result;
}

function normalizeLineBreaksOnly(text: string): string {
  // 只把换行/制表符转成空格；不压缩普通连续空格。
  return String(text || '').replace(/[\t\r\n]+/g, ' ').trim();
}

export interface TaskEditableTextExtractionResult {
  rawInput: string;
  withoutPrefix: string;
  withoutLeadingIcon: string;
  withoutMetadata: string;
  editableText: string;
  /** 中文调试说明：用于判断到底是哪一步把正文截断。 */
  notes: string[];
}

/**
 * 任务正文的唯一提取入口。
 *
 * 设计原则：
 * - parser / snapshot / editStateResolver 必须都用它，避免三处各自猜。
 * - 不按空格 split，不取第一个 token。
 * - 不压缩正文内部连续空格，例如 `长治学院  设计道旗定稿` 必须保留双空格。
 * - 只删除任务语法、开头图标、内联元数据、任务日期 emoji 和 tag。
 */
export function extractTaskEditableText(text: string): TaskEditableTextExtractionResult {
  const rawInput = String(text || '');
  const withoutPrefix = stripTaskPrefix(rawInput);
  const withoutLeadingIcon = stripLeadingTaskIcons(withoutPrefix);
  const withoutMetadata = stripTaskMetadata(withoutLeadingIcon);
  const editableText = normalizeLineBreaksOnly(withoutMetadata);
  const notes: string[] = [];

  if (/\s{2,}/.test(editableText)) {
    notes.push('正文内部存在连续空格；当前统一提取入口会保留这些空格，不会按空格截断。');
  }
  if (/^[^\s]+$/.test(editableText) && /\s{2,}/.test(withoutMetadata.trim())) {
    notes.push('警告：中间结果存在连续空格，但最终结果只剩单 token；请检查后续是否又读取 item.title。');
  }
  if (!editableText && rawInput) {
    notes.push('警告：原始任务行非空，但最终正文为空；可能是元数据正则过度删除。');
  }
  if (editableText && editableText === rawInput.trim()) {
    notes.push('提示：提取结果与原始输入几乎一致，说明输入可能不是完整任务行，或者没有任务语法/元数据可剥离。');
  }

  return { rawInput, withoutPrefix, withoutLeadingIcon, withoutMetadata, editableText, notes };
}

/**
 * 旧函数名保留为兼容入口，但内部必须调用 extractTaskEditableText。
 * SNAPSHOT-MIGRATION: 任务正文只允许维护 extractTaskEditableText 的算法。
 */
export function stripTaskLineToEditableText(text: string): string {
  return extractTaskEditableText(text).editableText;
}

/** 给任务列表/统计/标题显示使用的文本清理。 */
export function cleanTaskText(text: string): string {
  return extractTaskEditableText(text).editableText;
}

export interface TaskEditableTextDebugInfo {
  rawInput: string;
  withoutPrefix: string;
  withoutLeadingIcon: string;
  withoutMetadata: string;
  finalEditableText: string;
  notes: string[];
}

/** 中文调试：用于定位任务正文为什么没有被完整读取。 */
export function explainTaskEditableTextExtraction(text: string): TaskEditableTextDebugInfo {
  const result = extractTaskEditableText(text);
  return {
    rawInput: result.rawInput,
    withoutPrefix: result.withoutPrefix,
    withoutLeadingIcon: result.withoutLeadingIcon,
    withoutMetadata: result.withoutMetadata,
    finalEditableText: result.editableText,
    notes: result.notes,
  };
}
