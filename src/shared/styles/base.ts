// src/features/dashboard/styles/base.ts
// 基础样式：MUI重置、全局元素覆盖

export const BASE_STYLES = `
/*
 * --- 1. 全局 MUI & 表单元素覆盖 ---
 * 此部分用于重置MUI组件的默认样式，使其更符合Obsidian的原生外观。
 */

/* 重置图标按钮(IconButton)，移除圆形背景、投影，并使其更紧凑 */
.MuiIconButton-root,
.MuiIconButton-root:hover {
    background-color: transparent !important;
    box-shadow: none !important;
    border-radius: 4px !important;
    width: auto !important;
    height: auto !important;
    padding: 2px !important;
}

/* 将图标按钮中的 SVG 图标颜色设置为 Obsidian 主题强调色 */
.MuiIconButton-root .MuiSvgIcon-root {
    color: var(--interactive-accent);
    font-size: 1.25rem;
}

/* 移除 Autocomplete 组件中标签的背景，以兼容自定义的 pill 样式 */
.MuiAutocomplete-root .MuiAutocomplete-tag {
    padding: 0 !important;
    background: transparent !important;
    border: 0 !important;
    box-shadow: none !important;
}

/* 让原生复选框样式与 Obsidian 保持一致 */
.task-checkbox {
    appearance: auto !important;
    -webkit-appearance: checkbox !important;
}

/* 已完成的复选框使用醒目的主题色 */
.task-checkbox.done,
.task-checkbox:checked {
    accent-color: var(--interactive-accent) !important;
}

/* 已完成的复选框不可再次点击 */
.task-checkbox.done {
    pointer-events: none;
}
.task-checkbox:checked::after {
    content: none !important;
    display: none !important;
    -webkit-mask-image: none !important;
    background-color: transparent !important;
}
`;
