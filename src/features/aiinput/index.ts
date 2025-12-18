// src/features/aiinput/index.ts
// AI 自然语言快速记录功能模块

import type ThinkPlugin from '@/main';
import { AppStore } from '@/app/AppStore';
import { registerAiInputCommands } from './registerCommands';

export interface AiInputDependencies {
    plugin: ThinkPlugin;
    appStore: AppStore;
}

/**
 * 设置 AI 输入功能
 */
export function setup(deps: AiInputDependencies) {
    registerAiInputCommands(deps.plugin, deps.appStore);
}
