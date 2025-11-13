// src/features/dashboard/styles/index.ts
// 统一导出所有样式模块

import { BASE_STYLES } from './base';
import { COMPONENT_STYLES } from './components';
import { LAYOUT_STYLES } from './layout';
import { BLOCK_VIEW_STYLES } from './views/block-view';
import { TIMELINE_VIEW_STYLES } from './views/timeline-view';
import { STATISTICS_VIEW_STYLES } from './views/statistics-view';
import { HEATMAP_VIEW_STYLES } from './views/heatmap-view';
import { SETTINGS_STYLES } from './settings';
import { UTILITY_STYLES } from './utilities';

// 计时器组件样式
const TIMER_STYLES = `
/*
 * --- 悬浮计时器样式 ---
 */
.think-plugin-timer-widget {
    margin: 0 8px; /* 与状态栏中的其他项保持一点距离 */
}
.think-plugin-timer-widget > .MuiPaper-root {
    background-color: var(--background-secondary) !important;
}
`;

// 模态框样式
const MODAL_STYLES = `
/*
 * --- 插件专用模态框微调 (Modal Tweaks) ---
 */

/* 隐藏快速输入面板的原生关闭按钮，因为我们已在组件内部实现了一个 */
.think-quick-input-modal .modal-close-button {
    display: none !important;
}

/* 移动端快捷输入面板适配 - 避免被输入法覆盖 */
/* 竖屏模式适配 */
@media screen and (orientation: portrait) {
    .think-quick-input-modal {
        position: fixed !important;
        top: 20px !important;
        left: 10px !important;
        right: 10px !important;
        bottom: auto !important;
        max-height: calc(100vh - 120px) !important;
        transform: none !important;
        margin: 0 !important;
        border-radius: 12px !important;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2) !important;
        width: auto !important;
        height: auto !important;
        display: flex !important;
        flex-direction: column !important;
    }
    
    .think-quick-input-modal .modal-content {
        flex: 1 !important;
        overflow-y: auto !important;
        overflow-x: hidden !important;
        padding: 16px !important;
    }
}
`;

// 主要样式注释头部
const STYLE_HEADER = `
/*
 * ===================================================================
 * Think Plugin 全局样式表 (模块化重构版)
 * -------------------------------------------------------------------
 * 本文件统一管理插件的所有自定义CSS。
 * 结构已按功能模块重新组织，以提高可读性和可维护性。
 * ===================================================================
 */

`;

// 合并所有样式
export const GLOBAL_CSS = [
    STYLE_HEADER,
    BASE_STYLES,           // 基础样式（MUI重置、全局元素）
    COMPONENT_STYLES,      // 通用组件样式
    LAYOUT_STYLES,         // Dashboard布局、模块面板
    BLOCK_VIEW_STYLES,     // BlockView专属样式
    TIMELINE_VIEW_STYLES,  // TimelineView专属样式
    STATISTICS_VIEW_STYLES, // StatisticsView专属样式
    HEATMAP_VIEW_STYLES,   // HeatmapView专属样式
    SETTINGS_STYLES,       // 设置面板样式
    TIMER_STYLES,          // 计时器组件样式
    MODAL_STYLES,          // 模态框样式
    UTILITY_STYLES         // 工具类样式
].join('\n\n');

// 为了向后兼容，保持相同的导出名称
export default GLOBAL_CSS;
