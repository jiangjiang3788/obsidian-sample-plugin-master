// src/features/quick-input/index.ts
import type { ThinkContext } from '../../main';
import { registerQuickInputCommands } from './logic/registerCommands';

export function setup(ctx: ThinkContext) { // ctx 参数现在接收的是 ThinkPlugin 的实例
    registerQuickInputCommands(ctx);
}