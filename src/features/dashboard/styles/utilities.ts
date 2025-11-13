// src/features/dashboard/styles/utilities.ts
// 工具类样式（从内联样式提取的常用样式）

export const UTILITY_STYLES = `
/*
 * --- 工具类样式 ---
 * 用于替代常见的内联样式
 */

/* 布局工具类 */
.think-flex { display: flex; }
.think-flex-col { display: flex; flex-direction: column; }
.think-flex-center { display: flex; align-items: center; justify-content: center; }
.think-flex-between { display: flex; justify-content: space-between; }
.think-flex-end { display: flex; justify-content: flex-end; }
.think-items-center { align-items: center; }
.think-items-start { align-items: flex-start; }
.think-flex-grow { flex-grow: 1; }
.think-flex-shrink-0 { flex-shrink: 0; }

/* 间距工具类 */
.think-gap-1 { gap: 4px; }
.think-gap-2 { gap: 8px; }
.think-gap-3 { gap: 12px; }
.think-gap-4 { gap: 16px; }
.think-gap-6 { gap: 24px; }

.think-p-1 { padding: 4px; }
.think-p-2 { padding: 8px; }
.think-p-3 { padding: 12px; }
.think-p-4 { padding: 16px; }

.think-m-1 { margin: 4px; }
.think-m-2 { margin: 8px; }
.think-m-3 { margin: 12px; }
.think-m-4 { margin: 16px; }

.think-mb-1 { margin-bottom: 4px; }
.think-mb-2 { margin-bottom: 8px; }
.think-mb-3 { margin-bottom: 12px; }
.think-mb-4 { margin-bottom: 16px; }
.think-mb-6 { margin-bottom: 24px; }

.think-mt-1 { margin-top: 4px; }
.think-mt-2 { margin-top: 8px; }
.think-mt-3 { margin-top: 12px; }
.think-mt-4 { margin-top: 16px; }
.think-mt-6 { margin-top: 24px; }

/* 尺寸工具类 */
.think-w-full { width: 100%; }
.think-h-full { height: 100%; }
.think-min-w-0 { min-width: 0; }
.think-min-h-0 { min-height: 0; }

/* 字体工具类 */
.think-text-xs { font-size: 11px; }
.think-text-sm { font-size: 12px; }
.think-text-base { font-size: 14px; }
.think-text-lg { font-size: 16px; }
.think-text-bold { font-weight: 600; }
.think-text-center { text-align: center; }
.think-text-right { text-align: right; }

/* 颜色工具类 */
.think-text-muted { color: var(--text-muted); }
.think-text-faint { color: var(--text-faint); }
.think-text-normal { color: var(--text-normal); }
.think-text-accent { color: var(--interactive-accent); }

/* 边框工具类 */
.think-border { border: 1px solid var(--background-modifier-border); }
.think-border-t { border-top: 1px solid var(--background-modifier-border); }
.think-border-b { border-bottom: 1px solid var(--background-modifier-border); }
.think-rounded { border-radius: 6px; }
.think-rounded-sm { border-radius: 4px; }

/* 背景工具类 */
.think-bg-primary { background-color: var(--background-primary); }
.think-bg-secondary { background-color: var(--background-secondary); }
.think-bg-hover { background-color: var(--background-modifier-hover); }

/* 其他工具类 */
.think-cursor-pointer { cursor: pointer; }
.think-select-none { user-select: none; }
.think-overflow-hidden { overflow: hidden; }
.think-overflow-auto { overflow: auto; }
.think-whitespace-nowrap { white-space: nowrap; }
.think-text-ellipsis { 
    white-space: nowrap; 
    overflow: hidden; 
    text-overflow: ellipsis; 
}

/* 响应式工具类 */
@media screen and (max-width: 768px) {
    .think-mobile-flex-col { flex-direction: column; }
    .think-mobile-text-sm { font-size: 12px; }
    .think-mobile-gap-1 { gap: 4px; }
    .think-mobile-p-2 { padding: 8px; }
}
`;
