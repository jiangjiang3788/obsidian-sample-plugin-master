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

/* 顶部控制栏样式 */
.sv-top-controls {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 16px;
    padding: 12px;
    background: var(--background-primary);
    border-radius: 8px;
    border: 1px solid var(--background-modifier-border);
    gap: 16px;
    flex-wrap: wrap;
}

.sv-period-toggle {
    display: flex;
    align-items: center;
    gap: 6px;
    /* font-size: 13px; -> 使用工具类: think-text-md */
    color: var(--text-normal);
    cursor: pointer;
    user-select: none;
}

.sv-period-toggle input[type="checkbox"] {
    margin: 0;
    cursor: pointer;
}

/* 分类过滤器样式 */
.sv-category-filter {
    display: flex;
    flex-direction: column;
    gap: 8px;
    flex: 1;
}

.sv-filter-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 10px;
}

.sv-filter-title {
    font-weight: 600;
    /* font-size: 14px; -> 使用工具类: think-text-lg */
    color: var(--text-normal);
}

.sv-filter-toggle-all {
    padding: 4px 12px;
    /* font-size: 12px; -> 使用工具类: think-text-base */
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
    /* font-size: 13px; -> 使用工具类: think-text-button-md */
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

/* 时间轴容器 */
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
.sv-row-quarters { 
    grid-template-columns: repeat(4, 1fr); 
}

.sv-row-months { 
    grid-template-columns: repeat(12, 1fr); 
}

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

/* 季度视图的月份周视图部分 */
.sv-month-weeks-section {
    border-top: 1px solid var(--background-modifier-border-hover);
    padding-top: 12px;
}

.sv-month-header {
    font-weight: 600;
    margin-bottom: 8px;
    text-align: center;
    color: var(--text-normal);
    /* font-size: 14px; -> 使用工具类: think-text-lg */
}

.sv-month-col {
    display: flex;
    flex-direction: column;
    gap: 4px;
}

.sv-month-col-header {
    text-align: center;
    /* font-size: 11px; -> 使用工具类: think-text-sm */
    font-weight: 500;
    color: var(--text-faint);
}

.sv-month-col-weeks {
    display: flex;
    flex-direction: column;
    gap: 4px;
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

/* 图表标题 */
.sv-chart-label {
    /* font-size: 13px; -> 使用工具类: think-text-chart-title */
    font-weight: 600;
    color: var(--text-normal);
    text-align: center;
    flex-shrink: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

/* 图表内容容器 */
.sv-chart-content {
    display: flex;
    flex-direction: column;
    gap: 6px;
    flex-grow: 1;
    min-height: 0;
}

/* 数字标签行 */
.sv-chart-numbers {
    display: flex;
    gap: 4px;
    justify-content: space-between;
    align-items: center;
    min-height: 16px;
}

.sv-chart-number {
    flex: 1;
    text-align: center;
    /* font-size: 12px; -> 使用工具类: think-text-chart-value */
    color: var(--text-muted);
    font-weight: 600;
    white-space: nowrap;
    min-height: 16px;
    line-height: 16px;
}

/* 柱状图容器 */
.sv-chart-bars-container {
    display: flex;
    gap: 4px;
    flex-grow: 1;
    align-items: flex-end;
    min-height: 60px;
}

.sv-vbar-wrapper {
    flex: 1;
    min-width: 0;
    height: 100%;
    display: flex;
    justify-content: center;
    align-items: flex-end;
    cursor: pointer;
}

.sv-vbar-wrapper:hover {
    opacity: 0.8;
}

.sv-vbar-bar {
    width: 100%;
    border-radius: 3px 3px 0 0;
    background: #ccc;
    min-height: 2px;
    transition: all 0.3s ease;
}

/* 分类标签行 */
.sv-chart-categories {
    display: flex;
    gap: 4px;
    justify-content: space-between;
    align-items: center;
    min-height: 18px;
}

.sv-chart-category {
    flex: 1;
    text-align: center;
    /* font-size: 11px; -> 使用工具类: think-text-chart-value */
    color: var(--text-muted);
    font-weight: 500;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    min-height: 18px;
    line-height: 18px;
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
    cursor: grab;
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

/* 响应式设计 */
@media screen and (max-width: 768px) {
    .sv-top-controls {
        flex-direction: column;
        align-items: stretch;
        gap: 12px;
    }
    
    .sv-row-quarters {
        grid-template-columns: repeat(2, 1fr);
    }
    
    .sv-row-months {
        grid-template-columns: repeat(6, 1fr);
    }
    
    .sv-row-weeks {
        grid-template-columns: repeat(6, 1fr);
    }
    
    .sv-row-week-days {
        grid-template-columns: repeat(7, 1fr);
        gap: 4px;
    }
    
    .sv-row-month-weeks {
        flex-wrap: wrap;
        justify-content: space-between;
    }
    
    .sv-chart-block {
        height: 100px;
        padding: 6px;
    }
    
    .sv-chart-block.is-compact {
        height: 50px;
        padding: 3px;
    }
}

@media screen and (max-width: 480px) {
    .sv-row-quarters {
        grid-template-columns: repeat(1, 1fr);
    }
    
    .sv-row-months {
        grid-template-columns: repeat(4, 1fr);
    }
    
    .sv-row-weeks {
        grid-template-columns: repeat(4, 1fr);
    }
    
    .sv-row-week-days {
        grid-template-columns: repeat(7, 1fr);
        gap: 2px;
    }
    
    .sv-row-month-weeks {
        flex-direction: column;
        gap: 4px;
    }
    
    .sv-chart-block {
        height: 80px;
        padding: 4px;
    }
    
    .sv-chart-block.is-compact {
        height: 40px;
        padding: 2px;
    }
    
    .sv-chart-label {
        /* font-size: 10px; -> 使用工具类: think-text-chart-label */
    }
    
    .sv-chart-number {
        /* font-size: 10px; -> 使用工具类: think-text-chart-label */
    }
    
    .sv-chart-category {
        /* font-size: 9px; -> 使用工具类: think-text-chart-mini */
    }
}
`;
