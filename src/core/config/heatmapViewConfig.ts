// src/core/config/heatmapViewConfig.ts
// 重新导出唯一真源的 Heatmap 默认配置（SSOT）
// 所有 Heatmap 默认配置必须从 viewConfigs.ts 导入

export { HEATMAP_VIEW_DEFAULT_CONFIG, HEATMAP_VIEW_DEFAULT_CONFIG as DEFAULT_HEATMAP_CONFIG } from './viewConfigs';
export type { HeatmapViewConfig } from './viewConfigs';

/**
 * 检查图片路径
 */
export const isImagePath = (value: string): boolean => {
    return /\.(png|svg|jpg|jpeg|gif)$/i.test(value);
};

/**
 * 检查16进制颜色
 */
export const isHexColor = (value: string): boolean => {
    return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(value);
};
