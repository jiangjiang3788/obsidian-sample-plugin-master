// src/features/quick-input/index.ts
import type ThinkPlugin from '@main';
import { registerQuickInputCommands } from './registerCommands';

/**
 * S7.1: QuickInput 依赖接口 - 移除 AppStore
 * 只需要 plugin 实例，其他依赖通过 DI 或 zustand 获取
 */
export interface QuickInputDependencies {
    plugin: ThinkPlugin;
}

export function setup(deps: QuickInputDependencies) {
    registerQuickInputCommands(deps.plugin);
}
