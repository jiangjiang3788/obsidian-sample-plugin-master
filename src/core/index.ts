// src/core/index.ts
export * from './domain/constants';
export * from './domain/categoryColorMap';
export * from './domain/schema';
export * from './domain/fields'; // [MOD] 导出新的字段注册表模块

export * from './utils';

export * from './services/dataStore';
export * from '@core/services/taskService';
export * from '@core/services/inputService';