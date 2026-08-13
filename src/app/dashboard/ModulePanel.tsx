// src/app/dashboard/ModulePanel.tsx
/** @jsxImportSource preact */
import { h } from 'preact';
import { ThinkIcon, ThinkIconButton } from '@shared/ui/public';

export interface ModulePanelProps {
    title: string;
    collapsed?: boolean;
    children: any;
    onActionClick?: () => void;
    onToggle?: (e: MouseEvent) => void;
    onExport?: () => void;
    onSettingsClick?: () => void;
    onRemove?: () => void;
    removeFromLayout?: boolean;
    /** Freeform edit mode: this handle alone starts whole-view dragging. */
    dragHandleProps?: Record<string, unknown>;
    layoutEditing?: boolean;
    layoutSelected?: boolean;
    layoutLocked?: boolean;
    onLayoutBringToFront?: () => void;
    onLayoutToggleLock?: () => void;
    onLayoutToggleCollapsed?: () => void;
}

export function ModulePanel({
    title,
    collapsed,
    children,
    onActionClick,
    onToggle,
    onExport,
    onSettingsClick,
    onRemove,
    removeFromLayout = false,
    dragHandleProps,
    layoutEditing = false,
    layoutSelected = false,
    layoutLocked = false,
    onLayoutBringToFront,
    onLayoutToggleLock,
    onLayoutToggleCollapsed,
}: ModulePanelProps) {
    const onHeaderClick = (e: MouseEvent) => {
        if ((e.target as HTMLElement).closest('.module-header-actions, .module-drag-handle, .module-layout-actions')) return;
        onToggle?.(e);
    };

    const moduleClassName = [
        'think-module',
        collapsed ? 'is-collapsed' : '',
        layoutEditing ? 'is-layout-editing' : '',
        layoutSelected ? 'is-layout-selected' : '',
    ].filter(Boolean).join(' ');

    return (
        <section class={moduleClassName} aria-label={`${title} 视图`}>
            <header
                class={`module-header${layoutEditing ? ' is-layout-editing' : ''}${layoutSelected ? ' is-layout-selected' : ''}`}
                onClick={onHeaderClick as any}
                title={layoutEditing
                    ? '点击选中；拖动左侧手柄移动；点击标题区域折叠或展开'
                    : '点击标题区域折叠/展开；Ctrl/⌘ + 点击：全部折叠/展开'}
            >
                <div class="module-header-main">
                    {layoutEditing && (
                        <span
                            class={`module-drag-handle${layoutLocked ? ' is-disabled' : ''}`}
                            {...(dragHandleProps as any)}
                            onClick={(event: MouseEvent) => event.stopPropagation()}
                            title={layoutLocked ? '视图已锁定，先解锁后才能拖动' : '拖动整个视图'}
                        >
                            <ThinkIcon name="grip-vertical" className="module-header-icon" />
                        </span>
                    )}
                    <span class="module-title">{title}</span>
                    {layoutLocked && <span class="module-layout-lock-badge" title="布局位置已锁定">已锁定</span>}
                </div>
                <div class="module-header-controls">
                    {layoutEditing && layoutSelected && (
                        <div class="module-layout-actions" aria-label="自由布局操作">
                            {onLayoutBringToFront && (
                                <ThinkIconButton
                                    size="sm"
                                    label="置于最上层"
                                    icon={<ThinkIcon name="arrow-up" />}
                                    onClick={(event) => { event.stopPropagation(); onLayoutBringToFront(); }}
                                />
                            )}
                            {onLayoutToggleLock && (
                                <ThinkIconButton
                                    size="sm"
                                    pressed={layoutLocked}
                                    label={layoutLocked ? '解锁位置和尺寸' : '锁定位置和尺寸'}
                                    icon={<ThinkIcon name={layoutLocked ? 'unlock' : 'lock'} />}
                                    onClick={(event) => { event.stopPropagation(); onLayoutToggleLock(); }}
                                />
                            )}
                            {onLayoutToggleCollapsed && (
                                <ThinkIconButton
                                    size="sm"
                                    label={collapsed ? '展开视图' : '折叠视图'}
                                    icon={<ThinkIcon name={collapsed ? 'chevron-right' : 'chevron-down'} />}
                                    onClick={(event) => { event.stopPropagation(); onLayoutToggleCollapsed(); }}
                                />
                            )}
                        </div>
                    )}
                    <div class="module-header-actions">
                        {onRemove && (
                            <ThinkIconButton
                                size="sm"
                                tone="danger"
                                label={removeFromLayout ? '从当前布局移除视图，保留视图配置' : '删除视图（从配置与所有布局中移除）'}
                                icon={<ThinkIcon name="trash-2" className="module-header-icon" />}
                                onClick={(event) => { event.stopPropagation(); onRemove(); }}
                            />
                        )}
                        {onSettingsClick && (
                            <ThinkIconButton
                                size="sm"
                                label="模块设置"
                                icon={<ThinkIcon name="settings" className="module-header-icon" />}
                                onClick={(event) => { event.stopPropagation(); onSettingsClick(); }}
                            />
                        )}
                        {onExport && (
                            <ThinkIconButton
                                size="sm"
                                label="导出为 Markdown"
                                icon={<ThinkIcon name="upload" className="module-header-icon" />}
                                onClick={(event) => { event.stopPropagation(); onExport(); }}
                            />
                        )}
                        {onActionClick && (
                            <ThinkIconButton
                                size="sm"
                                label="创建记录"
                                icon={<ThinkIcon name="plus" className="module-header-icon" />}
                                onClick={(event) => { event.stopPropagation(); onActionClick(); }}
                            />
                        )}
                        <ThinkIconButton
                            size="sm"
                            label={collapsed ? '展开视图' : '折叠视图'}
                            aria-expanded={!collapsed}
                            icon={<ThinkIcon name={collapsed ? 'chevron-right' : 'chevron-down'} className="module-header-icon" />}
                            onClick={(event) => { event.stopPropagation(); onToggle?.(event as any); }}
                        />
                    </div>
                </div>
            </header>
            {!collapsed && <div class="module-content">{children}</div>}
        </section>
    );
}
