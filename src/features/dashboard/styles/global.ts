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

`.trim();