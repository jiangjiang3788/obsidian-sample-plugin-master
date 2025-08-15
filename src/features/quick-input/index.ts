// src/features/quick-input/index.ts
// [修改] 导入 ThinkContext 类型以保持一致性
import type { ThinkContext } from '../../main';
import { registerQuickInputCommands } from './logic/registerCommands';

// [修改] setup 函数的参数从 plugin 改回 ctx (ThinkContext)
export function setup(ctx: ThinkContext) {
  // 保持传递 ctx 对象
  registerQuickInputCommands(ctx);
}