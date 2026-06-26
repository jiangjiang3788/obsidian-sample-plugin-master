/** @jsxImportSource preact */
import type { Item } from '@core/public';
import type { ResolveResourcePathHandler } from '../../types/actions';
import { HeatmapCell } from '../heatmap/HeatmapCell';
import {
    buildDayThemeGroups,
    createHeatmapPresetContext,
    type GoalHeatmapGroup,
    type HeatmapPresetContext,
} from './HeatmapViewModel';

interface HeatmapDayViewProps {
    dayDateStr: string;
    goalGroupsToDisplay: GoalHeatmapGroup[];
    themesToTrack: string[];
    dataByThemeAndDate: Map<string, Map<string, Item[]>>;
    config: any;
    resolveResourcePath?: ResolveResourcePathHandler;
    onCellClick: (date: string, dayItems: Item[] | undefined, themePath?: string, goalPath?: string, presetContext?: HeatmapPresetContext) => void;
    resolveCellRatingMapping: (themePath: string, presetContext?: HeatmapPresetContext) => Map<string, string>;
}

export function HeatmapDayView({
    dayDateStr,
    goalGroupsToDisplay,
    themesToTrack,
    dataByThemeAndDate,
    config,
    resolveResourcePath,
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
                                const themeRatingMapping = resolveCellRatingMapping(entry.themePath, presetContext);
                                const dayItems = entry.dataForTheme.get(dayDateStr);

                                return (
                                    <div class="heatmap-day-item" key={`${goalGroup.goalPath}:${entry.presetKey || entry.themePath}`} title={`${goalGroup.label} · ${entry.label} · ${entry.themePath}`}>
                                        <HeatmapCell
                                            date={dayDateStr}
                                            items={dayItems}
                                            config={config}
                                            ratingMapping={themeRatingMapping}
                                            resolveResourcePath={resolveResourcePath}
                                            highlightToday={false}
                                            emptyLabel={!dayItems || dayItems.length === 0 ? entry.label : undefined}
                                            onCellClick={(clickedDate, clickedItems) => onCellClick(clickedDate, clickedItems, entry.themePath, goalGroup.goalPath, presetContext)}
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

    const dayGroups = buildDayThemeGroups({ themesToTrack, dataByThemeAndDate });

    return (
        <div class="heatmap-day-view">
            {dayGroups.map((group) => (
                <section class="heatmap-day-section" key={group.title}>
                    <h3 class="heatmap-day-section-title">{group.title}</h3>
                    <div class="heatmap-day-section-grid">
                        {group.entries.map((entry) => {
                            const themeRatingMapping = resolveCellRatingMapping(entry.themePath);
                            const dayItems = entry.dataForTheme.get(dayDateStr);

                            return (
                                <div class="heatmap-day-item" key={entry.themePath}>
                                    <HeatmapCell
                                        date={dayDateStr}
                                        items={dayItems}
                                        config={config}
                                        ratingMapping={themeRatingMapping}
                                        resolveResourcePath={resolveResourcePath}
                                        highlightToday={false}
                                        emptyLabel={!dayItems || dayItems.length === 0 ? entry.label : undefined}
                                        onCellClick={(clickedDate, clickedItems) => onCellClick(clickedDate, clickedItems, entry.themePath)}
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
