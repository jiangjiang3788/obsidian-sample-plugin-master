// src/core/utils/inputTemplateUtils.ts
// 输入模板相关工具函数
// 
// 注意：此文件现在是 TemplateResolver 的 thin wrapper
// 所有模板解析逻辑已统一到 TemplateResolver 中

import type { InputSettings, BlockTemplate, ThemeDefinition } from '@/core/types/schema';
import { TemplateResolver, type TemplateResolveResult } from '@/core/services/TemplateResolver';

// Re-export TemplateResolver 相关类型和函数
export { TemplateResolver, type TemplateResolveResult } from '@/core/services/TemplateResolver';

/**
 * 获取有效的模板配置
 * 根据 blockId 和可选的 themeId，返回 block 默认模板；theme 只作为元数据返回
 * 
 * 此函数是 TemplateResolver.resolve 的别名；不再读取 ThemeOverride
 * 
 * @param settings InputSettings 配置
 * @param blockId Block 模板 ID
 * @param themeId 可选的主题 ID
 * @returns 包含 template 和 theme 的对象
 */
export function getEffectiveTemplate(
    settings: InputSettings,
    blockId: string,
    themeId?: string
): { template: BlockTemplate | null; theme: ThemeDefinition | null; templateId: string | null; templateSourceType: 'block' | null } {
    return TemplateResolver.resolve(settings, blockId, themeId);
}
