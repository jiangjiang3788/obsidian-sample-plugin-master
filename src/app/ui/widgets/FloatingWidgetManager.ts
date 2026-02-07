import type { ComponentChildren } from 'preact';
import FloatingWidget from './FloatingWidget';

/**
 * FloatingWidgetManager
 *
 * 目的：
 * - 收敛“悬浮窗打开/关闭/去重”的逻辑，避免各处手写 DOM remove/unload。
 * - 给悬浮窗一个统一的生命周期：open -> (close) -> unload。
 *
 * 约定：
 * - 同一个 id 只允许存在一个实例；重复 open 会先 close 再重新创建。
 */

const registry = new Map<string, FloatingWidget>();

/**
 * 打开（或重开）一个悬浮窗
 */
export function openFloatingWidget(id: string, renderFn: () => ComponentChildren): FloatingWidget {
    // 先关闭旧实例，避免重复挂载、残留 event listeners
    closeFloatingWidget(id);

    const widget = new FloatingWidget(id, renderFn);
    registry.set(id, widget);
    widget.load();
    return widget;
}

/**
 * 关闭一个悬浮窗（如果存在）
 */
export function closeFloatingWidget(id: string): void {
    const existing = registry.get(id);
    if (!existing) return;
    try {
        existing.unload();
    } finally {
        registry.delete(id);
    }
}

/**
 * 是否已打开
 */
export function isFloatingWidgetOpen(id: string): boolean {
    return registry.has(id);
}

/**
 * 关闭所有悬浮窗（插件卸载时可用）
 */
export function closeAllFloatingWidgets(): void {
    for (const id of Array.from(registry.keys())) {
        closeFloatingWidget(id);
    }
}
