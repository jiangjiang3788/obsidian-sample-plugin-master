// src/core/config/index.ts
// 唯一真源：所有视图配置从 viewConfigs.ts 导出
export * from './viewConfigs';

// 从 heatmapViewConfig 导出工具函数（保持向后兼容）
export { isImagePath, isHexColor } from './heatmapViewConfig';
