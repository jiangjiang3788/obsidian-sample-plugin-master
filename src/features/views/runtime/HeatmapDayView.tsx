/** @jsxImportSource preact */
import type { RecordViewItem } from '@core/types/public';
import type { OpenRecordOriginHandler, ResolveResourcePathHandler } from '@shared/types/public';
import { HeatmapCell } from './components/heatmap/HeatmapCell';
import {
    buildDayGoalGroups,
    createHeatmapPresetContext,
    type GoalHeatmapGroup,
    type HeatmapPresetContext,
} from './HeatmapViewModel';

interface HeatmapDayViewProps {
    dayDateStr: string;
    goalGroupsToDisplay: GoalHeatmapGroup[];
    goalPathsToTrack: string[];
    dataByGoalAndDate: Map<string, Map<string, RecordViewItem[]>>;
    config: any;
    resolveResourcePath?: ResolveResourcePathHandler;
    onOpenRecordOrigin?: OpenRecordOriginHandler;
    onCellClick: (date: string, dayItems: RecordViewItem[] | undefined, goalPath?: string, presetContext?: HeatmapPresetContext) => void;
    resolveCellRatingMapping: (goalPath: string, presetContext?: HeatmapPresetContext) => Map<string, string>;
}

export function HeatmapDayView({
    dayDateStr,
    goalGroupsToDisplay,
    goalPathsToTrack,
    dataByGoalAndDate,
    config,
    resolveResourcePath,
    onOpenRecordOrigin,
    onCellClick,
    resolveCellRatingMapping,
}: HeatmapDayViewProps) {
    if (goalGroupsToDisplay.length > 0) {
        return (
            <div class="heatmap-goal-day-view">
                {goalGroupsToDisplay.map((goalGroup) => (
                    <section class="heatmap-goal-section heatmap-day-section" key={goalGroup.goalPath}>
                        <div class="heatmap-goal-title-row">
                            <h3 class="heatmap-day-section-title">{goalGroup.label}</h3>
                            <span class="heatmap-goal-meta">{goalGroup.entries.length} 个打卡 · {goalGroup.count} 条记录</span>
                        </div>
                        <div class="heatmap-day-section-grid">
                            {goalGroup.entries.map((entry) => {
                                const presetContext = createHeatmapPresetContext(entry);
                                const ratingMapping = resolveCellRatingMapping(entry.goalPath, presetContext);
                                const dayItems = entry.dataForGoal.get(dayDateStr);
                                return (
                                    <div class="heatmap-day-item" key={`${goalGroup.goalPath}:${entry.presetKey || entry.goalPath}`} title={`${goalGroup.label} · ${entry.label} · ${entry.goalPath}`}>
                                        <HeatmapCell
                                            date={dayDateStr}
                                            items={dayItems}
                                            config={config}
                                            ratingMapping={ratingMapping}
                                            resolveResourcePath={resolveResourcePath}
                                            onOpenRecordOrigin={onOpenRecordOrigin}
                                            highlightToday={false}
                                            emptyLabel={!dayItems || dayItems.length === 0 ? entry.label : undefined}
                                            onCellClick={(clickedDate, clickedItems) => onCellClick(clickedDate, clickedItems, entry.goalPath, presetContext)}
                                        />
                                    </div>
                                );
                            })}
                        </div>
                    </section>
                ))}
            </div>
        );
    }

    const dayGroups = buildDayGoalGroups({ goalPathsToTrack, dataByGoalAndDate });
    return (
        <div class="heatmap-day-view">
            {dayGroups.map((group) => (
                <section class="heatmap-day-section" key={group.title}>
                    <h3 class="heatmap-day-section-title">{group.title}</h3>
                    <div class="heatmap-day-section-grid">
                        {group.entries.map((entry) => {
                            const ratingMapping = resolveCellRatingMapping(entry.goalPath);
                            const dayItems = entry.dataForGoal.get(dayDateStr);
                            return (
                                <div class="heatmap-day-item" key={entry.goalPath}>
                                    <HeatmapCell
                                        date={dayDateStr}
                                        items={dayItems}
                                        config={config}
                                        ratingMapping={ratingMapping}
                                        resolveResourcePath={resolveResourcePath}
                                        onOpenRecordOrigin={onOpenRecordOrigin}
                                        highlightToday={false}
                                        emptyLabel={!dayItems || dayItems.length === 0 ? entry.label : undefined}
                                        onCellClick={(clickedDate, clickedItems) => onCellClick(clickedDate, clickedItems, entry.goalPath)}
                                    />
                                </div>
                            );
                        })}
                    </div>
                </section>
            ))}
        </div>
    );
}
