// src/features/quick-input/index.ts
import type ThinkPlugin from '../../main';
import type { App } from 'obsidian';
import { registerQuickInputCommands } from './logic/registerCommands';

/** 与 main.ts 注入的 ThinkContext 对齐（app/plugin/platform/dataStore） */
export interface ThinkContext {
  app: App;
  plugin: ThinkPlugin;
  platform: any;
  dataStore: any;
}

export function setup(ctx: ThinkContext) {
  registerQuickInputCommands(ctx);
}