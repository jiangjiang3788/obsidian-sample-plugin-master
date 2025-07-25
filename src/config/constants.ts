// src/config/constants.ts
export const CODEBLOCK_LANG = 'think';

export const OPS = ['=', '!=', 'includes', 'regex', '>', '<'] as const;

export const EMOJI = {
  done: '✅',
  cancelled: '❌',
  due: '📅',
  scheduled: '⏳',
  start: '🛫',
  created: '➕',
  repeat: '🔁',
  prio: {
    highest: '🔺',
    high: '⏫',
    medium: '🔼',
    low: '🔽',
    lowest: '⏬',
  },
} as const;

export const EMPTY_LABEL = '无日期';

export const STYLE_TAG_ID = 'think-dashboard-style';

// 将默认注入样式集中在此，便于替换/关闭
export const GLOBAL_CSS = `
.think-table{width:100%;border:1px solid #ccc;border-collapse:collapse;}
.think-table th,.think-table td{border:1px solid #ccc;padding:4px;}
.think-table th{background:#f0f0f0;text-align:center;}
.think-table td{text-align:left;}
.think-table td.empty{background:#f9f9f9;}
.tag-pill{background:#e0e0e0;border-radius:4px;padding:0 6px;margin-right:6px;font-size:90%;display:inline-block;}
.task-done{text-decoration:line-through;color:gray;}
.module-header{display:flex;align-items:center;padding:4px 8px;background:#eee;cursor:pointer;}
.module-title{flex:1;font-weight:bold;}
.module-toggle{margin-left:4px;}
.module-content{padding:6px 8px;}
.think-module a{color:black;text-decoration:none;}
`.trim();