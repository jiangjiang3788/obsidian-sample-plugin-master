// src/app/capabilities/public.ts
/**
 * App Capabilities Public API (Phase 4.5)
 * ============================================================
 * ✅ features/shared 需要“能力”，只能从这里拿（组合结果），不能拿零件。
 *
 * 设计目标：
 * - capabilities 是组合层（composition），不是 utils 复用层。
 * - 对外只暴露：Capability 合同 + createXxxCapability 工厂 + createCapabilities 总装配。
 * - 禁止 export *、禁止散落的小 helper，防止变成另一个垃圾桶。
 */

export { createCapabilities } from './createCapabilities';
export type { Capabilities } from './createCapabilities';

// Individual capability factories + contracts
export { createAiCapability } from './capabilities/ai';
export type { AiCapability } from './capabilities/ai';

export { createTimerCapability } from './capabilities/timer';
export type { TimerCapability } from './capabilities/timer';
