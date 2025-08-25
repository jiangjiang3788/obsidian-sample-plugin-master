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



/* [全新] Statistics View (统计视图) 样式 */
.statistics-view {
    padding: 8px;
    background: var(--background-secondary);
    border-radius: 8px;
}
.sv-timeline {
    display: flex;
    flex-direction: column;
    gap: 8px;
}
.sv-row {
    display: flex;
    gap: 8px;
}
.sv-row-weeks {
    display: flex;
    gap: 4px;
}
.sv-month-col {
    display: flex;
    flex-direction: column;
    gap: 4px;
    flex: 1;
}

/* 柱状图通用样式 */
.sv-bar-chart {
    position: relative;
    display: flex;
    flex-direction: column;
    justify-content: center;
    width: 100%;
    min-height: 48px;
    border-radius: 6px;
    overflow: hidden;
    background: var(--background-primary);
    border: 1px solid var(--background-modifier-border);
    cursor: pointer;
    transition: all 0.2s ease;
    flex: 1;
}
.sv-bar-chart:hover {
    border-color: var(--interactive-accent);
}
.sv-bar-chart.is-empty {
    align-items: center;
    color: var(--text-faint);
    font-size: 12px;
}

.sv-bar-chart-label {
    position: absolute;
    top: 5px;
    left: 8px;
    font-size: 11px;
    font-weight: 500;
    color: var(--text-muted);
    z-index: 2;
}

.sv-bar-chart-container {
    display: flex;
    width: 100%;
    height: 100%;
    align-self: flex-end; /* 使其从底部开始 */
}
.sv-bar-segment {
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: rgba(0,0,0,0.7);
    font-size: 12px;
    font-weight: 500;
    transition: all 0.2s ease;
    text-shadow: 0 0 5px #ffffff99;
}
.sv-bar-segment:hover {
    filter: brightness(1.1);
    transform: scale(1.02);
    z-index: 1;
}
.sv-bar-segment-number {
    opacity: 0;
    transition: opacity 0.2s;
}
.sv-bar-segment:hover .sv-bar-segment-number {
    opacity: 1;
}

/* 周视图的特殊样式 (更紧凑) */
.sv-month-col .sv-bar-chart {
    min-height: 24px;
}
.sv-month-col .sv-bar-chart-label {
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    color: var(--text-normal);
}
.sv-month-col .sv-bar-chart-container {
    opacity: 0.3;
}
.sv-month-col .sv-bar-chart:hover .sv-bar-chart-container {
    opacity: 1;
}
.sv-month-col .sv-bar-chart:hover .sv-bar-chart-label {
    opacity: 0;
}
.sv-month-col .sv-bar-segment-number {
    font-size: 10px;
}

/* 悬浮窗样式 */
.sv-popover {
    background: var(--background-primary);
    border: 1px solid var(--background-modifier-border);
    border-radius: 8px;
    box-shadow: var(--shadow-l);
    max-width: 400px;
    min-width: 250px;
}
.sv-popover-title {
    font-weight: bold;
    padding: 8px 12px;
    border-bottom: 1px solid var(--background-modifier-border);
}
.sv-popover-content {
    max-height: 300px;
    overflow-y: auto;
    padding: 8px;
}
.sv-popover-item {
    padding: 6px 10px;
    border-radius: 4px;
    margin-bottom: 4px;
}
.sv-popover-link {
    text-decoration: none;
    color: var(--text-normal);
}
.sv-popover-empty {
    color: var(--text-faint);
    padding: 16px;
    text-align: center;
}
`.trim();