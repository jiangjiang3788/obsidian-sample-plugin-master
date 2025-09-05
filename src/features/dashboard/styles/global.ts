// src/features/dashboard/styles/global.ts

// [FINAL VERSION]
export const GLOBAL_CSS = `
/* 让复选框使用系统外观 */
.task-checkbox {
  appearance: auto !important;
  -webkit-appearance: checkbox !important;
}

/* ✅ 已完成 / 勾选时使用亮绿色 */
.task-checkbox.done,
.task-checkbox:checked {
  accent-color: #16a34a !important;
}

/* 已完成的复选框不可再次点击（写在 CSS 里或写在 JSX 都行） */
.task-checkbox.done {
  pointer-events: none;
}
.task-checkbox:checked::after {
  content: none !important;
  display: none !important;
  -webkit-mask-image: none !important;
  background-color: transparent !important;
}


/* ──────────────────────────────────────────────────────────────── */
/*   放在插件自己的样式文件里；重载插件后立即生效                   */
/* ──────────────────────────────────────────────────────────────── */

/* 设置面板整行字体再大一点（原本 13-14px）*/
.think-setting-table  { font-size: 15px; }

/* 表头加粗、加大 */
.think-setting-table thead th {
  font-size: 16px;
  font-weight: 700;
}

/* 每一行的 emoji / 图标再放大 25% */
.think-setting-table td.icon-cell {
  font-size: 135%;          /* emoji 用字体大小控制 */
  line-height: 1.2;
}

/* 如果你用 img 作为图标，可限制高度并增加内边距 */
.think-setting-table td.icon-cell img {
  height: 20px;
  width : 20px;
  margin-right: 4px;
}

/* 勾选框列留一点左右间距（更好点触） */
.think-setting-table td input[type="checkbox"] {
  transform: scale(1.2);    /* 整体放大勾选框 */
  margin: 0 4px;
}

/* 红色垃圾桶按钮加大 */
.think-setting-table td .trash-btn {
  font-size: 18px;
  padding: 2px 6px;
}





/* 视图说明条 */
.view-meta{
  display:flex;align-items:center;gap:6px;
  font-size:12px;background:#fafafa;border-left:3px solid var(--c);
  padding:4px 8px;border-radius:6px;margin:.25rem 0 .5rem;
}
.view-meta .dot{width:6px;height:6px;border-radius:50%;background:var(--c);}


/* 让 Autocomplete 包裹的 tag 背景清空，否则会盖掉我们的小 pill */
.MuiAutocomplete-root .MuiAutocomplete-tag {
  padding: 0 !important;
  background: transparent !important;
  border: 0 !important;
  box-shadow: none !important;
}

/* 扁平小 pill：确保出现浅灰色圆角背景块 */
.think-pills { display:flex; flex-wrap:wrap; gap:6px; }

.think-pills .think-pill{
  display:inline-flex; align-items:center;
  padding:0 8px;
  height:18px; line-height:18px; font-size:12px;
  border-radius:9999px;
  background: var(--think-pill-bg, #eee) !important;   /* 关键：强制浅灰 */
  border: 1px solid rgba(0,0,0,.08);
  cursor:pointer; user-select:none;
}
.think-pills .think-pill:hover{ background:#e3e3e3 !important; }

/* 暗色主题也有对比（Maple/Dark 等） */
body.theme-dark .think-pills .think-pill{
  --think-pill-bg: rgba(255,255,255,.08);
  border-color: rgba(255,255,255,.12);
}

/* [FINAL VERSION] 专为 BlockView 设计的、高度隔离的、符合您个人风格的最终样式 */

/* 基础设置：移除组件内所有链接的下划线 */
.block-language-think .module-content a,
.block-language-think .module-content a:visited,
.block-language-think .module-content a:hover {
    text-decoration: none !important;
    box-shadow: none !important;
}

/* 组标题: [MODIFIED] 移除了 border-bottom，不再有分割线 */
.block-language-think .module-content .bv-group-title {
    margin-bottom: 0.8em;
    font-weight: 600;
    color: var(--text-normal);
    padding-bottom: 0.4em;
    border-bottom: none; 
}

/* Block Item: 移除边框，保留 hover 背景 */
.block-language-think .module-content .bv-item--block {
    display: flex;
    gap: 6px; /* [MODIFIED] 将两栏间距改为 6px，与药丸间距统一 */
    padding: 8px;
    margin-bottom: 8px;
    border-radius: 6px;
    border: none;
}
.block-language-think .module-content .bv-item--block:hover {
    background-color: var(--background-modifier-hover);
}

/* 左栏：元数据: [MODIFIED] 移除了固定的 width，使其自适应内容宽度 */
.block-language-think .module-content .bv-block-metadata {
    flex-shrink: 0;
}

/* 右栏：主内容 */
.block-language-think .module-content .bv-block-main {
    flex-grow: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 6px;
}
/* 响应式：窄屏幕下单栏 */
.block-language-think .module-content .bv-item--block.is-narrow {
    flex-direction: column;
    gap: 8px;
}
.block-language-think .module-content .bv-item--block.is-narrow .bv-block-metadata {
    width: 100%;
}

/* 标题和内容文字样式 */
.block-language-think .module-content .bv-block-title a {
    font-weight: 600;
    color: var(--text-normal);
}
.block-language-think .module-content .bv-block-content a {
    white-space: pre-wrap;
    line-height: 1.6;
    color: var(--text-muted);
}

/* 药丸样式: 恢复您喜欢的原始风格，不设置字体大小 */
.block-language-think .module-content .bv-fields-list {
    display: flex;
    flex-wrap: wrap;
    gap: 6px; /* 药丸之间的间距是 6px */
    align-items: center;
}
.block-language-think .module-content .tag-pill {
    display: inline-flex;
    align-items: center;
    padding: 2px 8px;
    border-radius: 4px;
    background: var(--background-modifier-hover);
    border: 1px solid var(--background-modifier-border);
    white-space: nowrap;
    line-height: 1.5;
}
.block-language-think .module-content .tag-pill img {
    height: 1.2em;
    width: 1.2em;
    object-fit: contain;
}

/* Task Item 的样式也需要被精确限定 */
.block-language-think .module-content .bv-item--task { display: flex; align-items: flex-start; gap: 8px; padding: 4px; border-radius: 6px; }
.block-language-think .module-content .bv-item--task:hover { background-color: var(--background-modifier-hover); }
.block-language-think .module-content .bv-item--task .bv-task-checkbox-wrapper { margin-top: 2px; }
.block-language-think .module-content .bv-item--task .bv-task-content { flex: 1; }
.block-language-think .module-content .bv-item--task .bv-task-title { color: var(--text-normal); line-height: 1.5; }

/* [MODIFIED] 提高 TimelineView 悬浮按钮的 CSS 优先级 */
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
.block-language-think .timeline-task-block:hover .task-buttons {
    visibility: visible;
    opacity: 1;
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

/* [全新] Time Navigator (概览模式导航器) 样式 - 横向布局 */
.time-navigator-container {
    display: flex;
    flex-direction: row;
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
}

/* 左侧控制列 */
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
}
.tn-year-cell:hover {
    opacity: 0.9;
}
.tn-nav-buttons {
    height: 28px;
    flex-shrink: 0;
    display: flex;
    gap: 4px;
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

/* 右侧主内容区 */
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

/* 季度块 */
.tn-quarter-block {
    display: flex;
    flex-direction: column;
    flex: 1; /* 等分宽度 */
    background: var(--background-primary);
    border-radius: 6px;
    padding: 4px;
    gap: 4px;
    cursor: pointer;
    border: 1px solid transparent;
}
.tn-quarter-block.is-selected {
    border-color: #FFD600; /* 黄色高亮选中的季度 */
}
.tn-quarter-block .tn-quarter-header {
    text-align: center;
    font-weight: bold;
    font-size: 0.9em;
    color: var(--text-muted);
    padding-bottom: 2px;
}
.tn-quarter-block .tn-quarter-header.is-past {
    color: #9B7FBD;
}
.tn-quarter-block.is-today .tn-quarter-header {
    color: var(--interactive-accent);
}
.tn-months-container {
    display: flex;
    flex-grow: 1;
    gap: 4px;
}

/* 月份单元格 */
.tn-month-cell {
    flex: 1;
    font-weight: 500;
    background: var(--background-secondary);
    color: var(--text-muted);
    border: 1px solid transparent;
}
.tn-month-cell.is-past {
    background: #9B7FBD;
    color: white;
}
.tn-month-cell.is-today {
    background: var(--interactive-accent-hover);
    color: white;
}
.tn-month-cell.is-selected {
    border-color: #FFD600;
}

/* 周单元格 */
.tn-weeks-container {
    height: 24px;
    flex-shrink: 0;
    background: var(--background-primary);
    border-radius: 6px;
    padding: 3px;
    overflow: hidden;
}
.tn-week-cell {
    flex-basis: 0;
    flex-grow: 1;
    font-size: 10px;
    background: var(--background-secondary);
    color: var(--text-muted);
    cursor: pointer;
    min-width: 10px;
    border: 1px solid transparent;
}
.tn-week-cell.is-past {
    background: #EDE6F6; /* 淡紫色 */
    color: #9B7FBD;
}
.tn-week-cell.is-today {
    background: var(--interactive-accent-hover);
    color: white;
    font-weight: bold;
}
.tn-week-cell.is-selected {
    border-color: #FFD600;
    box-shadow: 0 0 0 1px #FFD600;
}


/* [全新] Statistics View (统计视图) 样式 V3.1 */
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

/* 统一的图表块样式 */
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

/* [核心修改] 竖向柱状图的样式调整 */
.sv-vbar-wrapper {
    flex: 1;
    min-width: 0;
    height: 100%;
    display: flex;
    flex-direction: column; /* 改为正常的列方向 */
    justify-content: flex-end; /* 内容（标签和柱子）在底部对齐 */
    align-items: center;
}
.sv-vbar-bar-label {
    font-size: 10px;
    color: var(--text-muted);
    font-weight: 500;
    margin-bottom: 2px; /* 在数字和柱子顶部之间创建间距 */
}
.sv-vbar-bar {
    width: 80%;
    border-radius: 3px 3px 0 0;
    background: #ccc;
    min-height: 2px;
    transition: height 0.3s ease;
}

/* ... 悬浮窗样式保持不变 ... */
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
    padding: 10px 16px;
    border-bottom: 1px solid var(--background-modifier-border);
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


/* 悬浮窗样式 */
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
    padding: 8px 8px 8px 16px; /* 调整padding为右侧按钮留出空间 */
    border-bottom: 1px solid var(--background-modifier-border);
    display: flex; /* [新增] 使用flex布局 */
    justify-content: space-between; /* [新增] 两端对齐 */
    align-items: center; /* [新增] 垂直居中 */
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
/* ============== [新增] ModulePanel 自定义样式 (v2) ============== */
.think-module {
    border-radius: 8px;
    margin-bottom: 16px;
    overflow: hidden;
    /* 为整个模块添加一个细微的边框，使其更有整体感 */
    border: 1px solid #E4DCD0; 
}
body.theme-dark .think-module {
    border: 1px solid #4a4130;
}

.module-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 12px;
    cursor: pointer;
    background-color: #F0E6D7; /* 用户指定的颜色 */
    color: #5a4b33; /* 为浅色背景搭配深色文字 */
}

body.theme-dark .module-header {
    background-color: #5a4b33; /* 适配暗色模式的深棕色 */
    color: #E5D5B9; /* 适配暗色模式的浅色文字 */
}

.module-title {
    font-weight: 600;
}

.module-header-controls {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
}

.module-header-actions {
    display: flex;
    align-items: center;
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

.module-content {
    padding: 12px;
    /* [修改] 下面这行背景色被删除或注释掉了 */
    /* background-color: #F9F5EF; */
}

body.theme-dark .module-content {
    /* [修改] 下面这行背景色被删除或注释掉了 */
    /* background-color: #2F2A24; */
}



/* Task Item 的样式也需要被精确限定 */
.block-language-think .module-content .bv-item--task { display: flex; align-items: flex-start; gap: 8px; padding: 4px; border-radius: 6px; }
.block-language-think .module-content .bv-item--task:hover { background-color: var(--background-modifier-hover); }
.block-language-think .module-content .bv-item--task .bv-task-checkbox-wrapper { margin-top: 2px; }
.block-language-think .module-content .bv-item--task .bv-task-content { flex: 1; }
.block-language-think .module-content .bv-item--task .bv-task-title { color: var(--text-normal); line-height: 1.5; }

/* [MODIFIED] 提高 TimelineView 悬浮按钮的 CSS 优先级 */
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
.block-language-think .timeline-task-block:hover .task-buttons {
    visibility: visible;
    opacity: 1;
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



/* ============== [新增] 全局计时器挂件样式 ============== */

/* 这是状态栏中由 addStatusBarItem() 创建的容器元素的样式 */
.think-plugin-timer-widget {
    /* 与状态栏中的其他项保持一点距离 */
    margin: 0 8px;
}

/* 我们的 Preact 组件会被渲染到这个容器里 */
/* MUI 的 Paper 组件自带背景和阴影，所以我们不需要在这里加 */
/* 主要是确保它能正确显示 */
.think-plugin-timer-widget > .MuiPaper-root {
    /* 如果需要，可以在这里覆盖MUI组件的样式 */
    /* 例如，确保背景色在不同主题下都清晰可见 */
    background-color: var(--background-secondary) !important;
}
/* ============== [REVISED] HeatmapView Styles ============== */
.heatmap-container {
    --heatmap-cell-size: 20px; /* You can adjust this base size */
    width: 100%;
    padding: 8px;
}
.heatmap-view-wrapper.layout-row {
    display: flex;
    flex-direction: column;
    gap: 8px; /* Space between theme rows */
}
.heatmap-theme-group {
    display: flex;
    align-items: center;
    gap: 10px;
}
.heatmap-theme-label {
    font-size: 0.85em;
    font-weight: 500;
    width: 120px; /* Fixed width for alignment */
    text-align: right;
    flex-shrink: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}
.heatmap-theme-content {
    flex-grow: 1;
    min-width: 0; /* Important for flexbox to allow shrinking */
    overflow-x: auto; /* Allow content to scroll if it's too wide */
    overflow-y: hidden;
}
.heatmap-row {
    display: flex; /* Use flex for single rows */
    gap: 3px;
}
.heatmap-row.single-row {
    padding-bottom: 4px; /* Space for scrollbar */
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
    flex-shrink: 0; /* Prevent cells from shrinking */
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
.heatmap-cell-content {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
}
.heatmap-cell.current-day {
    outline: 2px solid var(--interactive-accent);
    outline-offset: 1px;
}
.heatmap-cell .current-day-star {
    /* Removed, the outline is clearer */
}

/* Styles for Year/Quarter Grid Layout */
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

/* Dark mode adjustments */
body.theme-dark .heatmap-cell {
    background-color: var(--background-modifier-border);
}
body.theme-dark .heatmap-cell.empty {
    background-color: transparent;
}
/* [NEW] Dashboard Toolbar Styles */
.tp-toolbar button {
    /* Base styles for all buttons */
    border: 1px solid transparent; /* Add transparent border to prevent layout shift */
    background-color: var(--background-secondary);
    transition: all 0.2s ease;
}

.tp-toolbar button:hover {
    border-color: var(--background-modifier-border-hover);
    background-color: var(--background-modifier-hover);
}

.tp-toolbar button.active {
    /* Style for the selected button */
    border: 1px solid var(--interactive-accent);
    background-color: var(--interactive-accent-hover);
    color: var(--text-on-accent);
    font-weight: 600;
}

.module-content {
  padding: 12px;
  overflow-x: auto; /* 核心改动：增加这一行 */
}
`.trim();
