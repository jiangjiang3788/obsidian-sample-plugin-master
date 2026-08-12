/** @jsxImportSource preact */
import type { RecordViewItem } from '@core/types/public';
import { dayjs } from '@core/utils/public';
import type { ResolveResourcePathHandler } from '@shared/types/public';
import { HeatmapCell } from './components/heatmap/HeatmapCell';
import { getThemeLeafLabel, type HeatmapPresetContext } from './HeatmapViewModel';

interface HeatmapThemeGroupProps {
    normalizedCurrentView: string;
    theme: string;
    dataForTheme: Map<string, RecordViewItem[]>;
    dateRange: [Date, Date];
    config: any;
    resolveResourcePath?: ResolveResourcePathHandler;
    verticalLayouts: Set<string>;
    collapsedThemes: Set<string>;
    headerRefs: { current: Map<string, HTMLElement> };
    goalPath?: string;
    keyPrefix?: string;
    entryKey?: string;
    label?: string;
    presetContext?: HeatmapPresetContext;
    onToggleThemeCollapsed: (themeKey: string) => void;
    onCellClick: (date: string, dayItems: RecordViewItem[] | undefined, themePath?: string, goalPath?: string, presetContext?: HeatmapPresetContext) => void;
    resolveCellRatingMapping: (themePath: string, presetContext?: HeatmapPresetContext) => Map<string, string>;
}

export function HeatmapThemeGroup({
    normalizedCurrentView,
    theme,
    dataForTheme,
    dateRange,
    config,
    resolveResourcePath,
    verticalLayouts,
    collapsedThemes,
    headerRefs,
    goalPath,
    keyPrefix = '',
    entryKey,
    label,
    presetContext,
    onToggleThemeCollapsed,
    onCellClick,
    resolveCellRatingMapping,
}: HeatmapThemeGroupProps) {
    const rowKey = `${keyPrefix}${entryKey || theme}`;
    const isRowLayout = ['周', '月'].includes(normalizedCurrentView);
    const isVertical = normalizedCurrentView === '周' ? false : verticalLayouts.has(rowKey);
    const isCollapsed = normalizedCurrentView === '年' && collapsedThemes.has(rowKey);
    const leafLabel = label || getThemeLeafLabel(theme);

    const renderMonthGrid = (monthDate: dayjs.Dayjs) => {
        const startOfMonth = monthDate.startOf('month');
        const endOfMonth = monthDate.endOf('month');
        const firstWeekday = startOfMonth.isoWeekday();
        const themeRatingMapping = resolveCellRatingMapping(theme, presetContext);
        const days = [];

        for (let i = 1; i < firstWeekday; i++) {
            days.push(<div key={`spacer-${i}`} class="heatmap-cell grid-spacer"></div>);
        }

        for (let i = 1; i <= endOfMonth.date(); i++) {
            const dateStr = startOfMonth.clone().date(i).format('YYYY-MM-DD');
            const dayItems = dataForTheme.get(dateStr);
            days.push(
                <HeatmapCell
                    key={dateStr}
                    date={dateStr}
                    items={dayItems}
                    config={config}
                    ratingMapping={themeRatingMapping}
                    resolveResourcePath={resolveResourcePath}
                    onCellClick={(clickedDate, clickedItems) => onCellClick(clickedDate, clickedItems, theme, goalPath, presetContext)}
                />
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
        const themeRatingMapping = resolveCellRatingMapping(theme, presetContext);

        switch (normalizedCurrentView) {
            case '天':
            case '日':
            case 'day': {
                const dateStr = start.format('YYYY-MM-DD');
                const dayItems = dataForTheme.get(dateStr);
                return [
                    <HeatmapCell
                        key={dateStr}
                        date={dateStr}
                        items={dayItems}
                        config={config}
                        ratingMapping={themeRatingMapping}
                        resolveResourcePath={resolveResourcePath}
                        onCellClick={(clickedDate, clickedItems) => onCellClick(clickedDate, clickedItems, theme, goalPath, presetContext)}
                    />,
                ];
            }
            case '周':
            case '月': {
                const cells = [];
                let currentDate = normalizedCurrentView === '周' ? start.startOf('isoWeek') : start.startOf('month');
                const endDate = normalizedCurrentView === '周' ? start.endOf('isoWeek') : start.endOf('month');

                while (currentDate.isSameOrBefore(endDate, 'day')) {
                    const dateStr = currentDate.format('YYYY-MM-DD');
                    const dayItems = dataForTheme.get(dateStr);
                    cells.push(
                        <HeatmapCell
                            key={`${theme}-${dateStr}`}
                            date={dateStr}
                            items={dayItems}
                            config={config}
                            ratingMapping={themeRatingMapping}
                            resolveResourcePath={resolveResourcePath}
                            onCellClick={(clickedDate, clickedItems) => onCellClick(clickedDate, clickedItems, theme, goalPath, presetContext)}
                        />
                    );
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
        <div class={`heatmap-theme-group ${normalizedCurrentView === '年' ? 'is-collapsible' : ''}`} key={rowKey}>
            <div
                class={`heatmap-theme-header ${isRowLayout ? 'row-inline-layout week-inline-layout' : ''} ${isVertical ? 'vertical-layout' : ''} ${isCollapsed ? 'is-collapsed' : ''}`}
                data-theme={rowKey}
                ref={(el) => {
                    if (el && theme !== '__default__') {
                        headerRefs.current.set(rowKey, el);
                    }
                }}
            >
                {theme !== '__default__' && (
                    <div
                        class={`heatmap-header-info ${normalizedCurrentView === '年' ? 'is-clickable' : ''}`}
                        onClick={() => {
                            if (normalizedCurrentView === '年') onToggleThemeCollapsed(rowKey);
                        }}
                    >
                        <div class="heatmap-header-info-left">
                            {normalizedCurrentView === '年' && <span class={`heatmap-collapse-arrow ${isCollapsed ? 'is-collapsed' : ''}`}>▾</span>}
                            <span class="theme-name">{leafLabel}</span>
                        </div>
                    </div>
                )}

                {!isCollapsed && (
                    <div class={`heatmap-header-cells ${isRowLayout ? '' : 'grid-view'}`}>
                        {renderHeaderCells()}
                    </div>
                )}
            </div>
        </div>
    );
}
