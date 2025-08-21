// src/features/dashboard/styles/global.ts

/**
 * @file 存放Dashboard功能注入的全局CSS样式。
 * 从 core/domain/constants.ts 迁移至此，以实现业务逻辑与表现层的分离。
 */
export const GLOBAL_CSS = `
.think-table{width:100%;border:1px solid #ccc;border-collapse:collapse;}
.think-table th,.think-table td{border:1px solid #ccc;padding:4px;}
.think-table th{background:#f0f0f0;text-align:center;}
.think-table td{text-align:left;}
.think-table td.empty{background:#f9f9f9;}
.tag-pill{background:#e0e0e0;border-radius:4px;padding:0 6px;margin-right:6px;font-size:90%;display:inline-block;}
.task-done{text-decoration:line-through;color:gray;}
.module-header{display:flex;align-items:center;padding:4px 8px;background:#eee;cursor:pointer;}
.module-title{flex:1;font-weight:bold;}
.module-toggle{margin-left:4px;}
.module-content{padding:6px 8px;}
.think-layout-grid { display: grid; gap: 8px; }
.think-layout-list { display: flex; flex-direction: column; gap: 8px; }
/* 关键：模块内的所有链接 → 黑色、无下划线（覆盖主题） */
.think-module a, .think-module a:visited { color:#000 !important; text-decoration:none !important; }
.think-module a:hover, .think-module a:active { text-decoration:none !important; }
/* 为工具栏当前激活的周期按钮添加描边提示 */
.tp-toolbar button.active { outline: 2px solid var(--interactive-accent, #007aff); outline-offset: -1px; }
/* [NEW] 时间轴任务块悬停按钮样式 */
.timeline-task-block .task-buttons { visibility: hidden; opacity: 0; position: absolute; top: 2px; right: 2px; display: flex; gap: 2px; background: var(--background-secondary); border-radius: 4px; padding: 2px; box-shadow: var(--shadow-s); transition: opacity 0.1s ease-in-out; }
.timeline-task-block:hover .task-buttons { visibility: visible; opacity: 1; }
.timeline-task-block .task-buttons button { all: unset; cursor: pointer; padding: 2px 4px; border-radius: 2px; font-size: 12px; }
.timeline-task-block .task-buttons button:hover { background: var(--background-modifier-hover); }
.timeline-task-block .task-buttons button:disabled { cursor: not-allowed; color: var(--text-muted); }
`.trim();