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

/* 字体工具类 - 统一字体大小系统 */

/* 基础字体大小 - 遵循 Obsidian 设计规范 */
.think-text-2xs { font-size: 8px; line-height: 1.2; }   /* 最小字体：图表细节、水印 */
.think-text-xs { font-size: 10px; line-height: 1.3; }   /* 超小字体：图表标签、辅助信息 */
.think-text-sm { font-size: 11px; line-height: 1.4; }   /* 小字体：标签、说明文字 */
.think-text-base { font-size: 12px; line-height: 1.4; } /* 基础字体：正文内容 */
.think-text-md { font-size: 13px; line-height: 1.4; }   /* 中等字体：按钮、表单标签 */
.think-text-lg { font-size: 14px; line-height: 1.5; }   /* 大字体：标题、重要内容 */
.think-text-xl { font-size: 15px; line-height: 1.5; }   /* 超大字体：主标题 */
.think-text-2xl { font-size: 16px; line-height: 1.5; }  /* 特大字体：页面标题 */
.think-text-3xl { font-size: 18px; line-height: 1.4; }  /* 巨大字体：重要按钮、图标 */
.think-text-4xl { font-size: 20px; line-height: 1.3; }  /* 最大字体：操作按钮、主要图标 */

/* 特殊用途字体大小 */
.think-text-chart-mini { font-size: 9px; line-height: 1.2; }      /* 图表最小标签 */
.think-text-chart-label { font-size: 10px; line-height: 1.3; }    /* 图表标签 */
.think-text-chart-value { font-size: 11px; line-height: 1.4; }    /* 图表数值 */
.think-text-chart-title { font-size: 13px; line-height: 1.4; }    /* 图表标题 */

.think-text-button-sm { font-size: 12px; line-height: 1; }        /* 小按钮文字 */
.think-text-button-md { font-size: 13px; line-height: 1; }        /* 中等按钮文字 */
.think-text-button-lg { font-size: 14px; line-height: 1; }        /* 大按钮文字 */

.think-text-icon-sm { font-size: 14px; }                          /* 小图标 */
.think-text-icon-md { font-size: 16px; }                          /* 中等图标 */
.think-text-icon-lg { font-size: 18px; }                          /* 大图标 */
.think-text-icon-xl { font-size: 20px; }                          /* 超大图标 */

/* 字体粗细 */
.think-text-thin { font-weight: 300; }
.think-text-normal { font-weight: 400; }
.think-text-medium { font-weight: 500; }
.think-text-semibold { font-weight: 600; }
.think-text-bold { font-weight: 700; }

/* 文本对齐 */
.think-text-left { text-align: left; }
.think-text-center { text-align: center; }
.think-text-right { text-align: right; }
.think-text-justify { text-align: justify; }

/* 行高调整 */
.think-leading-none { line-height: 1; }
.think-leading-tight { line-height: 1.25; }
.think-leading-normal { line-height: 1.5; }
.think-leading-relaxed { line-height: 1.75; }

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
