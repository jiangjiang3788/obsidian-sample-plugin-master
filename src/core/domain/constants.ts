// src/core/domain/constants.ts
export const CODEBLOCK_LANG = 'think';

export const OPS = ['=', '!=', 'includes', 'regex', '>', '<'] as const;

export const EMOJI = {
  done: '✅', cancelled: '❌', due: '📅', scheduled: '⏳', start: '🛫',
  created: '➕', repeat: '🔁',
  prio: { highest: '🔺', high: '⏫', medium: '🔼', low: '🔽', lowest: '⏬' },
} as const;

export const EMPTY_LABEL = '无日期';
export const STYLE_TAG_ID = 'think-plugin-style'; // 更具体的名字

/** 用于 localStorage 的键 */
export const LOCAL_STORAGE_KEYS = {
  SETTINGS_TABS: 'think-settings-active-tab', // [MOD] 改为存储活动标签页
  SETTINGS_LAYOUT_OPEN: 'think-settings-layout-open',
  SETTINGS_VIEW_OPEN: 'think-settings-view-open',
  SETTINGS_DATASOURCE_OPEN: 'think-settings-ds-open',
  SETTINGS_INPUT_OPEN: 'think-settings-input-open', // [NEW]
};

/** 用于自定义 DOM 事件的名称 */
export const EVENT_NAMES = {
  TOGGLE_ALL_MODULES: 'think-toggle-all',
};

/** 默认名称和标签 */
export const DEFAULT_NAMES = {
  NEW_DATASOURCE: '新数据源',
  NEW_VIEW: '新视图',
  NEW_LAYOUT: '新布局', // [MOD]
};

/** 核心Block的名称 (用于快速输入和设置) */
export const BLOCK_NAMES = {
  TASK: 'Task', PLAN: '计划', REVIEW: '总结', THINKING: '思考', HABIT: '打卡',
};

/** 核心字段的键名 (用于快速输入和设置) */
export const FIELD_KEYS = {
  PERIOD: '周期', CATEGORY: '分类', RATING: '评分',
};

/** 全局样式 */
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
.think-layout-grid { display: grid; gap: 8px; }
.think-layout-list { display: flex; flex-direction: column; gap: 8px; }
/* 关键：模块内的所有链接 → 黑色、无下划线（覆盖主题） */
.think-module a, .think-module a:visited { color:#000 !important; text-decoration:none !important; }
.think-module a:hover, .think-module a:active { text-decoration:none !important; }
/* 为工具栏当前激活的周期按钮添加描边提示 */
.tp-toolbar button.active { outline: 2px solid var(--interactive-accent, #007aff); outline-offset: -1px; }
/* [NEW] 时间轴任务块悬停按钮样式 */
.timeline-task-block .task-buttons { visibility: hidden; opacity: 0; position: absolute; top: 2px; right: 2px; display: flex; gap: 2px; background: var(--background-secondary); border-radius: 4px; padding: 2px; box-shadow: var(--shadow-s); transition: opacity 0.1s ease-in-out; }
.timeline-task-block:hover .task-buttons { visibility: visible; opacity: 1; }
.timeline-task-block .task-buttons button { all: unset; cursor: pointer; padding: 2px 4px; border-radius: 2px; font-size: 12px; }
.timeline-task-block .task-buttons button:hover { background: var(--background-modifier-hover); }
.timeline-task-block .task-buttons button:disabled { cursor: not-allowed; color: var(--text-muted); }
`.trim();