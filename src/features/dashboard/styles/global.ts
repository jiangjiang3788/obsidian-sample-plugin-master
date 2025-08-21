// src/features/dashboard/styles/global.ts

export const GLOBAL_CSS = `
/* ... 您其他的全局样式 ... */

/* [MODIFIED] 使用 .block-language-think 作为唯一的、高优先级的父选择器 */

.block-language-think .bv-group { margin-bottom: 1.5em; }
.block-language-think .bv-group-title { margin-bottom: 0.8em; font-size: 1.1em; font-weight: 600; color: var(--text-normal); border-bottom: 1px solid var(--background-modifier-border); padding-bottom: 0.4em; }

.block-language-think .bv-item { transition: background-color 0.2s ease-in-out; border-radius: 6px; }
.block-language-think .bv-item:hover { background-color: var(--background-modifier-hover); }

.block-language-think .bv-item--task { display: flex; align-items: flex-start; gap: 8px; padding: 4px; }
.block-language-think .bv-item--task .bv-task-checkbox-wrapper { margin-top: 1px; }
.block-language-think .bv-item--task .bv-task-content { flex: 1; }
.block-language-think .bv-item--task .bv-task-title { color: var(--text-normal); line-height: 1.5; }

/* Block Item 两栏布局 */
.block-language-think .bv-item--block {
  display: flex !important; /* 使用 !important 确保最高优先级 */
  flex-direction: row !important;
  gap: 16px;
  padding: 8px;
  margin-bottom: 8px;
  border: 1px solid var(--background-modifier-border);
}
.block-language-think .bv-item--block:hover { border-color: var(--interactive-accent); }

/* 左栏：元数据 */
.block-language-think .bv-block-metadata {
  flex-shrink: 0;
  width: 180px;
}

/* 右栏：主内容 */
.block-language-think .bv-block-main {
  flex-grow: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

/* 窄视图下的响应式布局 */
.block-language-think .bv-item--block.is-narrow {
  flex-direction: column !important;
  gap: 8px;
}
.block-language-think .bv-item--block.is-narrow .bv-block-metadata {
  width: 100%;
}

.block-language-think .bv-block-title a { font-weight: 600; font-size: 1.05em; color: var(--text-normal); }
.block-language-think .bv-block-content a { white-space: pre-wrap; line-height: 1.6; color: var(--text-muted); }

.block-language-think .bv-fields-list { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
.block-language-think .tag-pill { display: inline-flex; align-items: center; height: 22px; padding: 0 8px; font-size: 13px; line-height: 1; border-radius: 999px; background: var(--background-modifier-hover); border: 1px solid var(--background-modifier-border); white-space: nowrap; }
.block-language-think .tag-pill img { height: 14px; width: 14px; object-fit: contain; }

`.trim();