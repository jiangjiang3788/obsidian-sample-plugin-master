// src/features/dashboard/styles/views/statistics-view.ts
// StatisticsView & Popover 样式

export const STATISTICS_VIEW_STYLES = `
/*
 * --- StatisticsView & Popover 样式 ---
 */
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

/* 分类过滤器样式 */
.sv-category-filter {
    margin-bottom: 16px;
    padding: 12px;
    background: var(--background-primary);
    border-radius: 8px;
    border: 1px solid var(--background-modifier-border);
}
.sv-filter-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 10px;
}
.sv-filter-title {
    font-weight: 600;
    font-size: 14px;
    color: var(--text-normal);
}
.sv-filter-toggle-all {
    padding: 4px 12px;
    font-size: 12px;
    border: 1px solid var(--background-modifier-border);
    background: var(--background-secondary);
    color: var(--text-muted);
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.2s ease;
}
.sv-filter-toggle-all:hover {
    background: var(--background-modifier-hover);
    border-color: var(--interactive-accent);
    color: var(--text-normal);
}
.sv-filter-buttons {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
}
.sv-filter-btn {
    padding: 6px 14px;
    font-size: 13px;
    font-weight: 500;
    border-radius: 6px;
    border: 2px solid;
    cursor: pointer;
    transition: all 0.2s ease;
    background: transparent;
    white-space: nowrap;
    user-select: none;
}
.sv-filter-btn:hover {
    opacity: 0.85;
    transform: translateY(-1px);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}
.sv-filter-btn.is-selected {
    font-weight: 600;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
}
body.theme-dark .sv-filter-btn:hover {
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}
body.theme-dark .sv-filter-btn.is-selected {
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.4);
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

/* 视图网格样式 */
.sv-row-quarters { grid-template-columns: repeat(4, 1fr); }
.sv-row-months { grid-template-columns: repeat(12, 1fr); }
.sv-row-weeks {
    display: grid;
    grid-template-columns: repeat(12, 1fr);
    gap: 4px;
    border-top: 1px solid var(--background-modifier-border);
    padding-top: 12px;
}
.sv-row-week-days {
    grid-template-columns: repeat(7, 1fr);
    gap: 8px;
}
.sv-row-month-weeks {
    display: flex;
    gap: 8px;
    width: 100%;
}
.sv-row-quarter-months {
    grid-template-columns: repeat(3, 1fr);
    gap: 12px;
}

/* 图表块样式 */
.sv-chart-block {
    display: flex;
    flex-direction: column;
    gap: 8px;
    border-radius: 6px;
    background: var(--background-primary);
    border: 1px solid var(--background-modifier-border);
    cursor: pointer;
    transition: all 0.2s ease;
    padding: 12px;
    height: 220px;
    min-width: 0;
}
.sv-chart-block.is-compact {
    height: 130px;
    padding: 8px;
    gap: 6px;
}
.sv-chart-block:hover {
    border-color: var(--interactive-accent);
    transform: translateY(-1px);
    box-shadow: var(--shadow-s);
}
.sv-chart-block.is-empty .sv-chart-label {
    color: var(--text-faint);
}

/* 弹窗样式 */
.sv-popover {
    background: var(--background-primary);
    border: 1px solid var(--background-modifier-border);
    border-radius: 12px;
    box-shadow: var(--shadow-l);
    width: 500px;
    max-width: 90vw;
    z-index: 99999;
}
.sv-popover-title {
    font-weight: bold;
    padding: 8px 8px 8px 16px;
    border-bottom: 1px solid var(--background-modifier-border);
    display: flex;
    justify-content: space-between;
    align-items: center;
}
.sv-popover-title button {
    transition: background-color 0.2s ease;
}
.sv-popover-title button:hover {
    background-color: var(--background-modifier-hover) !important;
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
`;
