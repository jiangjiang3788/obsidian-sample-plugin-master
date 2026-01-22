// src/core/utils/id.ts
/**
 * ID utilities (SSOT)
 * ---------------------------------------------------------------
 * 说明：
 * - 原先 generateId 位于 shared/utils/id.ts，并被 core 引用，导致 core 反向依赖 shared。
 * - 4.5 起，基础工具统一下沉到 core。
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
