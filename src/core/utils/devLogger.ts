// src/core/utils/devLogger.ts
/**
 * DevLogger - 运行态诊断日志工具
 * Role: Utility
 *
 * 本次改动目标：先看到，再收敛。
 * - 不再把日志输出绑定到 NODE_ENV=development，因为 Obsidian 插件通常通过 vite build 后运行，
 *   构建态会把 NODE_ENV 固定为 production，导致运行中 devLog 全部静默。
 * - 默认在非 test 环境输出日志。
 * - 除 console 外，同时写入全局内存缓冲区，供可视化诊断面板 / Obsidian 命令 / 文件日志读取。
 */

import type { ActionMeta } from '../types/actionMeta';
import { DEFAULT_ACTION_META } from '../types/actionMeta';

type ThinkLogLevel = 'log' | 'info' | 'warn' | 'error' | 'debug' | 'trace' | 'time' | 'timeEnd';

export interface ThinkDebugLogEntry {
    timestamp: number;
    level: ThinkLogLevel;
    source: string;
    args: unknown[];
    text: string;
}

interface ThinkDebugGlobal {
    __THINK_DEBUG_ENABLED__?: boolean;
    __THINK_DEBUG_BUFFER__?: ThinkDebugLogEntry[];
    __THINK_DEBUG_SINK__?: (entry: ThinkDebugLogEntry) => void;
}

const MAX_BUFFER_SIZE = 1000;

function getDebugGlobal(): ThinkDebugGlobal {
    return globalThis as typeof globalThis & ThinkDebugGlobal;
}

function isTestEnvironment(): boolean {
    try {
        const env = (globalThis as any).process?.env?.NODE_ENV;
        return env === 'test';
    } catch {
        return false;
    }
}

function shouldLog(): boolean {
    if (isTestEnvironment()) return false;

    // 允许运行时显式关闭，但默认打开。
    try {
        const g = getDebugGlobal();
        if (g.__THINK_DEBUG_ENABLED__ === false) return false;
    } catch {
        // ignore
    }

    return true;
}

function stringifyArg(arg: unknown): string {
    if (arg instanceof Error) {
        return `${arg.name}: ${arg.message}${arg.stack ? `\n${arg.stack}` : ''}`;
    }
    if (typeof arg === 'string') return arg;
    if (typeof arg === 'number' || typeof arg === 'boolean' || arg == null) return String(arg);

    try {
        return JSON.stringify(arg, (_key, value) => {
            if (value instanceof Error) {
                return {
                    name: value.name,
                    message: value.message,
                    stack: value.stack,
                };
            }
            return value;
        }, 2);
    } catch {
        try {
            return String(arg);
        } catch {
            return '[unserializable]';
        }
    }
}

function makeEntry(level: ThinkLogLevel, source: string, args: unknown[]): ThinkDebugLogEntry {
    return {
        timestamp: Date.now(),
        level,
        source,
        args,
        text: args.map(stringifyArg).join(' '),
    };
}

function pushEntry(entry: ThinkDebugLogEntry): void {
    try {
        const g = getDebugGlobal();
        const buffer = g.__THINK_DEBUG_BUFFER__ || [];
        buffer.push(entry);
        if (buffer.length > MAX_BUFFER_SIZE) {
            buffer.splice(0, buffer.length - MAX_BUFFER_SIZE);
        }
        g.__THINK_DEBUG_BUFFER__ = buffer;
        g.__THINK_DEBUG_SINK__?.(entry);
    } catch {
        // 诊断日志不能影响业务逻辑。
    }
}

function emit(level: ThinkLogLevel, args: unknown[], source: string = 'devLogger'): void {
    if (!shouldLog()) return;

    const entry = makeEntry(level, source, args);
    pushEntry(entry);

    try {
        const consoleMethod = console[level as keyof Console];
        if (typeof consoleMethod === 'function') {
            (consoleMethod as (...values: unknown[]) => void).apply(console, args);
            return;
        }
        console.log(...args);
    } catch {
        // ignore console failures
    }
}

// ============== 通用日志 ==============

export function devLog(...args: unknown[]): void {
    emit('log', args);
}

export function devWarn(...args: unknown[]): void {
    emit('warn', args);
}

export function devError(...args: unknown[]): void {
    emit('error', args);
}

export function devTime(label: string): void {
    if (!shouldLog()) return;
    pushEntry(makeEntry('time', 'devLogger', [`[time] ${label}`]));
    try {
        console.time(label);
    } catch {
        // ignore
    }
}

export function devTimeEnd(label: string): void {
    if (!shouldLog()) return;
    pushEntry(makeEntry('timeEnd', 'devLogger', [`[timeEnd] ${label}`]));
    try {
        console.timeEnd(label);
    } catch {
        // ignore
    }
}

// ============== Diff 工具 ==============

export function shallowDiff(
    before: unknown,
    after: unknown,
    prefix: string = '',
    maxDepth: number = 2
): string[] {
    const changes: string[] = [];

    if (before === after) {
        return changes;
    }

    if (maxDepth <= 0 || typeof before !== 'object' || typeof after !== 'object' || before === null || after === null) {
        if (prefix) {
            changes.push(prefix);
        }
        return changes;
    }

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

    const beforeObj = before as Record<string, unknown>;
    const afterObj = after as Record<string, unknown>;
    const keys = new Set([...Object.keys(beforeObj), ...Object.keys(afterObj)]);

    for (const key of keys) {
        const beforeVal = beforeObj[key];
        const afterVal = afterObj[key];
        const keyPath = prefix ? `${prefix}.${key}` : key;

        if (!(key in beforeObj) || !(key in afterObj) || beforeVal !== afterVal) {
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

export function logStoreWrite(
    meta: ActionMeta | undefined,
    before: unknown,
    after: unknown
): void {
    if (!shouldLog()) return;
    const m = normalizeMeta(meta);
    const diff = shallowDiff(before, after);
    const diffInfo = diff.length ? diff.join(', ') : '(no shallow diff)';
    emit('log', [`[STORE_WRITE] action=${m.action} source=${m.source} diff=${diffInfo}`], 'store');
    if (m.debugStack) {
        emit('trace', ['[STORE_WRITE stack]'], 'store');
    }
}

export function logSettingsWrite(
    meta: ActionMeta | undefined,
    before: unknown,
    after: unknown
): void {
    if (!shouldLog()) return;
    const m = normalizeMeta(meta);
    const diff = shallowDiff(before, after);
    const diffInfo = diff.length ? diff.join(', ') : '(no shallow diff)';
    emit('log', [`[SETTINGS_WRITE] action=${m.action} source=${m.source} diff=${diffInfo}`], 'settings');
    if (m.debugStack) {
        emit('trace', ['[SETTINGS_WRITE stack]'], 'settings');
    }
    emit('log', ['before:', safeStringify(before)], 'settings');
    emit('log', ['after :', safeStringify(after)], 'settings');
}
