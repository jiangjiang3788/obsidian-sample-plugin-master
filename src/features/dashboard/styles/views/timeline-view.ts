// src/features/dashboard/styles/views/timeline-view.ts
// TimelineView 专属样式

export const TIMELINE_VIEW_STYLES = `
/*
 * --- TimelineView 样式 ---
 */
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

/* TimeNavigator (概览模式导航器) 样式 */
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
`;
