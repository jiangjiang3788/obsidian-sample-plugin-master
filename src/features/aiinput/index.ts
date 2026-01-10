// src/features/aiinput/index.ts
/**
 * S7.2: AI 自然语言快速记录功能模块
 * 只需要 plugin 实例，其他依赖通过 DI 或 zustand 获取
 */

import type ThinkPlugin from '@/main';
import { registerAiInputCommands } from './registerCommands';

export interface AiInputDependencies {
    plugin: ThinkPlugin;
}

/**
 * 设置 AI 输入功能
 */
export function setup(deps: AiInputDependencies) {
    registerAiInputCommands(deps.plugin);
}
