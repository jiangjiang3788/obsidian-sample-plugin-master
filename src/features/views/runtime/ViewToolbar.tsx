/** @jsxImportSource preact */
import type { ComponentChildren } from 'preact';
import { useMemo } from 'preact/hooks';
import { dayjs } from '@core/utils/public';
import type { ThemeDefinition, ViewInstance } from '@core/types/public';
import {
    getObsidianEventBoundaryProps,
    ThinkIcon,
    ThinkIconButton,
    ThinkSegmentedControl,
} from '@shared/ui/public';
import { ThemeFilter } from './ThemeFilter';
import { CategoryFilter } from './CategoryFilter';
import { ViewToolbarDateControls } from './ViewToolbarDateControls';
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

const VIEW_SEGMENTS = VIEW_TOOLBAR_OPTIONS.map((value) => ({ value, label: value }));

export function ViewToolbar({
    currentView, currentDate, onViewChange, onDateChange, filterSlot,
    selectedThemes = [], selectedCategories = [], onThemeSelectionChange,
    onCategorySelectionChange, viewInstances, themes, predefinedCategories,
    hideToolbar = false, onLayoutSettingsClick,
}: ViewToolbarProps) {
    const dateLabel = useMemo(() => buildViewToolbarDateLabel(currentDate, currentView), [currentDate, currentView]);
    const dateTargets = useMemo(() => buildViewToolbarDateTargets(currentDate, currentView), [currentDate, currentView]);
    const fallbackFilters = shouldRenderViewToolbarFallbackFilters({
        hasFilterSlot: Boolean(filterSlot),
        canSelectThemes: Boolean(onThemeSelectionChange),
        canSelectCategories: Boolean(onCategorySelectionChange),
    });

    if (hideToolbar) return null;

    return (
        <div class="tp-toolbar think-toolbar think-toolbar--compact" {...getObsidianEventBoundaryProps()}>
            <ThinkSegmentedControl label="时间粒度" value={currentView} options={VIEW_SEGMENTS} onChange={onViewChange} size="sm" className="tp-toolbar__view-switcher" />
            <ViewToolbarDateControls
                dateLabel={dateLabel}
                onPrevious={() => onDateChange(dateTargets.previous)}
                onNext={() => onDateChange(dateTargets.next)}
                onToday={() => onDateChange(dateTargets.today)}
            />
            <span class="tp-toolbar__spacer" aria-hidden="true" />
            {(filterSlot || fallbackFilters) && (
                <div class="tp-toolbar__filters">
                    {filterSlot || (
                        <>
                            {onThemeSelectionChange && <ThemeFilter selectedThemes={selectedThemes} onSelectionChange={onThemeSelectionChange} themes={themes} />}
                            {onCategorySelectionChange && <CategoryFilter selectedCategories={selectedCategories} onSelectionChange={onCategorySelectionChange} viewInstances={viewInstances} predefinedCategories={predefinedCategories} />}
                        </>
                    )}
                </div>
            )}
            {onLayoutSettingsClick && (
                <ThinkIconButton size="sm" className="tp-toolbar-layout-settings" label="布局设置" icon={<ThinkIcon name="settings" />} onClick={onLayoutSettingsClick} />
            )}
        </div>
    );
}
