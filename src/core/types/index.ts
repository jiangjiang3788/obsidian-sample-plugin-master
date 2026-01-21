// src/core/types/index.ts
/**
 * Core Domain Types Public Barrel
 * ---------------------------------------------------------------
 * ✅ 领域模型的统一出口（唯一真源）。
 *
 * 设计原则：
 * - 外部模块（app/features/shared）如果需要领域定义，只能从 @core/public 拿。
 * - core 内部允许相互引用，但对外的“可见面”必须稳定。
 *
 * 注意：
 * - theme/timer 等补充类型也在此统一暴露，避免外部深层 import。
 */

export * from './constants';
export * from './definitions';
export * from './schema';
export * from './fields';
export * from './ai-schema';
export * from './timeline';
export * from './theme';
export * from './timer';
// export * from './cache'; // 如未来有对外需求再打开
