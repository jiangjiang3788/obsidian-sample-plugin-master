// src/features/settings/ui/components/SettingsTreeView.tsx
/**
 * @deprecated 【S5 已移除】Group 功能已在 S5 移除。
 * 此文件仅保留作参考，禁止使用。
 * Layout/ViewInstance 现使用扁平列表管理，请使用 LayoutSettings.tsx。
 * 
 * 任何尝试使用此组件都会直接抛出异常。
 */
/** @jsxImportSource preact */
import { h, ComponentChild } from 'preact';

const DEPRECATED_ERROR = 'SettingsTreeView is deprecated. Group feature has been removed in S5. Use LayoutSettings instead.';

/**
 * @deprecated Group feature removed in S5
 * @throws Error always - this component is disabled
 */
export function SettingsTreeView(props: any): never {
    throw new Error(DEPRECATED_ERROR);
}

// ============== 原始实现已移除，详见 S5 迁移说明 ==============
