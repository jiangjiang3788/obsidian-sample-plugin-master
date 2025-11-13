// src/features/dashboard/styles/components.ts
// 通用组件样式

export const COMPONENT_STYLES = `
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

/* 主题筛选器样式 (ThemeFilter) */
.theme-filter {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 4px 8px;
    background: var(--background-primary);
    border-radius: 6px;
    border: 1px solid var(--background-modifier-border);
}
.theme-filter > span {
    font-size: 13px;
    color: var(--text-muted);
    white-space: nowrap;
}
.theme-filter button {
    padding: 4px 10px;
    font-size: 13px;
    border: 1px solid var(--background-modifier-border);
    background: var(--background-secondary);
    color: var(--text-normal);
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.2s ease;
    white-space: nowrap;
}
.theme-filter button:hover {
    background: var(--background-modifier-hover);
    border-color: var(--interactive-accent);
}
.theme-filter button.active {
    background: var(--interactive-accent);
    color: var(--text-on-accent);
    border-color: var(--interactive-accent);
    font-weight: 600;
}
`;
