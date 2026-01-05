// src/app/store/slices/index.ts
/**
 * Zustand Slices 统一导出
 * 
 * 提供所有状态切片的导出和组合类型
 */

export { createThemeSlice } from './theme.slice';
export type { ThemeSlice, ThemeSliceState, ThemeSliceActions } from './theme.slice';

export { createLayoutSlice } from './layout.slice';
export type { LayoutSlice, LayoutSliceState, LayoutSliceActions } from './layout.slice';

export { createSettingsSlice } from './settings.slice';
export type { SettingsSlice, SettingsSliceState, SettingsSliceActions } from './settings.slice';

export { createBlocksSlice } from './blocks.slice';
export type { BlocksSlice } from './blocks.slice';

export { createGroupSlice } from './group.slice';
export type { GroupSlice } from './group.slice';

export { createViewInstanceSlice } from './viewInstance.slice';
export type { ViewInstanceSlice } from './viewInstance.slice';
