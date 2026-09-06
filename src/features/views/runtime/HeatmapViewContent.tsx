/** @jsxImportSource preact */
import type { RecordViewItem } from '@core/types/public';
import type { OpenRecordOriginHandler, ResolveResourcePathHandler } from '@shared/types/public';
import { HeatmapDayView } from './HeatmapDayView';
import { HeatmapGoalGroup } from './HeatmapGoalGroup';
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
    onOpenRecordOrigin?: OpenRecordOriginHandler;
    goalGroupsToDisplay: GoalHeatmapGroup[];
    goalPathsToTrack: string[];
    dataByGoalAndDate: Map<string, Map<string, RecordViewItem[]>>;
    verticalLayouts: Set<string>;
    collapsedGoals: Set<string>;
    headerRefs: { current: Map<string, HTMLElement> };
    onToggleGoalCollapsed: (goalKey: string) => void;
    onCellClick: (date: string, dayItems: RecordViewItem[] | undefined, goalPath?: string, presetContext?: HeatmapPresetContext) => void;
    resolveCellRatingMapping: (goalPath: string, presetContext?: HeatmapPresetContext) => Map<string, string>;
}

export function HeatmapViewContent({
    isDayView,
    normalizedCurrentView,
    dateRangeStart,
    dateRange,
    config,
    resolveResourcePath,
    onOpenRecordOrigin,
    goalGroupsToDisplay,
    goalPathsToTrack,
    dataByGoalAndDate,
    verticalLayouts,
    collapsedGoals,
    headerRefs,
    onToggleGoalCollapsed,
    onCellClick,
    resolveCellRatingMapping,
}: HeatmapViewContentProps) {
    const renderGoalRow = (params: {
        goalPath: string;
        dataForGoal: Map<string, RecordViewItem[]>;
        keyPrefix?: string;
        entryKey?: string;
        label?: string;
        presetContext?: HeatmapPresetContext;
    }) => (
        <HeatmapGoalGroup
            {...params}
            normalizedCurrentView={normalizedCurrentView}
            dateRange={dateRange}
            config={config}
            resolveResourcePath={resolveResourcePath}
            onOpenRecordOrigin={onOpenRecordOrigin}
            verticalLayouts={verticalLayouts}
            collapsedGoals={collapsedGoals}
            headerRefs={headerRefs}
            onToggleGoalCollapsed={onToggleGoalCollapsed}
            onCellClick={onCellClick}
            resolveCellRatingMapping={resolveCellRatingMapping}
        />
    );

    if (isDayView) {
        return (
            <HeatmapDayView
                dayDateStr={dateRangeStart}
                goalGroupsToDisplay={goalGroupsToDisplay}
                goalPathsToTrack={goalPathsToTrack}
                dataByGoalAndDate={dataByGoalAndDate}
                config={config}
                resolveResourcePath={resolveResourcePath}
                onOpenRecordOrigin={onOpenRecordOrigin}
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
                            <div class="heatmap-goal-title" role="heading" aria-level={3}>{goalGroup.label}</div>
                        </div>
                        <div class="heatmap-goal-list">
                            {goalGroup.entries.map((entry) => renderGoalRow({
                                goalPath: entry.goalPath,
                                dataForGoal: entry.dataForGoal,
                                keyPrefix: `${goalGroup.goalPath}\u0000`,
                                entryKey: entry.presetKey || entry.goalPath,
                                label: entry.label,
                                presetContext: createHeatmapPresetContext(entry),
                            }))}
                        </div>
                    </section>
                ))}
            </div>
        );
    }

    const goalsToDisplay = goalPathsToTrack.length > 0 ? goalPathsToTrack : ['__default__'];
    return (
        <div class={`heatmap-view-wrapper ${wrapperClass}`}>
            {goalsToDisplay.map((goalPath) => renderGoalRow({
                goalPath,
                dataForGoal: dataByGoalAndDate.get(goalPath) || new Map(),
            }))}
        </div>
    );
}
