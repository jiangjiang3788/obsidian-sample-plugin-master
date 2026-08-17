/** @jsxImportSource preact */
import type { RecordViewItem } from '@core/types/public';
import { dayjs } from '@core/utils/public';
import type { OpenRecordOriginHandler, ResolveResourcePathHandler } from '@shared/types/public';
import { isKeyboardActivation, stopInteractionEvent } from '@shared/ui/public';
import { HeatmapCell } from './components/heatmap/HeatmapCell';
import { getGoalLeafLabel, type HeatmapPresetContext } from './HeatmapViewModel';

interface HeatmapGoalGroupProps {
    normalizedCurrentView: string;
    goalPath: string;
    dataForGoal: Map<string, RecordViewItem[]>;
    dateRange: [Date, Date];
    config: any;
    resolveResourcePath?: ResolveResourcePathHandler;
    onOpenRecordOrigin?: OpenRecordOriginHandler;
    verticalLayouts: Set<string>;
    collapsedGoals: Set<string>;
    headerRefs: { current: Map<string, HTMLElement> };
    keyPrefix?: string;
    entryKey?: string;
    label?: string;
    presetContext?: HeatmapPresetContext;
    onToggleGoalCollapsed: (goalKey: string) => void;
    onCellClick: (date: string, dayItems: RecordViewItem[] | undefined, goalPath?: string, presetContext?: HeatmapPresetContext) => void;
    resolveCellRatingMapping: (goalPath: string, presetContext?: HeatmapPresetContext) => Map<string, string>;
}

export function HeatmapGoalGroup({
    normalizedCurrentView,
    goalPath,
    dataForGoal,
    dateRange,
    config,
    resolveResourcePath,
    onOpenRecordOrigin,
    verticalLayouts,
    collapsedGoals,
    headerRefs,
    keyPrefix = '',
    entryKey,
    label,
    presetContext,
    onToggleGoalCollapsed,
    onCellClick,
    resolveCellRatingMapping,
}: HeatmapGoalGroupProps) {
    const rowKey = `${keyPrefix}${entryKey || goalPath}`;
    const isRowLayout = ['周', '月'].includes(normalizedCurrentView);
    const isVertical = normalizedCurrentView === '周' ? false : verticalLayouts.has(rowKey);
    const isCollapsed = normalizedCurrentView === '年' && collapsedGoals.has(rowKey);
    const leafLabel = label || getGoalLeafLabel(goalPath);

    const renderMonthGrid = (monthDate: dayjs.Dayjs) => {
        const startOfMonth = monthDate.startOf('month');
        const endOfMonth = monthDate.endOf('month');
        const firstWeekday = startOfMonth.isoWeekday();
        const ratingMapping = resolveCellRatingMapping(goalPath, presetContext);
        const days = [];
        for (let i = 1; i < firstWeekday; i++) days.push(<div key={`spacer-${i}`} class="heatmap-cell grid-spacer" />);
        for (let i = 1; i <= endOfMonth.date(); i++) {
            const dateStr = startOfMonth.clone().date(i).format('YYYY-MM-DD');
            const dayItems = dataForGoal.get(dateStr);
            days.push(
                <HeatmapCell
                    key={dateStr}
                    date={dateStr}
                    items={dayItems}
                    config={config}
                    ratingMapping={ratingMapping}
                    resolveResourcePath={resolveResourcePath}
                    onOpenRecordOrigin={onOpenRecordOrigin}
                    onCellClick={(clickedDate, clickedItems) => onCellClick(clickedDate, clickedItems, goalPath, presetContext)}
                />,
            );
        }
        return (
            <div key={monthDate.format('YYYY-MM')} class="month-section">
                <div class="month-label">{monthDate.format('M月')}</div>
                <div class="heatmap-row calendar">{days}</div>
            </div>
        );
    };

    const renderHeaderCells = () => {
        const start = dayjs(dateRange[0]);
        const end = dayjs(dateRange[1]);
        const ratingMapping = resolveCellRatingMapping(goalPath, presetContext);
        switch (normalizedCurrentView) {
            case '天':
            case '日':
            case 'day': {
                const dateStr = start.format('YYYY-MM-DD');
                const dayItems = dataForGoal.get(dateStr);
                return [<HeatmapCell key={dateStr} date={dateStr} items={dayItems} config={config} ratingMapping={ratingMapping} resolveResourcePath={resolveResourcePath} onOpenRecordOrigin={onOpenRecordOrigin} onCellClick={(d, xs) => onCellClick(d, xs, goalPath, presetContext)} />];
            }
            case '周':
            case '月': {
                const cells = [];
                let currentDate = normalizedCurrentView === '周' ? start.startOf('isoWeek') : start.startOf('month');
                const endDate = normalizedCurrentView === '周' ? start.endOf('isoWeek') : start.endOf('month');
                while (currentDate.isSameOrBefore(endDate, 'day')) {
                    const dateStr = currentDate.format('YYYY-MM-DD');
                    const dayItems = dataForGoal.get(dateStr);
                    cells.push(<HeatmapCell key={`${goalPath}-${dateStr}`} date={dateStr} items={dayItems} config={config} ratingMapping={ratingMapping} resolveResourcePath={resolveResourcePath} onOpenRecordOrigin={onOpenRecordOrigin} onCellClick={(d, xs) => onCellClick(d, xs, goalPath, presetContext)} />);
                    currentDate = currentDate.add(1, 'day');
                }
                return cells;
            }
            case '年':
            case '季': {
                const months = [];
                let currentMonth = start.clone().startOf('month');
                while (currentMonth.isSameOrBefore(end, 'month')) {
                    months.push(renderMonthGrid(currentMonth));
                    currentMonth = currentMonth.add(1, 'month');
                }
                return months;
            }
            default:
                return [];
        }
    };

    return (
        <div class={`heatmap-goal-group ${normalizedCurrentView === '年' ? 'is-collapsible' : ''}`} key={rowKey}>
            <div
                class={`heatmap-goal-header ${isRowLayout ? 'row-inline-layout week-inline-layout' : ''} ${isVertical ? 'vertical-layout' : ''} ${isCollapsed ? 'is-collapsed' : ''}`}
                data-goal={rowKey}
                ref={(el) => { if (el && goalPath !== '__default__') headerRefs.current.set(rowKey, el); }}
            >
                {goalPath !== '__default__' && (
                    <div
                        class={`heatmap-header-info ${normalizedCurrentView === '年' ? 'is-clickable' : ''}`}
                        role={normalizedCurrentView === '年' ? 'button' : undefined}
                        tabIndex={normalizedCurrentView === '年' ? 0 : undefined}
                        onClick={() => { if (normalizedCurrentView === '年') onToggleGoalCollapsed(rowKey); }}
                        onKeyDown={(event: KeyboardEvent) => {
                            if (normalizedCurrentView !== '年' || !isKeyboardActivation(event)) return;
                            stopInteractionEvent(event);
                            onToggleGoalCollapsed(rowKey);
                        }}
                    >
                        <div class="heatmap-header-info-left">
                            {normalizedCurrentView === '年' && <span class={`heatmap-collapse-arrow ${isCollapsed ? 'is-collapsed' : ''}`}>▾</span>}
                            <span class="heatmap-goal-name">{leafLabel}</span>
                        </div>
                    </div>
                )}
                {!isCollapsed && <div class={`heatmap-header-cells ${isRowLayout ? '' : 'grid-view'}`}>{renderHeaderCells()}</div>}
            </div>
        </div>
    );
}
