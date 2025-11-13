// src/features/dashboard/styles/layout.ts
// Dashboard 布局与工具栏样式

export const LAYOUT_STYLES = `
/*
 * --- 3. Dashboard 布局与工具栏 ---
 * Dashboard 视图的整体容器、模块面板和工具栏的样式。
 */

/* 模块面板 (ModulePanel) 容器 */
.think-module {
    border-radius: 8px;
    margin-bottom: 16px;
    overflow: hidden;
    border: 1px solid #E4DCD0;
}
body.theme-dark .think-module {
    border: 1px solid #4a4130;
}

/* 模块面板头部 */
.module-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 5px 12px;
    cursor: pointer;
    background-color: #F0E6D7;
    color: #5a4b33;
}
body.theme-dark .module-header {
    background-color: #5a4b33;
    color: #E5D5B9;
}
.module-title {
    font-weight: 600;
    font-size: 14px;
}
.module-header-controls {
    display: flex;
    align-items: center;
    gap: 8px;
}
.module-action-plus {
    font-size: 20px;
    font-weight: 500;
    line-height: 1;
    color: inherit;
    opacity: 0.6;
    padding: 0 4px;
    border-radius: 4px;
    cursor: pointer;
    user-select: none;
}
.module-action-plus:hover {
    opacity: 1;
    background-color: rgba(0,0,0,0.08);
}
body.theme-dark .module-action-plus:hover {
    background-color: rgba(255,255,255,0.1);
}
.module-toggle {
    font-size: 14px;
    line-height: 1;
    opacity: 0.7;
}

/* 模块面板内容区域 */
.module-content {
    padding: 12px;
    overflow-x: auto;
}
.module-content a,
.module-content a:visited,
.module-content a:hover {
    text-decoration: none !important;
    box-shadow: none !important;
}

/* Dashboard 工具栏 (tp-toolbar) */
.tp-toolbar button {
    border: 1px solid transparent;
    background-color: var(--background-secondary);
    transition: all 0.2s ease;
    font-size: 14px;
    padding: 4px 10px;
}
.tp-toolbar button:hover {
    border-color: var(--background-modifier-border-hover);
    background-color: var(--background-modifier-hover);
}
.tp-toolbar button.active {
    border: 1px solid var(--interactive-accent);
    background-color: var(--interactive-accent-hover);
    color: var(--text-on-accent);
    font-weight: 600;
}
`;
