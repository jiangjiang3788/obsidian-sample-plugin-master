// src/features/dashboard/ui/ModulePanel.tsx
/** @jsxImportSource preact */
import { h } from 'preact';
// [移除] 不再需要 hooks 和常量
// import { useState, useRef, useEffect } from 'preact/hooks';
// import { EVENT_NAMES } from '@core/domain/constants';

interface ModulePanelProps {
    title: string;
    collapsed?: boolean;
    children: any;
    onActionClick?: () => void;
    // [修改] onToggle 现在会接收鼠标事件，以便父组件判断 Ctrl/Cmd 键是否按下
    onToggle?: (e: MouseEvent) => void;
}

export function ModulePanel({ title, collapsed, children, onActionClick, onToggle }: ModulePanelProps) {
    // [移除] 所有内部状态和事件监听器都被移除

    const onHeaderClick = (e: MouseEvent) => {
        // 如果点击的是操作按钮区域，则不触发折叠/展开
        if ((e.target as HTMLElement).closest('.module-header-actions')) {
            return;
        }
        // 调用从父组件传入的 onToggle 函数，并将事件对象传递过去
        onToggle?.(e);
    };

    return (
        <div class="think-module">
            <div class="module-header" onClick={onHeaderClick as any} title="点击折叠/展开；Ctrl/⌘ + 点击：全部折叠/展开">
                <span class="module-title">{title}</span>
                <div class="module-header-controls">
                    <div class="module-header-actions">
                        <span 
                            class="module-action-plus" 
                            title="快捷输入"
                            onClick={(e) => {
                                e.stopPropagation(); // 阻止事件冒泡到 header 的 onClick
                                onActionClick?.();
                            }}
                        >
                            +
                        </span>
                    </div>
                    {/* [修改] 显示的图标现在直接由 collapsed 属性决定 */}
                    <div class="module-toggle">{collapsed ? '▶' : '▼'}</div>
                </div>
            </div>
            {/* [修改] 子内容的显示也直接由 collapsed 属性决定 */}
            {!collapsed && <div class="module-content">{children}</div>}
        </div>
    );
}