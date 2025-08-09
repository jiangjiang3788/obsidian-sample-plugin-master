// src/features/quick-input/logic/registerCommands.ts
import type { App } from 'obsidian';
import type ThinkPlugin from '../../../main';

/** 与 main.ts 保持一致的注入上下文 */
export interface ThinkContext {
  app: App;
  plugin: ThinkPlugin;
  platform: any;
  dataStore: any;
}

import { QuickTaskModal }   from '../ui/QuickTaskModal';
import { QuickBlockModal }  from '../ui/QuickBlockModal';
import { QuickHabitModal }  from '../ui/QuickHabitModal';

export function registerQuickInputCommands(ctx: ThinkContext) {
  const { plugin } = ctx;

  plugin.addCommand({
    id: 'think-quick-input-task',
    name: '快速录入 · 任务',
    callback: () => new QuickTaskModal(plugin).open(),
  });
  plugin.addCommand({
    id: 'think-quick-input-block',
    name: '快速录入 · 计划/总结/思考',
    callback: () => new QuickBlockModal(plugin).open(),
  });
  plugin.addCommand({
    id: 'think-quick-input-habit',
    name: '快速录入 · 打卡',
    callback: () => new QuickHabitModal(plugin).open(),
  });
}