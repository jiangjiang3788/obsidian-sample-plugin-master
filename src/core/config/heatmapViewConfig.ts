/**
 * HeatmapView 默认配置
 */
export const DEFAULT_HEATMAP_CONFIG = {
    sourceBlockId: '',
    themePaths: [],
    enableLeveling: true,
    showLevelProgress: true,
};

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
