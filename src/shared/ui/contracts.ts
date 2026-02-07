// src/shared/ui/contracts.ts
//
// shared/ui 纯化的“稳定合同”约定：
// - shared/ui 只能接收 primitive + DTO（可序列化数据结构）
// - 不允许把 service/usecase/store/container 等业务能力直接传入 shared/ui
// - shared/ui 只能通过 callbacks（handlers）触发行为，由 feature 层桥接业务能力
//
// 注意：这是约定与类型辅助，无法 100% 在 TS 层强制；需要配合 eslint gate / 审计脚本。

export type SharedUiPrimitive = string | number | boolean | null | undefined;

export type SharedUiJsonValue =
    | SharedUiPrimitive
    | SharedUiJsonValue[]
    | { [key: string]: SharedUiJsonValue };

/**
 * shared/ui 推荐的 renderModel：只包含可序列化字段（方便测试/缓存/日志）。
 */
export type SharedUiRenderModel = Record<string, SharedUiJsonValue>;
