// src/core/index.ts

/**
 * @file Core Layer Barrel File
 * ----------------------------------------------------------------
 * 这是核心逻辑层（Core Layer）的统一总出口。
 * 所有功能模块（Features）都应该只从此文件导入核心逻辑，
 * 以实现最大限度的封装和路径简化。
 */

// 导出所有领域模型定义
export * from './domain';

// 导出所有服务类
export * from './services';

// 导出所有工具函数
export * from './utils';