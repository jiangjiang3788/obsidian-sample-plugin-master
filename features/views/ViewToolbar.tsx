/** @jsxImportSource preact */
import { h } from 'preact';
import { useMemo } from 'preact/hooks';
import { dayjs, formatDateForView } from '@core/utils/date';
import { ThemeFilter } from './ThemeFilter';
import { CategoryFilter } from './CategoryFilter';
import type { ViewInstance } from '@/core/types/schema';
import type { ThemeDefinition } from '@/core/types';

export interface ViewToolbarProps {
    // 时间相关
    currentView: string;
    currentDate: dayjs.Dayjs;
    onViewChange: (view: string) => void;
    onDateChange: (date: dayjs.Dayjs) => void;
    
    // 筛选相关
    selectedThemes: string[];
    selectedCategories: string[];
    onThemeSelectionChange: (themes: string[]) => void;
    onCategorySelectionChange: (categories: string[]) => void;
    viewInstances: ViewInstance[];
    themes: ThemeDefinition[];
    predefinedCategories?: string[];
    
    // 配置
    hideToolbar?: boolean;
}

export function ViewToolbar({
    currentView,
    currentDate,
    onViewChange,
    onDateChange,
    selectedThemes,
    selectedCategories,
    onThemeSelectionChange,
    onCategorySelectionChange,
    viewInstances,
    themes,
    predefinedCategories,
    hideToolbar = false
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
        <div class="tp-toolbar">
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
            <button 
                disabled 
                class="tp-toolbar-date-display"
            >
                {formatDateForView(currentDate, currentView)}
            </button>
            
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
            
            {/* 主题筛选 */}
            <ThemeFilter
                selectedThemes={selectedThemes}
                onSelectionChange={onThemeSelectionChange}
                themes={themes}
            />
            
            {/* 分类筛选 */}
            <CategoryFilter
                selectedCategories={selectedCategories}
                onSelectionChange={onCategorySelectionChange}
                viewInstances={viewInstances}
                predefinedCategories={predefinedCategories}
            />
        </div>
    );
}
