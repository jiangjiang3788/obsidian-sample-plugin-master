// src/core/utils/runtimeDiagnostics.ts
/**
 * RuntimeDiagnostics - always-on visible diagnostics for Obsidian runtime.
 *
 * Purpose:
 * - Console filters in Obsidian/Electron can hide useful messages.
 * - Some startup failures are swallowed by safeAsync / Notice-only flows.
 * - This module mirrors diagnostic messages to a small in-app panel, console,
 *   and window.__THINK_OS_DEBUG__ so we can inspect the runtime without relying
 *   on DevTools filtering or NODE_ENV.
 *
 * This file intentionally has no Obsidian dependency.
 */

type Level = 'log' | 'warn' | 'error';

interface DiagnosticEntry {
    time: string;
    level: Level;
    message: string;
    details?: string;
}

const MAX_ENTRIES = 300;
const BUFFER: DiagnosticEntry[] = [];
const PANEL_ID = 'think-os-runtime-diagnostics-panel';
const BODY_ID = 'think-os-runtime-diagnostics-body';

function isTestEnv(): boolean {
    try {
        const env = (globalThis as any).process?.env?.NODE_ENV;
        return env === 'test';
    } catch {
        return false;
    }
}

function safeStringify(value: unknown): string {
    if (value instanceof Error) {
        return `${value.name}: ${value.message}\n${value.stack || ''}`.trim();
    }
    if (typeof value === 'string') return value;
    try {
        return JSON.stringify(value, getCircularReplacer(), 2);
    } catch {
        try {
            return String(value);
        } catch {
            return '[unprintable]';
        }
    }
}

function getCircularReplacer(): (_key: string, value: unknown) => unknown {
    const seen = new WeakSet<object>();
    return (_key: string, value: unknown): unknown => {
        if (typeof value === 'object' && value !== null) {
            if (seen.has(value)) return '[Circular]';
            seen.add(value);
        }
        return value;
    };
}

function formatArgs(args: unknown[]): { message: string; details?: string } {
    const parts = args.map((arg) => safeStringify(arg));
    const message = parts[0] || '';
    const details = parts.length > 1 ? parts.slice(1).join('\n') : undefined;
    return { message, details };
}

function exposeGlobalApi(): void {
    try {
        const g = globalThis as any;
        g.__THINK_OS_DEBUG__ = {
            entries: BUFFER,
            dump: () => BUFFER.map(formatEntry).join('\n'),
            clear: () => {
                BUFFER.length = 0;
                renderPanel();
            },
            show: () => installRuntimeDiagnosticsPanel(true),
            hide: () => setPanelVisible(false),
        };
    } catch {
        // no-op
    }
}

function createPanel(): HTMLElement | null {
    if (typeof document === 'undefined') return null;
    const existing = document.getElementById(PANEL_ID);
    if (existing) return existing;

    const panel = document.createElement('div');
    panel.id = PANEL_ID;
    panel.style.position = 'fixed';
    panel.style.right = '12px';
    panel.style.bottom = '12px';
    panel.style.zIndex = '2147483647';
    panel.style.width = '560px';
    panel.style.maxWidth = 'calc(100vw - 24px)';
    panel.style.maxHeight = '42vh';
    panel.style.background = 'rgba(20, 20, 24, 0.96)';
    panel.style.color = '#f5f5f5';
    panel.style.border = '1px solid rgba(255,255,255,0.25)';
    panel.style.borderRadius = '8px';
    panel.style.fontFamily = 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';
    panel.style.fontSize = '12px';
    panel.style.boxShadow = '0 8px 32px rgba(0,0,0,0.45)';
    panel.style.overflow = 'hidden';

    const header = document.createElement('div');
    header.style.display = 'flex';
    header.style.alignItems = 'center';
    header.style.justifyContent = 'space-between';
    header.style.gap = '8px';
    header.style.padding = '6px 8px';
    header.style.background = 'rgba(255,255,255,0.10)';
    header.style.cursor = 'default';

    const title = document.createElement('div');
    title.textContent = 'Think OS Runtime Diagnostics';
    title.style.fontWeight = '700';

    const buttons = document.createElement('div');
    buttons.style.display = 'flex';
    buttons.style.gap = '6px';

    const copy = document.createElement('button');
    copy.textContent = 'copy';
    copy.onclick = async () => {
        const text = BUFFER.map(formatEntry).join('\n');
        try {
            await navigator.clipboard?.writeText(text);
            pushEntry('log', ['[Diagnostics] copied log to clipboard'], false);
        } catch {
            pushEntry('warn', ['[Diagnostics] clipboard copy failed; use window.__THINK_OS_DEBUG__.dump()'], false);
        }
    };

    const clear = document.createElement('button');
    clear.textContent = 'clear';
    clear.onclick = () => {
        BUFFER.length = 0;
        renderPanel();
    };

    const hide = document.createElement('button');
    hide.textContent = 'hide';
    hide.onclick = () => setPanelVisible(false);

    for (const btn of [copy, clear, hide]) {
        btn.style.fontSize = '11px';
        btn.style.padding = '2px 6px';
    }

    buttons.append(copy, clear, hide);
    header.append(title, buttons);

    const body = document.createElement('pre');
    body.id = BODY_ID;
    body.style.margin = '0';
    body.style.padding = '8px';
    body.style.overflow = 'auto';
    body.style.maxHeight = 'calc(42vh - 34px)';
    body.style.whiteSpace = 'pre-wrap';
    body.style.wordBreak = 'break-word';

    panel.append(header, body);
    document.body.appendChild(panel);
    return panel;
}

function setPanelVisible(visible: boolean): void {
    const panel = createPanel();
    if (panel) panel.style.display = visible ? 'block' : 'none';
}

function renderPanel(): void {
    if (isTestEnv() || typeof document === 'undefined') return;
    const panel = createPanel();
    if (!panel) return;
    const body = panel.querySelector(`#${BODY_ID}`) as HTMLElement | null;
    if (!body) return;
    body.textContent = BUFFER.map(formatEntry).join('\n');
    body.scrollTop = body.scrollHeight;
}

function formatEntry(entry: DiagnosticEntry): string {
    const head = `${entry.time} ${entry.level.toUpperCase()} ${entry.message}`;
    return entry.details ? `${head}\n${entry.details}` : head;
}

function pushEntry(level: Level, args: unknown[], mirrorConsole = true): void {
    if (isTestEnv()) return;
    const { message, details } = formatArgs(args);
    BUFFER.push({
        time: new Date().toLocaleTimeString(),
        level,
        message,
        details,
    });
    if (BUFFER.length > MAX_ENTRIES) BUFFER.splice(0, BUFFER.length - MAX_ENTRIES);

    exposeGlobalApi();
    renderPanel();

    if (mirrorConsole) {
        try {
            const prefix = '[ThinkOS][RUNTIME]';
            if (level === 'error') console.error(prefix, ...args);
            else if (level === 'warn') console.warn(prefix, ...args);
            else console.log(prefix, ...args);
        } catch {
            // no-op
        }
    }
}

export function installRuntimeDiagnosticsPanel(forceVisible = true): void {
    if (isTestEnv()) return;
    exposeGlobalApi();

    if (typeof document === 'undefined') return;
    const install = () => {
        createPanel();
        if (forceVisible) setPanelVisible(true);
        renderPanel();
    };

    if (document.body) install();
    else document.addEventListener('DOMContentLoaded', install, { once: true });
}

export function runtimeLog(...args: unknown[]): void {
    installRuntimeDiagnosticsPanel(true);
    pushEntry('log', args);
}

export function runtimeWarn(...args: unknown[]): void {
    installRuntimeDiagnosticsPanel(true);
    pushEntry('warn', args);
}

export function runtimeError(...args: unknown[]): void {
    installRuntimeDiagnosticsPanel(true);
    pushEntry('error', args);
}

export function installGlobalRuntimeErrorHooks(): void {
    if (isTestEnv()) return;
    const g = globalThis as any;
    if (g.__THINK_OS_RUNTIME_ERROR_HOOKS_INSTALLED__) return;
    g.__THINK_OS_RUNTIME_ERROR_HOOKS_INSTALLED__ = true;

    try {
        globalThis.addEventListener?.('error', (event: ErrorEvent) => {
            runtimeError('[GLOBAL_ERROR]', event.message, event.error || {
                filename: event.filename,
                lineno: event.lineno,
                colno: event.colno,
            });
        });
        globalThis.addEventListener?.('unhandledrejection', (event: PromiseRejectionEvent) => {
            runtimeError('[UNHANDLED_REJECTION]', event.reason);
        });
        runtimeLog('[Diagnostics] global runtime error hooks installed');
    } catch (e) {
        runtimeError('[Diagnostics] failed to install global hooks', e);
    }
}
