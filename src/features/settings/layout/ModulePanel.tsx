// src/features/dashboard/ui/ModulePanel.tsx
/** @jsxImportSource preact */
import { h } from 'preact';
import {
  DeleteOutlineIcon,
  DragIndicatorIcon,
  IosShareIcon,
  SettingsIcon,
  ThinkIconButton,
} from '@shared/ui/public';

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
    /** 自由布局编辑态下，仅该手柄负责启动整块视图拖动。 */
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

    return (
        <section class="think-module">
            <header
                class={`module-header${layoutEditing ? ' is-layout-editing' : ''}${layoutSelected ? ' is-layout-selected' : ''}`}
                onClick={onHeaderClick as any}
                title={layoutEditing
                    ? '点击选中；拖动左侧手柄移动；点击标题区域折叠或展开'
                    : '点击折叠/展开；Ctrl/⌘ + 点击：全部折叠/展开'}
            >
                <div class="module-header-main">
                    {layoutEditing && (
                        <span
                            class={`module-drag-handle${layoutLocked ? ' is-disabled' : ''}`}
                            {...(dragHandleProps as any)}
                            onClick={(event: MouseEvent) => event.stopPropagation()}
                            title={layoutLocked ? '卡片已锁定，先解锁后才能拖动' : '拖动整个视图'}
                        >
                            <DragIndicatorIcon className="module-header-icon" fontSize="inherit" />
                        </span>
                    )}
                    <span class="module-title">{title}</span>
                    {layoutLocked && <span class="module-layout-lock-badge" title="布局位置已锁定">已锁定</span>}
                </div>
                <div class="module-header-controls">
                    {layoutEditing && layoutSelected && (
                        <div class="module-layout-actions" aria-label="自由布局操作">
                            {onLayoutBringToFront && (
                                <button type="button" title="置于最上层" onClick={(e) => { e.stopPropagation(); onLayoutBringToFront(); }}>置顶</button>
                            )}
                            {onLayoutToggleLock && (
                                <button type="button" title={layoutLocked ? '解锁位置和尺寸' : '锁定位置和尺寸'} onClick={(e) => { e.stopPropagation(); onLayoutToggleLock(); }}>
                                    {layoutLocked ? '解锁' : '锁定'}
                                </button>
                            )}
                            {onLayoutToggleCollapsed && (
                                <button type="button" title={collapsed ? '展开卡片' : '折叠卡片'} onClick={(e) => { e.stopPropagation(); onLayoutToggleCollapsed(); }}>
                                    {collapsed ? '展开' : '折叠'}
                                </button>
                            )}
                        </div>
                    )}
                    <div class="module-header-actions">
                        {onRemove && (
                            <ThinkIconButton
                                size="sm"
                                tone="danger"
                                label={removeFromLayout ? '从当前布局移除视图，保留视图配置' : '删除视图（从配置与所有布局中移除）'}
                                icon={<DeleteOutlineIcon className="module-header-icon" fontSize="inherit" />}
                                onClick={(event) => { event.stopPropagation(); onRemove(); }}
                            />
                        )}
                        {onSettingsClick && (
                            <ThinkIconButton
                                size="sm"
                                label="模块设置"
                                icon={<SettingsIcon className="module-header-icon" fontSize="inherit" />}
                                onClick={(event) => { event.stopPropagation(); onSettingsClick(); }}
                            />
                        )}
                        {onExport && (
                            <ThinkIconButton
                                size="sm"
                                label="导出为 Markdown"
                                icon={<IosShareIcon className="module-header-icon" fontSize="inherit" />}
                                onClick={(event) => { event.stopPropagation(); onExport(); }}
                            />
                        )}
                        {onActionClick ? (
                            <button
                                type="button"
                                class="module-action-plus"
                                title="创建记录"
                                aria-label="创建记录"
                                onClick={(event) => { event.stopPropagation(); onActionClick(); }}
                            >+</button>
                        ) : null}
                    </div>
                    <span class="module-toggle" aria-hidden="true">{collapsed ? '▶' : '▼'}</span>
                </div>
            </header>
            {!collapsed && <div class="module-content">{children}</div>}
        </section>
    );
}
