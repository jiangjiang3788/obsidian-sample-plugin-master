// src/features/dashboard/styles/views/block-view.ts
// BlockView 专属样式

export const BLOCK_VIEW_STYLES = `
/*
 * --- BlockView 样式 (恢复为原始的、由JS控制的响应式双栏布局) ---
 */
.block-language-think .bv-group-title {
    margin-bottom: 0.8em;
    font-weight: 600;
    color: var(--text-normal);
    padding-bottom: 0.4em;
    border-bottom: none;
}

/* 整体容器：默认是flex双栏 */
.block-language-think .bv-item--block {
    display: flex;
    gap: 12px;
    padding: 8px;
    margin-bottom: 8px;
    border-radius: 6px;
}
.block-language-think .bv-item--block:hover {
    background-color: var(--background-modifier-hover);
}

/* 左侧元数据栏：宽度由内容决定，且不可压缩 */
.block-language-think .bv-block-metadata {
    flex-shrink: 0;
}

/* 右侧主内容栏：弹性增长，占据所有剩余空间 */
.block-language-think .bv-block-main {
    flex-grow: 1;
    min-width: 0; /* 关键：允许此容器收缩，并使其内部文本正确换行 */
    display: flex;
    flex-direction: column;
    gap: 6px;
}

/* [重要] 窄屏下的响应式切换：当容器宽度过小时，JS会添加 .is-narrow 类 */
.block-language-think .bv-item--block.is-narrow {
    flex-direction: column; /* 切换为垂直堆叠 */
    gap: 8px;
}
.block-language-think .bv-item--block.is-narrow .bv-block-metadata {
    width: 100%; /* 元数据栏宽度变为100% */
}

/* 标题和内容样式 (保留之前的优化) */
.block-language-think .bv-block-title a {
    font-weight: 600;
    color: var(--text-normal);
    word-break: break-word; /* 强制长文本换行 */
}
.block-language-think .bv-block-content a {
    white-space: pre-wrap;
    line-height: 1.6;
    color: var(--text-muted);
    font-size: 0.9em;
}

/* 胶囊容器与胶囊本身样式 (保留之前的优化) */
.block-language-think .bv-fields-list {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    align-items: center;
}
.block-language-think .tag-pill {
    display: inline-flex;
    align-items: center;
    padding: 2px 8px;
    border-radius: 4px;
    background: var(--background-modifier-hover);
    border: none;
    white-space: nowrap;
    line-height: 1.5;
}
.block-language-think .tag-pill img {
    height: 1.2em;
    width: 1.2em;
    object-fit: contain;
}

/* 任务项样式 (TaskItem) */
.block-language-think .bv-item--task {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    padding: 4px;
    border-radius: 6px;
}
.block-language-think .bv-item--task:hover {
    background-color: var(--background-modifier-hover);
}
.block-language-think .bv-item--task .bv-task-checkbox-wrapper {
    margin-top: 2px;
}
.block-language-think .bv-item--task .bv-task-title {
    color: var(--text-normal);
    line-height: 1.5;
}
`;
