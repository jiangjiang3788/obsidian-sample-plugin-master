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
export * from '../settings/ThinkSettings';
export * from '../recordInput/CaptureTemplate';
export * from '../theme/ThemeDefinition';
export * from '../view/ViewConfig';
export * from '../fields/ViewFieldCatalog';
export * from '../period/PeriodPolicy';
export type { RecordViewItem } from '../records/RecordEntity';
export * from './ai-schema';
export * from './timeline';

// 4.x / SSOT - common contracts
export * from './common';
export * from './actionMeta';
export * from './theme';
export * from './timer';
// 4.5 composition contracts
export * from './quickInput';
// export * from './cache'; // 如未来有对外需求再打开
export * from './recordInput';
export * from './recordSnapshot';
export * from '../settings/currentSettingsSchema';
