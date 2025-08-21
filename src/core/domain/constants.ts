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
    SETTINGS_TABS: 'think-settings-active-tab', 
    SETTINGS_LAYOUT_OPEN: 'think-settings-layout-open',
    SETTINGS_VIEW_OPEN: 'think-settings-view-open',
    SETTINGS_DATASOURCE_OPEN: 'think-settings-ds-open',
    SETTINGS_INPUT_OPEN: 'think-settings-input-open', 
};

/** 用于自定义 DOM 事件的名称 */
export const EVENT_NAMES = {
    TOGGLE_ALL_MODULES: 'think-toggle-all',
};

/** 默认名称和标签 */
export const DEFAULT_NAMES = {
    NEW_DATASOURCE: '新数据源',
    NEW_VIEW: '新视图',
    NEW_LAYOUT: '新布局',
};

/** 核心Block的名称 (用于快速输入和设置) */
export const BLOCK_NAMES = {
    TASK: 'Task', PLAN: '计划', REVIEW: '总结', THINKING: '思考', HABIT: '打卡',
};

/** 核心字段的键名 (用于快速输入和设置) */
export const FIELD_KEYS = {
    PERIOD: '周期', CATEGORY: '分类', RATING: '评分',
};

// [移除] GLOBAL_CSS 常量，已移动到 `src/features/dashboard/styles/global.ts`