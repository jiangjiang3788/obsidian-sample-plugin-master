// src/features/quick-input/index.ts
import type { ThinkPlugin } from '../../main'; // 保持 ThinkPlugin 类型以便访问 addCommand
import { registerQuickInputCommands } from './logic/registerCommands';

// [新增] 定义 QuickInput 功能的依赖项
export interface QuickInputDependencies {
    plugin: ThinkPlugin; // registerCommands 需要 plugin 实例来 addCommand
}

// [修改] setup 函数接收明确的依赖对象
export function setup(deps: QuickInputDependencies) {
    registerQuickInputCommands(deps.plugin); // 直接传递所需的 plugin
}