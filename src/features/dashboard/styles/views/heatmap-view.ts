// src/features/dashboard/styles/views/heatmap-view.ts
// HeatmapView 样式

export const HEATMAP_VIEW_STYLES = `
/*
 * --- HeatmapView 样式 ---
 */
.heatmap-container {
    --heatmap-cell-size: 20px;
    width: 100%;
    padding: 8px;
}

.heatmap-view-wrapper {
    display: flex;
    flex-direction: column;
    gap: 16px;
}

.heatmap-theme-group {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.heatmap-theme-header {
    display: flex;
    gap: 8px;
    padding: 10px 16px;
    background-color: var(--background-primary);
    border-radius: 8px;
    border: 1px solid var(--background-modifier-border);
    transition: all 0.2s ease;
    flex-direction: row;
    align-items: center;
}

.heatmap-header-info {
    display: flex;
    align-items: center;
    gap: 8px;
    min-height: 24px;
    flex-shrink: 0;
}

.heatmap-header-cells {
    display: flex;
    gap: 3px;
    align-items: center;
    min-height: var(--heatmap-cell-size);
    overflow-x: auto;
    overflow-y: hidden;
    padding: 2px 0;
    flex-wrap: wrap;
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
    transition: all 0.2s ease;
    flex-shrink: 0;
    box-sizing: border-box;
}

.heatmap-cell.current-day {
    box-shadow: 0 0 0 1px var(--interactive-accent);
}

.heatmap-cell.empty {
    background-color: transparent;
    cursor: default;
}

body.theme-dark .heatmap-cell {
    background-color: var(--background-modifier-border);
}

body.theme-dark .heatmap-cell.empty {
    background-color: transparent;
}
`;
