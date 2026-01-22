// src/core/types/quickInput.ts
/**
 * QuickInput domain contract
 * ---------------------------------------------------------------
 * 4.5: QuickInputModal（UI）可能位于 shared / features，但其保存结果
 * 必须是稳定的“域合同”，不能绑定到某个 feature 的实现文件。
 */

import type { BlockTemplate, ThemeDefinition } from './schema';

export interface QuickInputSaveData {
    template: BlockTemplate;
    formData: Record<string, any>;
    theme?: ThemeDefinition;
}
