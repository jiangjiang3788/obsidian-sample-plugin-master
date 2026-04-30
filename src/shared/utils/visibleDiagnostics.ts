// src/shared/utils/visibleDiagnostics.ts
/**
 * Think runtime diagnostics
 *
 * 只保留“可验证、可复制、可落盘”的诊断能力，不再创建悬浮面板。
 *
 * 背景：这轮排查已经确认 devLogger 本身会输出，之前看不到主要是 DevTools
 * 过滤/上下文导致。为了不影响日常使用，这里移除页面浮层，但保留：
 * - console 镜像增强
 * - 全局错误 / Promise rejection 捕获
 * - .think-plugin-debug.log 文件落盘
 * - 命令复制内存日志
 */

import { Notice, Plugin } from 'obsidian';

export type ThinkLogLevel = 'log' | 'info' | 'warn' | 'error' | 'debug' | 'trace' | 'time' | 'timeEnd';

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
    __THINK_DIAGNOSTICS_INSTALLED__?: boolean;
}

const LOG_FILE = '.think-plugin-debug.log';

let pluginRef: Plugin | null = null;
let fileFlushTimer: number | null = null;
let fileWriteChain: Promise<void> = Promise.resolve();
let lastWrittenIndex = 0;
const pendingFileLines: string[] = [];

function getGlobal(): ThinkDebugGlobal {
    return globalThis as typeof globalThis & ThinkDebugGlobal;
}

function formatTime(timestamp: number): string {
    try {
        return new Date(timestamp).toLocaleTimeString();
    } catch {
        return String(timestamp);
    }
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

function makeLine(entry: ThinkDebugLogEntry): string {
    const message = entry.text || entry.args.map(stringifyArg).join(' ');
    return `[${formatTime(entry.timestamp)}][${entry.level}][${entry.source}] ${message}`;
}

function queueFileWrite(entry: ThinkDebugLogEntry): void {
    pendingFileLines.push(makeLine(entry));
    if (fileFlushTimer != null) return;

    fileFlushTimer = window.setTimeout(() => {
        fileFlushTimer = null;
        flushFileWrites();
    }, 300);
}

function flushFileWrites(): void {
    if (!pluginRef || pendingFileLines.length === 0) return;

    const lines = pendingFileLines.splice(0, pendingFileLines.length).join('\n') + '\n';
    fileWriteChain = fileWriteChain.then(async () => {
        try {
            const adapter = pluginRef!.app.vault.adapter as any;
            let previous = '';
            try {
                if (await adapter.exists(LOG_FILE)) {
                    previous = await adapter.read(LOG_FILE);
                }
            } catch {
                previous = '';
            }
            const combined = (previous + lines).split('\n').slice(-1200).join('\n');
            await adapter.write(LOG_FILE, combined.endsWith('\n') ? combined : `${combined}\n`);
        } catch (error) {
            // 文件日志失败时不能再递归写日志，只放到原生 console。
            try {
                console.error('[Think Diagnostics] failed to write log file', error);
            } catch {
                // ignore
            }
        }
    });
}

function installConsoleMirror(): void {
    const g = getGlobal();
    if (g.__THINK_DIAGNOSTICS_INSTALLED__) return;
    g.__THINK_DIAGNOSTICS_INSTALLED__ = true;

    const original = {
        log: console.log.bind(console),
        info: console.info.bind(console),
        warn: console.warn.bind(console),
        error: console.error.bind(console),
        debug: console.debug.bind(console),
    };

    (['log', 'info', 'warn', 'error', 'debug'] as const).forEach((level) => {
        console[level] = (...args: unknown[]) => {
            try {
                queueFileWrite({
                    timestamp: Date.now(),
                    level,
                    source: 'console',
                    args,
                    text: args.map(stringifyArg).join(' '),
                });
            } catch {
                // ignore
            }
            original[level](...args);
        };
    });

    window.addEventListener('error', (event) => {
        const entry: ThinkDebugLogEntry = {
            timestamp: Date.now(),
            level: 'error',
            source: 'window.error',
            args: [event.message, event.error],
            text: `${event.message}\n${stringifyArg(event.error)}`,
        };
        queueFileWrite(entry);
        original.error('[Think Diagnostics][window.error]', event.message, event.error);
    });

    window.addEventListener('unhandledrejection', (event) => {
        const entry: ThinkDebugLogEntry = {
            timestamp: Date.now(),
            level: 'error',
            source: 'unhandledrejection',
            args: [event.reason],
            text: stringifyArg(event.reason),
        };
        queueFileWrite(entry);
        original.error('[Think Diagnostics][unhandledrejection]', event.reason);
    });
}

export function installVisibleDiagnostics(plugin: Plugin): void {
    pluginRef = plugin;
    const g = getGlobal();
    g.__THINK_DEBUG_ENABLED__ = true;

    installConsoleMirror();

    g.__THINK_DEBUG_SINK__ = (entry: ThinkDebugLogEntry) => {
        queueFileWrite(entry);
    };

    const buffer = g.__THINK_DEBUG_BUFFER__ || [];
    for (; lastWrittenIndex < buffer.length; lastWrittenIndex++) {
        queueFileWrite(buffer[lastWrittenIndex]);
    }

    queueFileWrite({
        timestamp: Date.now(),
        level: 'info',
        source: 'diagnostics',
        args: [`diagnostics installed; log file: ${LOG_FILE}`],
        text: `diagnostics installed; log file: ${LOG_FILE}`,
    });
}

export function showVisibleDiagnostics(): void {
    new Notice(`Think: 悬浮诊断面板已移除；请查看控制台或 vault 根目录 ${LOG_FILE}`, 5000);
}

export function getDebugLogText(): string {
    const buffer = getGlobal().__THINK_DEBUG_BUFFER__ || [];
    return buffer.map(makeLine).join('\n');
}
