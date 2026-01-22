// src/core/utils/devLogger.ts
/**
 * DevLogger - 开发环境日志工具
 * Role: Utility
 *
 * 【S1 低成本可观测性】
 * - 仅在 development 环境下输出日志
 * - production 环境完全不输出，不影响性能
 * - 提供清晰的日志格式：actionName + source + diff
 *
 * 说明：
 * - 原实现位于 shared/utils/devLogger.ts，导致 core/services 反向依赖 shared。
 * - 4.5 起，该工具下沉到 core（底层唯一真源）。
 */

import type { ActionMeta } from '../types/actionMeta';
import { DEFAULT_ACTION_META } from '../types/actionMeta';

// ============== 环境检测 ==============

/**
 * 检测是否为开发环境
 * 支持 Vite 和 Node.js 环境
 */
function isDev(): boolean {
    // Vite 环境
    if (typeof import.meta !== 'undefined' && import.meta.env) {
        return import.meta.env.DEV === true;
    }
    // Node.js 环境 - 使用类型安全的方式检测
    try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const nodeProcess = (globalThis as any).process;
        if (nodeProcess?.env?.NODE_ENV) {
            return nodeProcess.env.NODE_ENV !== 'production';
        }
    } catch {
        // 忽略错误
    }
    return false;
}

// 缓存环境检测结果
const IS_DEV = isDev();

// ============== Diff 工具 ==============

/**
 * 浅层 diff 两个对象，返回变更的 key paths
 *
 * @param before 变更前的对象
 * @param after 变更后的对象
 * @param prefix 路径前缀
 * @param maxDepth 最大递归深度
 * @returns 变更的 key paths 数组
 */
export function shallowDiff(
    before: unknown,
    after: unknown,
    prefix: string = '',
    maxDepth: number = 2
): string[] {
    const changes: string[] = [];

    // 如果两者完全相等，无变化
    if (before === after) {
        return changes;
    }

    // 如果达到最大深度或不是对象，记录变化
    if (maxDepth <= 0 || typeof before !== 'object' || typeof after !== 'object' || before === null || after === null) {
        if (prefix) {
            changes.push(prefix);
        }
        return changes;
    }

    // 处理数组
    if (Array.isArray(before) && Array.isArray(after)) {
        if (before.length !== after.length) {
            if (prefix) {
                changes.push(`${prefix}.length`);
            }
            return changes;
        }

        for (let i = 0; i < before.length; i++) {
            const nestedChanges = shallowDiff(before[i], after[i], prefix ? `${prefix}[${i}]` : `[${i}]`, maxDepth - 1);
            changes.push(...nestedChanges);
        }
        return changes;
    }

    // 处理对象
    const beforeObj = before as Record<string, unknown>;
    const afterObj = after as Record<string, unknown>;

    // 获取所有 key
    const keys = new Set([...Object.keys(beforeObj), ...Object.keys(afterObj)]);

    for (const key of keys) {
        const beforeVal = beforeObj[key];
        const afterVal = afterObj[key];
        const keyPath = prefix ? `${prefix}.${key}` : key;

        // key 不存在或值不同
        if (!(key in beforeObj) || !(key in afterObj) || beforeVal !== afterVal) {
            // 递归检查
            const nestedChanges = shallowDiff(beforeVal, afterVal, keyPath, maxDepth - 1);
            if (nestedChanges.length > 0) {
                changes.push(...nestedChanges);
            } else {
                changes.push(keyPath);
            }
        }
    }

    return changes;
}

// ============== 日志输出 ==============

function normalizeMeta(meta?: ActionMeta): ActionMeta {
    return {
        ...DEFAULT_ACTION_META,
        ...(meta || {}),
    };
}

function safeStringify(obj: unknown, maxLen: number = 500): string {
    try {
        const str = JSON.stringify(obj);
        if (str.length > maxLen) {
            return str.substring(0, maxLen) + '...';
        }
        return str;
    } catch {
        return '[unserializable]';
    }
}

/**
 * 记录 store 写入日志（dev-only）
 */
export function logStoreWrite(
    meta: ActionMeta | undefined,
    before: unknown,
    after: unknown
): void {
    if (!IS_DEV) return;
    const m = normalizeMeta(meta);
    const diff = shallowDiff(before, after);
    const diffInfo = diff.length ? diff.join(', ') : '(no shallow diff)';
    // eslint-disable-next-line no-console
    console.log(`[STORE_WRITE] action=${m.action} source=${m.source} diff=${diffInfo}`);
    if (m.debugStack) {
        // eslint-disable-next-line no-console
        console.trace('[STORE_WRITE stack]');
    }
}

/**
 * 记录 settings 写入日志（dev-only）
 */
export function logSettingsWrite(
    meta: ActionMeta | undefined,
    before: unknown,
    after: unknown
): void {
    if (!IS_DEV) return;
    const m = normalizeMeta(meta);
    const diff = shallowDiff(before, after);
    const diffInfo = diff.length ? diff.join(', ') : '(no shallow diff)';
    // eslint-disable-next-line no-console
    console.log(`[SETTINGS_WRITE] action=${m.action} source=${m.source} diff=${diffInfo}`);
    if (m.debugStack) {
        // eslint-disable-next-line no-console
        console.trace('[SETTINGS_WRITE stack]');
    }

    // 在 dev 环境下输出简要 before/after（截断）
    // eslint-disable-next-line no-console
    console.log('before:', safeStringify(before));
    // eslint-disable-next-line no-console
    console.log('after :', safeStringify(after));
}
