// src/shared/utils/devLogger.ts
/**
 * DevLogger - 开发环境日志工具
 * Role: Utility
 * 
 * 【S1 低成本可观测性】
 * - 仅在 development 环境下输出日志
 * - production 环境完全不输出，不影响性能
 * - 提供清晰的日志格式：actionName + source + diff
 * 
 * Do:
 * - 在 dev 环境输出可读的日志
 * - 支持 diff 输出（至少 key path）
 * - 支持可选的调用栈输出
 * 
 * Don't:
 * - 在 production 环境输出任何日志
 * - 引入重型依赖
 */

import type { ActionMeta } from '@/shared/types/ActionMeta';
import { DEFAULT_ACTION_META } from '@/shared/types/ActionMeta';

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
            changes.push(`${prefix}[length: ${before.length} → ${after.length}]`);
        }
        // 对于数组，只比较长度和 ids（如果有）
        const beforeIds = before.map((item: any) => item?.id).filter(Boolean);
        const afterIds = after.map((item: any) => item?.id).filter(Boolean);
        if (JSON.stringify(beforeIds) !== JSON.stringify(afterIds)) {
            changes.push(`${prefix}[ids changed]`);
        }
        return changes;
    }

    // 处理普通对象
    const beforeObj = before as Record<string, unknown>;
    const afterObj = after as Record<string, unknown>;
    const allKeys = new Set([...Object.keys(beforeObj), ...Object.keys(afterObj)]);

    for (const key of allKeys) {
        const path = prefix ? `${prefix}.${key}` : key;
        
        if (!(key in beforeObj)) {
            changes.push(`${path} [added]`);
        } else if (!(key in afterObj)) {
            changes.push(`${path} [removed]`);
        } else if (beforeObj[key] !== afterObj[key]) {
            // 递归比较
            const subChanges = shallowDiff(beforeObj[key], afterObj[key], path, maxDepth - 1);
            if (subChanges.length > 0) {
                changes.push(...subChanges);
            } else {
                changes.push(path);
            }
        }
    }

    return changes;
}

/**
 * 格式化 diff 输出
 */
function formatDiff(changes: string[]): string {
    if (changes.length === 0) {
        return '[no changes detected]';
    }
    if (changes.length <= 5) {
        return changes.join(', ');
    }
    return `${changes.slice(0, 5).join(', ')} ... and ${changes.length - 5} more`;
}

// ============== 日志节流 ==============

interface LogEntry {
    action: string;
    source: string;
    changes: string[];
    timestamp: number;
}

let pendingLogs: LogEntry[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;
const THROTTLE_MS = 100; // 100ms 内合并日志

function flushLogs(): void {
    if (pendingLogs.length === 0) return;

    // 合并相同 action 的日志
    const merged = new Map<string, LogEntry>();
    for (const log of pendingLogs) {
        const key = `${log.action}:${log.source}`;
        const existing = merged.get(key);
        if (existing) {
            // 合并 changes
            existing.changes = [...new Set([...existing.changes, ...log.changes])];
        } else {
            merged.set(key, { ...log, changes: [...log.changes] });
        }
    }

    // 输出日志
    for (const log of merged.values()) {
        const changesStr = formatDiff(log.changes);
        console.groupCollapsed(
            `%c[STORE_WRITE]%c action=%c${log.action}%c source=${log.source}`,
            'color: #2196F3; font-weight: bold',
            'color: inherit',
            'color: #4CAF50; font-weight: bold',
            'color: inherit'
        );
        console.log('changed:', changesStr);
        console.groupEnd();
    }

    pendingLogs = [];
    flushTimer = null;
}

// ============== 公共 API ==============

/**
 * 记录 Store 写入日志（仅 dev 环境）
 * 
 * @param meta 动作元数据
 * @param before 变更前状态
 * @param after 变更后状态
 * @param stateKey 可选的状态 key（用于限定 diff 范围）
 */
export function logStoreWrite<T>(
    meta: ActionMeta | undefined,
    before: T,
    after: T,
    stateKey?: string
): void {
    if (!IS_DEV) return;

    const effectiveMeta = meta || DEFAULT_ACTION_META;
    const changes = shallowDiff(before, after, stateKey || '');

    // 如果无变化，不输出
    if (changes.length === 0) return;

    // 添加到待输出队列
    pendingLogs.push({
        action: effectiveMeta.action,
        source: effectiveMeta.source,
        changes,
        timestamp: Date.now(),
    });

    // 输出调用栈（如果需要）
    if (effectiveMeta.debugStack) {
        console.trace(`[STORE_WRITE] Stack trace for: ${effectiveMeta.action}`);
    }

    // 设置节流定时器
    if (!flushTimer) {
        flushTimer = setTimeout(flushLogs, THROTTLE_MS);
    }
}

/**
 * 记录 Settings 写入日志（仅 dev 环境）
 * 
 * @param meta 动作元数据
 * @param before 变更前 settings
 * @param after 变更后 settings
 */
export function logSettingsWrite<T>(
    meta: ActionMeta | undefined,
    before: T,
    after: T
): void {
    if (!IS_DEV) return;

    const effectiveMeta = meta || DEFAULT_ACTION_META;
    const changes = shallowDiff(before, after, 'settings');

    // 如果无变化，不输出
    if (changes.length === 0) return;

    const changesStr = formatDiff(changes);
    
    console.groupCollapsed(
        `%c[SETTINGS_WRITE]%c action=%c${effectiveMeta.action}%c source=${effectiveMeta.source}`,
        'color: #FF9800; font-weight: bold',
        'color: inherit',
        'color: #4CAF50; font-weight: bold',
        'color: inherit'
    );
    console.log('changed:', changesStr);
    
    // 输出调用栈（如果需要）
    if (effectiveMeta.debugStack) {
        console.trace('Stack trace:');
    }
    
    console.groupEnd();
}

/**
 * 立即刷新所有待输出的日志
 * 用于调试或测试
 */
export function flushDevLogs(): void {
    if (!IS_DEV) return;
    if (flushTimer) {
        clearTimeout(flushTimer);
    }
    flushLogs();
}

/**
 * 开发环境条件日志
 */
export function devLog(message: string, ...args: unknown[]): void {
    if (!IS_DEV) return;
    console.log(`[DEV] ${message}`, ...args);
}

/**
 * 开发环境警告日志
 */
export function devWarn(message: string, ...args: unknown[]): void {
    if (!IS_DEV) return;
    console.warn(`[DEV] ${message}`, ...args);
}
