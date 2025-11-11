// src/features/quick-input/index.ts
import type ThinkPlugin from '@main';
import { AppStore } from '@store/AppStore';
import { registerQuickInputCommands } from './logic/registerCommands';

export interface QuickInputDependencies {
    plugin: ThinkPlugin;
    appStore: AppStore;
}

export function setup(deps: QuickInputDependencies) {
    // 这里的调用是正确的，它将 plugin 和 appStore 实例传递给了 registerQuickInputCommands
    registerQuickInputCommands(deps.plugin, deps.appStore);
}
