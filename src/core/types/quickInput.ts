// src/core/types/quickInput.ts
/**
 * QuickInput domain contract
 * ---------------------------------------------------------------
 * 4.5: QuickInputModal（UI）可能位于 shared / features，但其保存结果
 * 必须是稳定的“域合同”，不能绑定到某个 feature 的实现文件。
 *
 * Final：主 record 链已经不再主动依赖 QuickInputSaveData 回调保存；
 * 该类型仅为 QuickInputModal 的 legacy onSave 兼容口保留。
 */

import type { BlockTemplate, ThemeDefinition } from './schema';
import type { RecordInputSource } from './recordInput';

export interface QuickInputSaveData {
    blockId?: string;
    themeId?: string | null;
    context?: Record<string, any>;
    formData: Record<string, any>;
    source?: Extract<RecordInputSource, 'timer' | 'quickinput' | 'unknown'>;

    // 兼容 Batch 1 之前的旧调用方；Batch 2 之后 Timer create 不再依赖这些字段。
    template?: BlockTemplate;
    theme?: ThemeDefinition;
    templateId?: string | null;
    templateSourceType?: 'block' | 'override' | null;
}
