// src/core/domain/constants.ts
// config/constants.ts
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


// ============================================================================
// [REFACTOR] 统一管理硬编码字符串
// ============================================================================

/** 用于 localStorage 的键 */
export const LOCAL_STORAGE_KEYS = {
  SETTINGS_OPEN_INPUT: 'think-settings-open-input',
  SETTINGS_OPEN_DASHBOARDS: 'think-settings-open-dash',
  TARGET_DASHBOARD: 'think-target-dash',
};

/** 用于自定义 DOM 事件的名称 */
export const EVENT_NAMES = {
  TOGGLE_ALL_MODULES: 'think-toggle-all',
};

/** 内部使用的特殊名称 */
export const INTERNAL_NAMES = {
  INLINE_DASHBOARD: '__inline__',
};

/** 默认名称和标签 */
export const DEFAULT_NAMES = {
  NEW_DASHBOARD: '新仪表盘',
};

/** 核心Block的名称 (用于快速输入和设置) */
export const BLOCK_NAMES = {
  TASK: 'Task',
  PLAN: '计划',
  REVIEW: '总结',
  THINKING: '思考',
  HABIT: '打卡',
};

/** 核心字段的键名 (用于快速输入和设置) */
export const FIELD_KEYS = {
  PERIOD: '周期',
  CATEGORY: '分类',
  RATING: '评分',
};

// ============================================================================

/** 全局样式：把仪表盘里的链接统一成黑色、无下划线（覆盖主题），并保留表格等基础样式 */
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
/* 关键：仪表盘模块内的所有链接 → 黑色、无下划线（覆盖主题） */
.think-module a,
.think-module a:visited { color:#000 !important; text-decoration:none !important; }
.think-module a:hover,
.think-module a:active { text-decoration:none !important; }
`.trim();