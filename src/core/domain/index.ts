// src/core/domain/index.ts

/**
 * @file Domain Layer Barrel File
 * ----------------------------------------------------------------
 * 这是领域模型层的统一出口文件。
 * 所有外部模块都应通过此文件来导入领域层的定义，
 * 以便实现更好的模块化和解耦。
 */

export * from './constants';
export * from './definitions'; // 导出新的定义文件
export * from './schema';
export * from './fields';