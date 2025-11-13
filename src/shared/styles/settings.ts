// src/features/dashboard/styles/settings.ts
// 设置面板样式

export const SETTINGS_STYLES = `
/*
 * --- 设置面板样式 ---
 */
.think-setting-table {
    font-size: 15px;
}
.think-setting-table thead th {
    font-size: 16px;
    font-weight: 700;
}
.think-setting-table td.icon-cell {
    font-size: 135%;
    line-height: 1.2;
}
.think-setting-table td.icon-cell img {
    height: 20px;
    width: 20px;
    margin-right: 4px;
}
.think-setting-table td input[type="checkbox"] {
    transform: scale(1.2);
    margin: 0 4px;
}
.think-setting-table td .trash-btn {
    font-size: 18px;
    padding: 2px 6px;
}

/*
 * --- Statistics View Editor 样式 ---
 */

/* ===== 基础样式 ===== */
.statistics-editor-container {
  font-size: 14px; /* 统一字体大小 */
}

.statistics-section {
  margin-bottom: 16px;
}

.statistics-section-title {
  font-weight: 600;
  font-size: 14px;
  margin-bottom: 8px;
}

.statistics-section-description {
  font-size: 12px;
  color: var(--text-muted);
  margin-bottom: 8px;
}

/* ===== 显示模式配置 ===== */
.display-mode-options {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
}

.display-mode-label {
  display: flex;
  align-items: center;
  gap: 4px;
  cursor: pointer;
  font-size: 14px;
}

.display-mode-input {
  margin: 0;
}

.display-mode-text {
  user-select: none;
}

.min-height-controls {
  display: flex;
  align-items: center;
  gap: 8px;
}

.min-height-label {
  font-size: 12px;
  color: var(--text-muted);
}

.min-height-slider {
  width: 100px;
}

.min-height-value {
  font-size: 12px;
  font-weight: 500;
  min-width: 30px;
}

/* ===== 分类配置 ===== */
.categories-section-title {
  font-weight: 600;
  font-size: 14px;
  margin-bottom: 4px;
}

.categories-description {
  font-size: 12px;
  color: var(--text-muted);
  margin-bottom: 8px;
}

.category-item {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  padding: 8px;
  background-color: var(--background-modifier-hover);
  border-radius: 6px;
}

/* ===== 移动按钮 ===== */
.move-buttons-container {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.move-button {
  border: none;
  background: transparent;
  padding: 2px;
  font-size: 12px;
  cursor: pointer;
  transition: opacity 0.2s;
}

.move-button:hover:not(:disabled) {
  background-color: var(--background-modifier-hover);
  border-radius: 2px;
}

.move-button:disabled {
  cursor: not-allowed;
  opacity: 0.3;
}

/* ===== 颜色选择器 ===== */
.color-picker {
  width: 40px;
  height: 32px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

/* ===== 分类名称 ===== */
.category-name {
  font-weight: 500;
  min-width: 80px;
  flex: 0 0 auto;
  font-size: 14px;
}

/* ===== 别名输入 ===== */
.alias-input {
  flex: 1 1 100px;
  padding: 4px 8px;
  border: 1px solid var(--background-modifier-border);
  border-radius: 4px;
  font-size: 12px;
  background-color: var(--background-primary);
  color: var(--text-normal);
}

.alias-input:focus {
  outline: none;
  border-color: var(--interactive-accent);
}

.alias-input::placeholder {
  color: var(--text-faint);
}

/* ===== 响应式设计 ===== */
@media (max-width: 768px) {
  .display-mode-options {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
  
  .category-item {
    flex-wrap: wrap;
    gap: 6px;
  }
  
  .category-name {
    min-width: 60px;
  }
  
  .alias-input {
    min-width: 120px;
  }
}

/* ===== 主题适配 ===== */
.theme-dark .category-item {
  background-color: var(--background-modifier-hover);
}

.theme-dark .alias-input {
  background-color: var(--background-primary);
  border-color: var(--background-modifier-border);
}

.theme-dark .move-button:hover:not(:disabled) {
  background-color: var(--background-modifier-border);
}
`;
