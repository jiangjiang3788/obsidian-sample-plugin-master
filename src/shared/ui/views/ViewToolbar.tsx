/** @jsxImportSource preact */
import { h } from 'preact';
import type { ComponentChildren } from 'preact';
import { useMemo } from 'preact/hooks';
import { dayjs, formatDateForView } from '@core/public';
import { ThemeFilter } from './ThemeFilter';
import { CategoryFilter } from './CategoryFilter';
import { getObsidianEventBoundaryProps } from '../events/obsidianEventBoundary';
import type { ViewInstance } from '@core/public';
import type { ThemeDefinition } from '@core/public';

export interface ViewToolbarProps {
    // 时间相关
    currentView: string;
    currentDate: dayjs.Dayjs;
    onViewChange: (view: string) => void;
    onDateChange: (date: dayjs.Dayjs) => void;
    
    // 筛选相关
    filterSlot?: ComponentChildren;
    selectedThemes?: string[];
    selectedCategories?: string[];
    onThemeSelectionChange?: (themes: string[]) => void;
    onCategorySelectionChange?: (categories: string[]) => void;
    viewInstances: ViewInstance[];
    themes: ThemeDefinition[];
    predefinedCategories?: string[];
    
    // 配置
    hideToolbar?: boolean;

    // 布局设置入口
    onLayoutSettingsClick?: () => void;
}

export function ViewToolbar({
    currentView,
    currentDate,
    onViewChange,
    onDateChange,
    filterSlot,
    selectedThemes = [],
    selectedCategories = [],
    onThemeSelectionChange,
    onCategorySelectionChange,
    viewInstances,
    themes,
    predefinedCategories,
    hideToolbar = false,
    onLayoutSettingsClick
}: ViewToolbarProps) {
    // 时间单位映射
    const unit = useMemo(() => (v: string) => ({ 
        '年': 'year', 
        '季': 'quarter', 
        '月': 'month', 
        '周': 'week', 
        '天': 'day' 
    }[v] || 'day') as dayjs.ManipulateType, []);

    // 视图选项
    const viewOptions = ['年', '季', '月', '周', '天'];

    if (hideToolbar) {
        return null;
    }

    return (
        <div class="tp-toolbar" {...getObsidianEventBoundaryProps()}>
            {/* 视图切换按钮 */}
            {viewOptions.map(v => (
                <button 
                    key={v}
                    onClick={() => onViewChange(v)} 
                    class={v === currentView ? 'active' : ''}
                >
                    {v}
                </button>
            ))}
            
            {/* 当前日期显示 */}
            <span
                class="tp-toolbar-date-display"
                role="status"
                aria-live="polite"
                title="当前时间范围"
            >
                {formatDateForView(currentDate, currentView)}
            </span>
            
            {/* 日期导航按钮 */}
            <button 
                onClick={() => onDateChange(currentDate.clone().subtract(1, unit(currentView)))}
            >
                ←
            </button>
            <button 
                onClick={() => onDateChange(currentDate.clone().add(1, unit(currentView)))}
            >
                →
            </button>
            <button 
                onClick={() => onDateChange(dayjs())}
            >
                ＝
            </button>
            
            {/* 数据筛选：优先使用上层注入的全局筛选面板；没有注入时保留旧版主题/分类筛选。 */}
            {filterSlot || (
                <>
                    {onThemeSelectionChange && (
                        <ThemeFilter
                            selectedThemes={selectedThemes}
                            onSelectionChange={onThemeSelectionChange}
                            themes={themes}
                        />
                    )}

                    {onCategorySelectionChange && (
                        <CategoryFilter
                            selectedCategories={selectedCategories}
                            onSelectionChange={onCategorySelectionChange}
                            viewInstances={viewInstances}
                            predefinedCategories={predefinedCategories}
                        />
                    )}
                </>
            )}
        
            {/* 布局设置按钮 */}
            {onLayoutSettingsClick && (
                <button
                    class="tp-toolbar-layout-settings"
                    title="布局设置"
                    onClick={() => onLayoutSettingsClick()}
                >
                    ⚙
                </button>
            )}
</div>
    );
}
