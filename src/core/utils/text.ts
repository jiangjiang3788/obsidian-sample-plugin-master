// utils/text.ts
// 统一的任务文本清理工具，在 parser / TaskExecution / 编辑回填等场景复用。

/** 去掉任务行前缀（- [ ] / - [x] 等）。 */
function stripTaskPrefix(text: string): string {
  return String(text || '').replace(/^\s*-\s*\[[ xX-]\]\s*/, '').trim();
}

/**
 * 去掉任务行里的装饰信息，但尽量保留用户真正输入的正文。
 * 目标：
 * - `- [ ] 什么也不干🔁every day` -> `什么也不干`
 * - `- [ ] 跑步 🔁 every day (主题::健康) #习惯` -> `跑步`
 */
export function stripTaskLineToEditableText(text: string): string {
  let result = stripTaskPrefix(text);

  // 去掉 recurrence（允许前面没有空格）
  result = result.replace(
    /\s*🔁\s*every\s+(?:\d+\s+)?(?:day|week|month|year)s?(?:\s+when\s+done)?(?=$|\s*(?:[\(\[][^\(\[\])]*::|📅|⏳|🛫|➕|✅|❌|#))/gi,
    ' '
  );

  // 去掉括号中的 key::value 元数据
  result = result.replace(/\s*[\(\[][^\)\]]*::[^\)\]]*[\)\]]/g, ' ');

  // 去掉日期/完成等 emoji 元数据
  result = result
    .replace(/\s*📅\s*\d{4}[-/]\d{2}[-/]\d{2}/g, ' ')
    .replace(/\s*⏳\s*\d{4}[-/]\d{2}[-/]\d{2}/g, ' ')
    .replace(/\s*🛫\s*\d{4}[-/]\d{2}[-/]\d{2}/g, ' ')
    .replace(/\s*➕\s*\d{4}[-/]\d{2}[-/]\d{2}/g, ' ')
    .replace(/\s*✅\s*\d{4}[-/]\d{2}[-/]\d{2}/g, ' ')
    .replace(/\s*❌\s*\d{4}[-/]\d{2}[-/]\d{2}/g, ' ');

  // 去掉 tags
  result = result.replace(/\s*#[\p{L}\p{N}_-]+/gu, ' ');

  // 去掉常见优先级 emoji 前缀
  result = result.replace(/^\s*[🔺⏫🔼🔽⏬🟥🟧🟨🟩🟦🟪]+\s*/u, '');

  return result.replace(/\s+/g, ' ').trim();
}

/**
 * 给任务列表/统计/标题显示使用的文本清理。
 * 这里返回“可读标题”，不再像旧实现那样只取第一个 token。
 */
export function cleanTaskText(text: string): string {
  return stripTaskLineToEditableText(text);
}
