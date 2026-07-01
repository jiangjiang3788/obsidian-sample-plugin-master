/** @jsxImportSource preact */
import { h } from 'preact';
import type { ComponentChildren } from 'preact';
import { useMemo } from 'preact/hooks';
import { dayjs } from '@core/utils/public';
import { ThemeFilter } from './ThemeFilter';
import { CategoryFilter } from './CategoryFilter';
import { getObsidianEventBoundaryProps } from '../events/obsidianEventBoundary';
import type { ViewInstance } from '@core/types/public';
import type { ThemeDefinition } from '@core/types/public';
import {
    buildViewToolbarDateLabel,
    buildViewToolbarDateTargets,
    shouldRenderViewToolbarFallbackFilters,
    VIEW_TOOLBAR_OPTIONS,
} from './ViewToolbarModel';

export interface ViewToolbarProps {
    currentView: string;
    currentDate: dayjs.Dayjs;
    onViewChange: (view: string) => void;
    onDateChange: (date: dayjs.Dayjs) => void;
    filterSlot?: ComponentChildren;
    selectedThemes?: string[];
    selectedCategories?: string[];
    onThemeSelectionChange?: (themes: string[]) => void;
    onCategorySelectionChange?: (categories: string[]) => void;
    viewInstances: ViewInstance[];
    themes: ThemeDefinition[];
    predefinedCategories?: string[];
    hideToolbar?: boolean;
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
    const dateLabel = useMemo(() => buildViewToolbarDateLabel(currentDate, currentView), [currentDate, currentView]);
    const dateTargets = useMemo(() => buildViewToolbarDateTargets(currentDate, currentView), [currentDate, currentView]);
    const shouldRenderFallbackFilters = shouldRenderViewToolbarFallbackFilters({
        hasFilterSlot: Boolean(filterSlot),
        canSelectThemes: Boolean(onThemeSelectionChange),
        canSelectCategories: Boolean(onCategorySelectionChange),
    });

    if (hideToolbar) {
        return null;
    }

    return (
        <div class="tp-toolbar" {...getObsidianEventBoundaryProps()}>
            {VIEW_TOOLBAR_OPTIONS.map((viewOption) => (
                <button
                    key={viewOption}
                    onClick={() => onViewChange(viewOption)}
                    class={viewOption === currentView ? 'active' : ''}
                >
                    {viewOption}
                </button>
            ))}

            <span
                class="tp-toolbar-date-display"
                role="status"
                aria-live="polite"
                title="当前时间范围"
            >
                {dateLabel}
            </span>

            <button onClick={() => onDateChange(dateTargets.previous)}>←</button>
            <button onClick={() => onDateChange(dateTargets.next)}>→</button>
            <button onClick={() => onDateChange(dateTargets.today)}>＝</button>

            {filterSlot || (shouldRenderFallbackFilters && (
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
            ))}

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
