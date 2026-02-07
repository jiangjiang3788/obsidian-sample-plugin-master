// src/shared/types/actions.ts

/**
 * shared/ui 只依赖“事件合同”，不直接依赖 core 的 Service 类。
 * 这些 handler 由 feature 层桥接（例如 LayoutRenderer）。
 */

export type MarkDoneHandler = (id: string) => void;

/**
 * 打开“快捷创建”的 UI 行为。
 * 具体怎么拿 config / 写入什么，由 feature 层决定。
 */
export type OpenQuickCreateHandler = () => void;
