// src/shared/utils/id.ts
/**
 * ID 生成工具
 * 全仓唯一真源 - 所有 ID 生成必须使用此文件
 */

/**
 * 生成唯一ID
 * @param prefix - ID前缀，默认为 'id'
 * @returns 生成的唯一ID，格式：prefix_timestamp_random
 * 
 * @example
 * generateId('user')  // => 'user_abc123_xyz789'
 * generateId()        // => 'id_abc123_xyz789'
 */
export function generateId(prefix: string = 'id'): string {
    return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 9)}`;
}
