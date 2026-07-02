/** @jsxImportSource preact */
import type { Item } from '@core/types/public';
import type { ResolveResourcePathHandler } from '@shared/types/public';
import { HeatmapDayView } from './HeatmapDayView';
import { HeatmapThemeGroup } from './HeatmapThemeGroup';
import {
    createHeatmapPresetContext,
    type GoalHeatmapGroup,
    type HeatmapPresetContext,
} from './HeatmapViewModel';

interface HeatmapViewContentProps {
    isDayView: boolean;
    normalizedCurrentView: string;
    dateRangeStart: string;
    dateRange: [Date, Date];
    config: any;
    resolveResourcePath?: ResolveResourcePathHandler;
    goalGroupsToDisplay: GoalHeatmapGroup[];
    themesToTrack: string[];
    dataByThemeAndDate: Map<string, Map<string, Item[]>>;
    verticalLayouts: Set<string>;
    collapsedThemes: Set<string>;
    headerRefs: { current: Map<string, HTMLElement> };
    onToggleThemeCollapsed: (themeKey: string) => void;
    onCellClick: (date: string, dayItems: Item[] | undefined, themePath?: string, goalPath?: string, presetContext?: HeatmapPresetContext) => void;
    resolveCellRatingMapping: (themePath: string, presetContext?: HeatmapPresetContext) => Map<string, string>;
}

export function HeatmapViewContent({
    isDayView,
    normalizedCurrentView,
    dateRangeStart,
    dateRange,
    config,
    resolveResourcePath,
    goalGroupsToDisplay,
    themesToTrack,
    dataByThemeAndDate,
    verticalLayouts,
    collapsedThemes,
    headerRefs,
    onToggleThemeCollapsed,
    onCellClick,
    resolveCellRatingMapping,
}: HeatmapViewContentProps) {
    const renderThemeGroup = (params: {
        theme: string;
        dataForTheme: Map<string, Item[]>;
        goalPath?: string;
        keyPrefix?: string;
        entryKey?: string;
        label?: string;
        presetContext?: HeatmapPresetContext;
    }) => (
        <HeatmapThemeGroup
            {...params}
            normalizedCurrentView={normalizedCurrentView}
            dateRange={dateRange}
            config={config}
            resolveResourcePath={resolveResourcePath}
            verticalLayouts={verticalLayouts}
            collapsedThemes={collapsedThemes}
            headerRefs={headerRefs}
            onToggleThemeCollapsed={onToggleThemeCollapsed}
            onCellClick={onCellClick}
            resolveCellRatingMapping={resolveCellRatingMapping}
        />
    );

    if (isDayView) {
        return (
            <HeatmapDayView
                dayDateStr={dateRangeStart}
                goalGroupsToDisplay={goalGroupsToDisplay}
                themesToTrack={themesToTrack}
                dataByThemeAndDate={dataByThemeAndDate}
                config={config}
                resolveResourcePath={resolveResourcePath}
                onCellClick={onCellClick}
                resolveCellRatingMapping={resolveCellRatingMapping}
            />
        );
    }

    const isRowLayout = ['周', '月'].includes(normalizedCurrentView);
    const wrapperClass = isRowLayout ? 'layout-row' : 'layout-grid';

    if (goalGroupsToDisplay.length > 0) {
        return (
            <div class={`heatmap-view-wrapper heatmap-goal-view-wrapper ${wrapperClass}`}>
                {goalGroupsToDisplay.map((goalGroup) => (
                    <section class="heatmap-goal-section" key={goalGroup.goalPath}>
                        <div class="heatmap-goal-title-row">
                            <h3 class="heatmap-goal-title">{goalGroup.label}</h3>
                            <span class="heatmap-goal-meta">{goalGroup.entries.length} 个打卡 · {goalGroup.count} 条记录</span>
                        </div>
                        <div class="heatmap-goal-theme-list">
                            {goalGroup.entries.map((entry) => renderThemeGroup({
                                theme: entry.themePath,
                                dataForTheme: entry.dataForTheme,
                                goalPath: goalGroup.goalPath,
                                keyPrefix: `${goalGroup.goalPath}\u0000`,
                                entryKey: entry.presetKey || entry.themePath,
                                label: entry.label,
                                presetContext: createHeatmapPresetContext(entry),
                            }))}
                        </div>
                    </section>
                ))}
            </div>
        );
    }

    const themesToDisplay = themesToTrack.length > 0 ? themesToTrack : ['__default__'];

    return (
        <div class={`heatmap-view-wrapper ${wrapperClass}`}>
            {themesToDisplay.map((theme) => renderThemeGroup({
                theme,
                dataForTheme: dataByThemeAndDate.get(theme) || new Map(),
            }))}
        </div>
    );
}
