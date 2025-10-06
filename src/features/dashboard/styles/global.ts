// src/features/dashboard/styles/global.ts

export const GLOBAL_CSS = `
/*
 * ===================================================================
 * Think Plugin 全局样式表 (完整版)
 * -------------------------------------------------------------------
 * 本文件统一管理插件的所有自定义CSS。
 * 结构已按功能模块重新组织，以提高可读性和可维护性。
 * ===================================================================
 */


/*
 * --- 1. 全局 MUI & 表单元素覆盖 ---
 * 此部分用于重置MUI组件的默认样式，使其更符合Obsidian的原生外观。
 */

/* 重置图标按钮(IconButton)，移除圆形背景、投影，并使其更紧凑 */
.MuiIconButton-root,
.MuiIconButton-root:hover {
    background-color: transparent !important;
    box-shadow: none !important;
    border-radius: 4px !important;
    width: auto !important;
    height: auto !important;
    padding: 2px !important;
}

/* 将图标按钮中的 SVG 图标颜色设置为 Obsidian 主题强调色 */
.MuiIconButton-root .MuiSvgIcon-root {
    color: var(--interactive-accent);
    font-size: 1.25rem;
}

/* 移除 Autocomplete 组件中标签的背景，以兼容自定义的 pill 样式 */
.MuiAutocomplete-root .MuiAutocomplete-tag {
    padding: 0 !important;
    background: transparent !important;
    border: 0 !important;
    box-shadow: none !important;
}

/* 让原生复选框样式与 Obsidian 保持一致 */
.task-checkbox {
    appearance: auto !important;
    -webkit-appearance: checkbox !important;
}

/* 已完成的复选框使用醒目的主题色 */
.task-checkbox.done,
.task-checkbox:checked {
    accent-color: var(--interactive-accent) !important;
}

/* 已完成的复选框不可再次点击 */
.task-checkbox.done {
    pointer-events: none;
}
.task-checkbox:checked::after {
    content: none !important;
    display: none !important;
    -webkit-mask-image: none !important;
    background-color: transparent !important;
}


/*
 * --- 2. 通用共享组件样式 ---
 * 用于插件中多个地方复用的自定义小组件。
 */

/* 视图元信息条 (DataSource 说明) */
.view-meta {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    background: #fafafa;
    border-left: 3px solid var(--c);
    padding: 4px 8px;
    border-radius: 6px;
    margin: .25rem 0 .5rem;
}
.view-meta .dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--c);
}

/* 扁平药丸(Pill)样式，用于显示标签等 */
.think-pills {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
}
.think-pills .think-pill {
    display: inline-flex;
    align-items: center;
    padding: 0 8px;
    height: 18px;
    line-height: 18px;
    font-size: 12px;
    border-radius: 9999px;
    background: var(--think-pill-bg, #eee) !important;
    border: 1px solid rgba(0,0,0,.08);
    cursor: pointer;
    user-select: none;
}
.think-pills .think-pill:hover {
    background: #e3e3e3 !important;
}
body.theme-dark .think-pills .think-pill {
    --think-pill-bg: rgba(255,255,255,.08);
    border-color: rgba(255,255,255,.12);
}


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


/*
 * --- 4. 各视图 (View) 专属样式 ---
 */

/* ================== [本次核心修改] ================== */
/* 4a. BlockView 样式 (恢复为原始的、由JS控制的响应式双栏布局) */
.block-language-think .bv-group-title {
    margin-bottom: 0.8em;
    font-weight: 600;
    color: var(--text-normal);
    padding-bottom: 0.4em;
    border-bottom: none;
}

/* 整体容器：默认是flex双栏 */
.block-language-think .bv-item--block {
    display: flex;
    gap: 12px;
    padding: 8px;
    margin-bottom: 8px;
    border-radius: 6px;
}
.block-language-think .bv-item--block:hover {
    background-color: var(--background-modifier-hover);
}

/* 左侧元数据栏：宽度由内容决定，且不可压缩 */
.block-language-think .bv-block-metadata {
    flex-shrink: 0;
}

/* 右侧主内容栏：弹性增长，占据所有剩余空间 */
.block-language-think .bv-block-main {
    flex-grow: 1;
    min-width: 0; /* 关键：允许此容器收缩，并使其内部文本正确换行 */
    display: flex;
    flex-direction: column;
    gap: 6px;
}

/* [重要] 窄屏下的响应式切换：当容器宽度过小时，JS会添加 .is-narrow 类 */
.block-language-think .bv-item--block.is-narrow {
    flex-direction: column; /* 切换为垂直堆叠 */
    gap: 8px;
}
.block-language-think .bv-item--block.is-narrow .bv-block-metadata {
    width: 100%; /* 元数据栏宽度变为100% */
}

/* 标题和内容样式 (保留之前的优化) */
.block-language-think .bv-block-title a {
    font-weight: 600;
    color: var(--text-normal);
    word-break: break-word; /* 强制长文本换行 */
}
.block-language-think .bv-block-content a {
    white-space: pre-wrap;
    line-height: 1.6;
    color: var(--text-muted);
    font-size: 0.9em;
}

/* 胶囊容器与胶囊本身样式 (保留之前的优化) */
.block-language-think .bv-fields-list {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    align-items: center;
}
.block-language-think .tag-pill {
    display: inline-flex;
    align-items: center;
    padding: 2px 8px;
    border-radius: 4px;
    background: var(--background-modifier-hover);
    border: none;
    white-space: nowrap;
    line-height: 1.5;
}
.block-language-think .tag-pill img {
    height: 1.2em;
    width: 1.2em;
    object-fit: contain;
}

/* 任务项样式 (TaskItem) */
.block-language-think .bv-item--task {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    padding: 4px;
    border-radius: 6px;
}
.block-language-think .bv-item--task:hover {
    background-color: var(--background-modifier-hover);
}
.block-language-think .bv-item--task .bv-task-checkbox-wrapper {
    margin-top: 2px;
}
.block-language-think .bv-item--task .bv-task-title {
    color: var(--text-normal);
    line-height: 1.5;
}
/* ======================================================= */


/* 4b. TimelineView 样式 */
.block-language-think .timeline-task-block:hover .task-buttons {
    visibility: visible;
    opacity: 1;
}
.block-language-think .timeline-task-block .task-buttons {
    visibility: hidden;
    opacity: 0;
    position: absolute;
    top: 2px;
    right: 2px;
    display: flex;
    gap: 2px;
    background: var(--background-secondary);
    border-radius: 4px;
    padding: 2px;
    box-shadow: var(--shadow-s);
    transition: opacity 0.1s ease-in-out, visibility 0.1s ease-in-out;
}
.block-language-think .timeline-task-block .task-buttons button {
    all: unset;
    cursor: pointer;
    padding: 2px 4px;
    border-radius: 2px;
    font-size: 12px;
}
.block-language-think .timeline-task-block .task-buttons button:hover {
    background: var(--background-modifier-hover);
}
.block-language-think .timeline-task-block .task-buttons button:disabled {
    cursor: not-allowed;
    color: var(--text-muted);
}


/* 4c. StatisticsView & Popover 样式 */
.statistics-view {
    padding: 8px;
    background: var(--background-secondary);
    border-radius: 8px;
    box-sizing: border-box;
}
.statistics-view-placeholder {
    padding: 40px;
    text-align: center;
    color: var(--text-faint);
    font-size: 1.1em;
}
.sv-timeline {
    display: flex;
    flex-direction: column;
    gap: 12px;
}
.sv-row {
    display: grid;
    gap: 8px;
    border-top: 1px solid var(--background-modifier-border);
    padding-top: 12px;
}
.sv-row:first-child {
    border-top: none;
    padding-top: 0;
}
.sv-row-quarters { grid-template-columns: repeat(4, 1fr); }
.sv-row-months { grid-template-columns: repeat(12, 1fr); }
.sv-row-weeks {
    display: grid;
    grid-template-columns: repeat(12, 1fr);
    gap: 4px;
    border-top: 1px solid var(--background-modifier-border);
    padding-top: 12px;
}
.sv-month-col {
    display: flex;
    flex-direction: column;
    gap: 4px;
}
.sv-month-col-header {
    text-align: center;
    font-size: 11px;
    font-weight: 500;
    color: var(--text-faint);
}
.sv-month-col-weeks {
    display: flex;
    flex-direction: column;
    gap: 4px;
}
.sv-chart-block {
    position: relative;
    display: flex;
    flex-direction: column;
    border-radius: 6px;
    overflow: hidden;
    background: var(--background-primary);
    border: 1px solid var(--background-modifier-border);
    cursor: pointer;
    transition: all 0.2s ease;
    padding: 8px;
    height: 120px;
}
.sv-chart-block.is-compact {
    height: 60px;
    padding: 4px;
}
.sv-chart-block:hover {
    border-color: var(--interactive-accent);
    transform: translateY(-1px);
    box-shadow: var(--shadow-s);
}
.sv-chart-block.is-empty .sv-chart-label {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--text-faint);
    font-size: 12px;
}
.sv-chart-label {
    font-size: 11px;
    font-weight: 500;
    color: var(--text-muted);
    text-align: center;
    margin-bottom: 4px;
    flex-shrink: 0;
}
.sv-chart-bars-container {
    display: flex;
    gap: 4px;
    flex-grow: 1;
    align-items: flex-end;
}
.sv-vbar-wrapper {
    flex: 1;
    min-width: 0;
    height: 100%;
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
    align-items: center;
}
.sv-vbar-bar-label {
    font-size: 10px;
    color: var(--text-muted);
    font-weight: 500;
    margin-bottom: 2px;
}
.sv-vbar-bar {
    width: 80%;
    border-radius: 3px 3px 0 0;
    background: #ccc;
    min-height: 2px;
    transition: height 0.3s ease;
}
.sv-popover {
    background: var(--background-primary);
    border: 1px solid var(--background-modifier-border);
    border-radius: 12px;
    box-shadow: var(--shadow-l);
    width: 500px;
    max-width: 90vw;
}
.sv-popover-title {
    font-weight: bold;
    padding: 8px 8px 8px 16px;
    border-bottom: 1px solid var(--background-modifier-border);
    display: flex;
    justify-content: space-between;
    align-items: center;
}
.sv-popover-content {
    max-height: 450px;
    overflow-y: auto;
    padding: 4px;
}
.sv-popover-content .block-language-think {
    padding: 0;
}
.sv-popover-empty {
    color: var(--text-faint);
    padding: 24px;
    text-align: center;
}


/* 4d. HeatmapView 样式 */
.heatmap-container {
    --heatmap-cell-size: 20px;
    width: 100%;
    padding: 8px;
}
.heatmap-view-wrapper.layout-row {
    display: flex;
    flex-direction: column;
    gap: 8px;
}
.heatmap-theme-group {
    display: flex;
    align-items: center;
    gap: 10px;
}
.heatmap-theme-label {
    font-size: 0.85em;
    font-weight: 500;
    width: 120px;
    text-align: right;
    flex-shrink: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}
.heatmap-theme-content {
    flex-grow: 1;
    min-width: 0;
    overflow-x: auto;
    overflow-y: hidden;
}
.heatmap-row {
    display: flex;
    gap: 3px;
}
.heatmap-row.single-row {
    padding-bottom: 4px;
}
.heatmap-cell {
    position: relative;
    width: var(--heatmap-cell-size);
    height: var(--heatmap-cell-size);
    border-radius: 3px;
    cursor: pointer;
    background-color: #ebedf0;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: calc(var(--heatmap-cell-size) * 0.7);
    transition: transform 0.1s ease-in-out;
    flex-shrink: 0;
}
.heatmap-cell:not(.empty):hover {
    transform: scale(1.15);
    box-shadow: 0 0 4px rgba(0,0,0,0.2);
    z-index: 2;
}
.heatmap-cell.empty {
    background-color: transparent;
    cursor: default;
}
.heatmap-cell img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    border-radius: 3px;
}
.heatmap-cell.current-day {
    outline: 2px solid var(--interactive-accent);
    outline-offset: 1px;
}
.heatmap-view-wrapper.layout-grid .heatmap-theme-group {
    flex-direction: column;
    align-items: stretch;
}
.heatmap-view-wrapper.layout-grid .heatmap-theme-label {
    width: auto;
    text-align: center;
    font-size: 1.2em;
    font-weight: 600;
    margin-bottom: 16px;
}
.heatmap-grid-container {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 24px 12px;
}
.month-section {
    display: flex;
    flex-direction: column;
    align-items: center;
}
.month-label {
    font-size: 0.8em;
    margin-bottom: 4px;
    color: var(--text-muted);
}
.heatmap-row.calendar {
    display: grid;
    grid-template-columns: repeat(7, var(--heatmap-cell-size));
    gap: 3px;
}
body.theme-dark .heatmap-cell {
    background-color: var(--background-modifier-border);
}
body.theme-dark .heatmap-cell.empty {
    background-color: transparent;
}


/* 4e. TimeNavigator (概览模式导航器) 样式 */
.time-navigator-container {
    display: flex;
    flex-direction: row;
    flex-wrap: nowrap;
    gap: 8px;
    height: 100px;
    font-size: 12px;
    user-select: none;
    margin-bottom: 16px;
    width: 100%;
    background: var(--background-secondary);
    padding: 8px;
    border-radius: 8px;
    box-sizing: border-box;
}
.tn-cell {
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 6px;
    transition: all 0.2s ease;
    box-sizing: border-box;
    border: 1px solid transparent;
}
.tn-control-col {
    display: flex;
    flex-direction: column;
    gap: 4px;
    width: 60px;
    flex-shrink: 0;
}
.tn-year-cell {
    flex-grow: 1;
    background: #9B7FBD;
    color: white;
    font-weight: bold;
    font-size: 1.4em;
    cursor: pointer;
    border: none;
}
.tn-year-cell:hover {
    opacity: 0.9;
}
.tn-nav-buttons {
    height: 28px;
    flex-shrink: 0;
    display: flex;
    gap: 4px;
    border: none;
}
.tn-nav-buttons button {
    flex-grow: 1;
    border: 1px solid var(--background-modifier-border);
    background: var(--background-primary);
    border-radius: 6px;
    cursor: pointer;
    font-size: 1.2em;
    padding-bottom: 2px;
}
.tn-nav-buttons button:hover {
    background: var(--background-modifier-hover);
    border-color: var(--interactive-accent);
}
.tn-main-col {
    display: flex;
    flex-direction: column;
    flex-grow: 1;
    gap: 4px;
    min-width: 0;
}
.tn-row {
    display: flex;
    gap: 4px;
}
.tn-row-top {
    flex-grow: 1;
}
.tn-quarter-block {
    display: flex;
    flex-direction: column;
    flex: 1;
    background: var(--background-primary);
    border-radius: 6px;
    padding: 4px;
    gap: 4px;
    cursor: pointer;
}
.tn-quarter-block .tn-quarter-header {
    text-align: center;
    font-weight: bold;
    font-size: 0.9em;
    color: var(--text-muted);
    padding-bottom: 2px;
}
.tn-months-container {
    display: flex;
    flex-grow: 1;
    gap: 4px;
}
.tn-quarter-block.is-before-selection .tn-quarter-header,
.tn-month-cell.is-before-selection {
    color: #9B7FBD;
}
.tn-week-cell.is-before-selection {
    background: #f5f1fa;
    color: #9B7FBD;
}
body.theme-dark .tn-quarter-block.is-before-selection .tn-quarter-header,
body.theme-dark .tn-month-cell.is-before-selection,
body.theme-dark .tn-week-cell.is-before-selection {
    color: #c4b0e0;
}
body.theme-dark .tn-week-cell.is-before-selection {
    background: rgba(155, 127, 189, 0.15);
}
.tn-week-cell.is-today {
    border-color: #FFD700 !important;
}
.tn-quarter-block.is-selected,
.tn-month-cell.is-selected,
.tn-week-cell.is-selected {
    border-color: #9B7FBD !important;
    background-color: rgba(155, 127, 189, 0.15) !important;
    box-shadow: none;
}
.tn-quarter-block.is-selected .tn-quarter-header,
.tn-month-cell.is-selected,
.tn-week-cell.is-selected {
    color: #9B7FBD !important;
    font-weight: bold;
}
body.theme-dark .tn-quarter-block.is-selected,
body.theme-dark .tn-month-cell.is-selected,
body.theme-dark .tn-week-cell.is-selected {
    background-color: rgba(155, 127, 189, 0.2) !important;
}
.tn-month-cell, .tn-week-cell {
    font-weight: 500;
    background: var(--background-secondary);
    color: var(--text-muted);
}
.tn-month-cell {
    flex: 1;
}
.tn-week-cell {
    flex-basis: 0;
    flex-grow: 1;
    font-size: 10px;
    cursor: pointer;
    min-width: 10px;
}
.tn-weeks-container {
    height: 24px;
    flex-shrink: 0;
    background: var(--background-primary);
    border-radius: 6px;
    padding: 3px;
    overflow: hidden;
}


/*
 * --- 5. 设置面板样式 ---
 */
.think-setting-table {
    font-size: 15px;
}
.think-setting-table thead th {
    font-size: 16px;
    font-weight: 700;
}
.think-setting-table td.icon-cell {
    font-size: 135%;
    line-height: 1.2;
}
.think-setting-table td.icon-cell img {
    height: 20px;
    width: 20px;
    margin-right: 4px;
}
.think-setting-table td input[type="checkbox"] {
    transform: scale(1.2);
    margin: 0 4px;
}
.think-setting-table td .trash-btn {
    font-size: 18px;
    padding: 2px 6px;
}


/*
 * --- 6. 悬浮计时器样式 ---
 */
.think-plugin-timer-widget {
    margin: 0 8px; /* 与状态栏中的其他项保持一点距离 */
}
.think-plugin-timer-widget > .MuiPaper-root {
    background-color: var(--background-secondary) !important;
}

/*
 * ===================================================================
 * --- 7. 插件专用模态框微调 (Modal Tweaks) ---
 * ===================================================================
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
        /* 确保滚动条样式美观 */
        scrollbar-width: thin !important;
        scrollbar-color: var(--background-modifier-border) transparent !important;
    }
    
    .think-quick-input-modal .modal-content::-webkit-scrollbar {
        width: 6px !important;
    }
    
    .think-quick-input-modal .modal-content::-webkit-scrollbar-track {
        background: transparent !important;
    }
    
    .think-quick-input-modal .modal-content::-webkit-scrollbar-thumb {
        background-color: var(--background-modifier-border) !important;
        border-radius: 3px !important;
    }
    
    /* 当输入法激活时，让面板底部与输入法顶部齐平 */
    .think-quick-input-modal.keyboard-active {
        top: 10px !important;
        /* 使用环境变量来动态计算输入法高度 */
        max-height: calc(100vh - var(--keyboard-height, 300px) - 20px) !important;
        /* 如果不支持环境变量，使用默认值 */
        max-height: calc(100vh - 320px) !important;
        max-height: calc(100vh - var(--keyboard-height, 300px) - 20px) !important;
    }
    
    /* iPhone 13 Pro Max 等大屏手机适配 (428px 宽度) */
    @media screen and (max-width: 430px) and (orientation: portrait) {
        .think-quick-input-modal {
            top: 15px !important;
            left: 8px !important;
            right: 8px !important;
            max-height: calc(100vh - 130px) !important;
        }
        
        .think-quick-input-modal .modal-content {
            padding: 14px !important;
        }
        
        .think-quick-input-modal.keyboard-active {
            top: 8px !important;
            /* 大屏手机输入法通常更高 */
            max-height: calc(100vh - var(--keyboard-height, 350px) - 16px) !important;
            max-height: calc(100vh - 366px) !important;
            max-height: calc(100vh - var(--keyboard-height, 350px) - 16px) !important;
        }
    }
    
    /* 小屏手机适配 */
    @media screen and (max-width: 375px) and (orientation: portrait) {
        .think-quick-input-modal {
            top: 10px !important;
            left: 5px !important;
            right: 5px !important;
            max-height: calc(100vh - 100px) !important;
        }
        
        .think-quick-input-modal .modal-content {
            padding: 12px !important;
        }
        
        .think-quick-input-modal.keyboard-active {
            top: 5px !important;
            /* 小屏手机输入法相对较小 */
            max-height: calc(100vh - var(--keyboard-height, 280px) - 10px) !important;
            max-height: calc(100vh - 290px) !important;
            max-height: calc(100vh - var(--keyboard-height, 280px) - 10px) !important;
        }
    }
}

/* 横屏模式适配 */
@media screen and (orientation: landscape) and (max-height: 500px) {
    .think-quick-input-modal {
        top: 10px !important;
        left: 10% !important;
        right: 10% !important;
        max-height: calc(100vh - 60px) !important;
        display: flex !important;
        flex-direction: column !important;
    }
    
    .think-quick-input-modal .modal-content {
        flex: 1 !important;
        overflow-y: auto !important;
        overflow-x: hidden !important;
    }
    
    .think-quick-input-modal.keyboard-active {
        top: 5px !important;
        /* 横屏时输入法高度较小 */
        max-height: calc(100vh - var(--keyboard-height, 200px) - 10px) !important;
        max-height: calc(100vh - 210px) !important;
        max-height: calc(100vh - var(--keyboard-height, 200px) - 10px) !important;
    }
}

/* 动态输入法高度检测支持 */
@supports (height: 100dvh) {
    .think-quick-input-modal.keyboard-active {
        /* 使用动态视口高度 */
        max-height: calc(100dvh - var(--keyboard-height, 300px) - 20px) !important;
    }
}

/* iOS Safari 特殊处理 */
@supports (-webkit-touch-callout: none) {
    .think-quick-input-modal {
        /* iOS 安全区域适配 */
        padding-top: env(safe-area-inset-top, 0) !important;
        padding-left: env(safe-area-inset-left, 0) !important;
        padding-right: env(safe-area-inset-right, 0) !important;
    }
    
    .think-quick-input-modal.keyboard-active {
        /* iOS 输入法高度通常为 300px 左右 */
        max-height: calc(100vh - 300px - env(safe-area-inset-bottom, 0) - 20px) !important;
    }
}


`.trim();
