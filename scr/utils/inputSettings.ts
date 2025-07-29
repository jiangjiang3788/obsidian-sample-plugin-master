// scr/utils/inputSettings.ts 
import type { App } from 'obsidian';
import type ThinkPlugin from '../main';

/**
 * 从插件中拿到统一配置（在任何 Parser / 视图里都可以使用）
 */
export function getInputSettings(app: App): Record<string, any> {
  const plugin = app.plugins.getPlugin('think-plugin') as ThinkPlugin | null;
  return plugin?.inputSettings ?? {};
}