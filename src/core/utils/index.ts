// src/core/utils/index.ts
export * from './date';
export * from './text';
export * from './regex';
export * from './timing';
// [重构] 移除了对 templates.ts 的导出，因为它已被新的 InputService 替代
// export * from './templates'; 
export * from './mark';
export * from './obsidian';
// [重构] 移除了对 inputSettings.ts 的导出，因为全局查找模式已被依赖注入替代
// export * from './inputSettings';