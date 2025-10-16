// src/features/dashboard/ui/ModulePanel.tsx
/** @jsxImportSource preact */
import { h } from 'preact';
// [新增] 导入 IconButton, Tooltip 和图标
import { IconButton, Tooltip } from '@mui/material';
import IosShareIcon from '@mui/icons-material/IosShare';
import SettingsIcon from '@mui/icons-material/Settings';

// 解决 Preact 和 Material-UI 的类型兼容性问题
const AnyIconButton = IconButton as any;


interface ModulePanelProps {
    title: string;
    collapsed?: boolean;
    children: any;
    onActionClick?: () => void;
    onToggle?: (e: MouseEvent) => void;
    onExport?: () => void; // [新增] 导出按钮的回调函数
    onSettingsClick?: () => void; // [新增] 设置按钮的回调函数
}

export function ModulePanel({ title, collapsed, children, onActionClick, onToggle, onExport, onSettingsClick }: ModulePanelProps) {
    const onHeaderClick = (e: MouseEvent) => {
        if ((e.target as HTMLElement).closest('.module-header-actions')) {
            return;
        }
        onToggle?.(e);
    };

    return (
        <div class="think-module">
            <div class="module-header" onClick={onHeaderClick as any} title="点击折叠/展开；Ctrl/⌘ + 点击：全部折叠/展开">
                <span class="module-title">{title}</span>
                <div class="module-header-controls">
                    <div class="module-header-actions">
                        {/* [新增] 设置按钮 */}
                        {onSettingsClick && (
                            <Tooltip title="模块设置">
                                <AnyIconButton
                                    size="small"
                                    onClick={(e: any) => {
                                        e.stopPropagation();
                                        onSettingsClick();
                                    }}
                                    sx={{ padding: '4px' }}
                                >
                                    <SettingsIcon sx={{ fontSize: '1rem' }} />
                                </AnyIconButton>
                            </Tooltip>
                        )}
                        {/* [新增] 导出按钮 */}
                        {onExport && (
                            <Tooltip title="导出为 Markdown">
                                <AnyIconButton
                                    size="small"
                                    onClick={(e: any) => {
                                        e.stopPropagation();
                                        onExport();
                                    }}
                                    sx={{ padding: '4px' }}
                                >
                                    <IosShareIcon sx={{ fontSize: '1rem' }} />
                                </AnyIconButton>
                            </Tooltip>
                        )}
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
                    <div class="module-toggle">{collapsed ? '▶' : '▼'}</div>
                </div>
            </div>
            {!collapsed && <div class="module-content">{children}</div>}
        </div>
    );
}
