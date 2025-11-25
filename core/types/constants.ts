// src/core/domain/constants.ts

/**
 * @file 全局通用常量
 * ----------------------------------------------------------------
 * 此文件存放应用级别的、与具体业务领域关联较弱的常量。
 * 例如：代码块语言标识、UI存储键、事件名等。
 * * 领域相关的核心定义（如Block名称、字段键名）已被移至 `definitions.ts`。
 */

/** 用于代码块的语言标识符 */
export const CODEBLOCK_LANG = 'think';

/** 过滤器支持的操作符 */
export const OPS = ['=', '!=', 'includes', 'regex', '>', '<'] as const;

/** 任务相关的Emoji图标 */
export const EMOJI = {
  done: '✅', cancelled: '❌', due: '📅', scheduled: '⏳', start: '🛫',
  created: '➕', repeat: '🔁',
  prio: { highest: '🔺', high: '⏫', medium: '🔼', low: '🔽', lowest: '⏬' },
} as const;

/** UI中用于空日期的标签 */
export const EMPTY_LABEL = '无日期';

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

/** 在设置中新建项目时的默认名称 */
export const DEFAULT_NAMES = {
    NEW_DATASOURCE: '新数据源',
    NEW_VIEW: '新视图',
    NEW_LAYOUT: '新布局',
};
