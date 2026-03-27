// src/features/dashboard/ui/HeatmapView.tsx

/** @jsxImportSource preact */
import { useMemo, useState, useRef, useEffect } from 'preact/hooks';
import { Item, ViewInstance, InputSettings, ThemeDefinition, devLog, parsePath } from '@core/public';
import { Notice } from 'obsidian';
import { dayjs } from '@core/public';
import { openCreateFromHeatmap } from '@/app/actions/recordUiActions';
import { HEATMAP_VIEW_DEFAULT_CONFIG } from '@core/public';
import { CheckinManagerModal } from '@shared/ui/modals/CheckinManagerModal';
import { HeatmapCell } from '@shared/ui/heatmap/HeatmapCell';
import { buildThemeDataMap, buildThemesByPathMap } from '@core/public';
import { RatingMappingCache } from '@core/public';

// ========== Types ==========
interface HeatmapViewProps {
    items: Item[];
    app: any;
    dateRange: [Date, Date];
    module: ViewInstance;
    currentView: '年' | '季' | '月' | '周' | '天';
    inputSettings: InputSettings;

    // Phase2: shared/ui 纯化试点（可注入 renderModel）
    injectedThemesByPath?: Map<string, ThemeDefinition>;
    injectedThemesToTrack?: string[];
    injectedDataByThemeAndDate?: Map<string, Map<string, Item[]>>;
}

interface DayThemeEntry {
    themePath: string;
    label: string;
    dataForTheme: Map<string, Item[]>;
}

interface DayThemeGroup {
    title: string;
    entries: DayThemeEntry[];
}

function getThemeLeafLabel(themePath: string) {
    if (!themePath || themePath === '__default__') return '未分类';
    const segments = parsePath(themePath);
    const leaf = segments[segments.length - 1];
    return leaf?.name || themePath;
}

function getThemeGroupTitle(themePath: string) {
    if (!themePath || themePath === '__default__') return '未分类';
    const segments = parsePath(themePath);
    return segments[0]?.name || themePath;
}

// ========== Main View Component ==========
export function HeatmapView({
    items,
    app,
    dateRange,
    module,
    currentView,
    inputSettings,
    injectedThemesByPath,
    injectedThemesToTrack,
    injectedDataByThemeAndDate,
}: HeatmapViewProps) {
    const config = useMemo(
        () => ({ ...HEATMAP_VIEW_DEFAULT_CONFIG, ...module.viewConfig }),
        [module.viewConfig]
    );

    const themesByPath = useMemo(() => {
        return injectedThemesByPath ?? buildThemesByPathMap(inputSettings.themes);
    }, [injectedThemesByPath, inputSettings.themes]);

    const ratingMappingsCache = useRef(new RatingMappingCache()).current;

    useEffect(() => {
        ratingMappingsCache.clear();
    }, [inputSettings.themes, inputSettings.blocks, inputSettings.overrides]);

    useEffect(() => {
        devLog(`🔄 [数据更新] 检测到items数据变化，项目数量: ${items.length}`);
        ratingMappingsCache.clear();
    }, [items]);

    // 当 viewConfig 未显式指定 themePaths 时：
    // - 自动从当前 items 推断主题列表，避免落到 '__default__' 把不同主题混在同一张热力图里
    const inferredThemePaths = useMemo(() => {
        if (injectedThemesToTrack) return [];
        const set = new Set<string>();
        for (const it of items) {
            if (it?.theme && typeof it.theme === 'string' && it.theme.trim().length > 0) {
                set.add(it.theme);
            }
        }
        return Array.from(set);
    }, [items, injectedThemesToTrack]);

    const themesToTrack = useMemo(() => {
        return injectedThemesToTrack ?? (
            config.themePaths && config.themePaths.length > 0
                ? config.themePaths
                : inferredThemePaths
        );
    }, [injectedThemesToTrack, config.themePaths, inferredThemePaths]);

    const dataByThemeAndDate = useMemo(() => {
        return injectedDataByThemeAndDate ?? buildThemeDataMap(items, themesToTrack);
    }, [injectedDataByThemeAndDate, items, themesToTrack]);

    const inferredBlockIdByTheme = useMemo(() => {
        const result = new Map<string, string>();
        const counts = new Map<string, Map<string, number>>();

        for (const it of items) {
            const themeKey = typeof it?.theme === 'string' && it.theme.trim().length > 0 ? it.theme : '__default__';
            const blockId = (typeof it?.templateId === 'string' && it.templateId.trim().length > 0)
                ? it.templateId
                : (typeof it?.categoryKey === 'string' && it.categoryKey.trim().length > 0 ? it.categoryKey : '');
            if (!blockId) continue;
            if (!counts.has(themeKey)) counts.set(themeKey, new Map());
            const themeCounts = counts.get(themeKey)!;
            themeCounts.set(blockId, (themeCounts.get(blockId) || 0) + 1);
        }

        counts.forEach((themeCounts, themeKey) => {
            let bestBlockId = '';
            let bestCount = -1;
            themeCounts.forEach((count, blockId) => {
                if (count > bestCount) {
                    bestCount = count;
                    bestBlockId = blockId;
                }
            });
            if (bestBlockId) result.set(themeKey, bestBlockId);
        });

        return result;
    }, [items]);

    const resolveCreateBlockId = (themePath?: string, item?: Item) => {
        return config.sourceBlockId
            || (item?.templateId || item?.categoryKey)
            || (themePath ? inferredBlockIdByTheme.get(themePath) : undefined)
            || inferredBlockIdByTheme.get('__default__')
            || '';
    };

    const openQuickCreate = (date: string, item?: Item, themePath?: string) => {
        openCreateFromHeatmap({
            app,
            sourceBlockId: resolveCreateBlockId(themePath, item),
            date,
            item,
            themePath,
            themesByPath,
            notice: (message) => new Notice(message),
        });
    };

    // 点击行为：
    // - 无记录：直接新增
    // - 1 条记录：按当前日期/主题继续新增一条（保留 create with context 语义）
    // - 多条记录：打开管理窗口，已有记录走查看，新增仍走 create with context
    const handleCellClick = (date: string, dayItems?: Item[], themePath?: string) => {
        const itemsForDay = dayItems || [];

        if (itemsForDay.length === 0) {
            openQuickCreate(date, undefined, themePath);
            return;
        }

        if (itemsForDay.length === 1) {
            openQuickCreate(date, itemsForDay[0], themePath);
            return;
        }

        new CheckinManagerModal(
            app,
            date,
            itemsForDay,
            async () => {},
            () => openQuickCreate(date, itemsForDay[itemsForDay.length - 1], themePath)
        ).open();
    };

    const renderMonthGrid = (
        monthDate: dayjs.Dayjs,
        dataForMonth: Map<string, Item[]>,
        themePath: string
    ) => {
        const startOfMonth = monthDate.startOf('month');
        const endOfMonth = monthDate.endOf('month');
        const firstWeekday = startOfMonth.isoWeekday();

        const themeRatingMapping = ratingMappingsCache.get(
            inputSettings,
            config.sourceBlockId || '',
            themePath,
            themesByPath
        );

        const days = [];
        for (let i = 1; i < firstWeekday; i++) {
            days.push(<div key={`spacer-${i}`} class="heatmap-cell grid-spacer"></div>);
        }

        for (let i = 1; i <= endOfMonth.date(); i++) {
            const dateStr = startOfMonth.clone().date(i).format('YYYY-MM-DD');
            const dayItems = dataForMonth.get(dateStr);
            days.push(
                <HeatmapCell
                    key={dateStr}
                    date={dateStr}
                    items={dayItems}
                    config={config}
                    ratingMapping={themeRatingMapping}
                    app={app}
                    onCellClick={(clickedDate, clickedItems) => handleCellClick(clickedDate, clickedItems, themePath)}
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

    const renderHeaderCells = (
        currentView: string,
        themePath: string,
        dataForTheme: Map<string, Item[]>
    ) => {
        const start = dayjs(dateRange[0]);
        const end = dayjs(dateRange[1]);

        const themeRatingMapping = ratingMappingsCache.get(
            inputSettings,
            config.sourceBlockId || '',
            themePath,
            themesByPath
        );

        switch (currentView) {
            case '天': {
                const dateStr = start.format('YYYY-MM-DD');
                const dayItems = dataForTheme.get(dateStr);
                return [
                    <HeatmapCell
                        key={dateStr}
                        date={dateStr}
                        items={dayItems}
                        config={config}
                        ratingMapping={themeRatingMapping}
                        app={app}
                        onCellClick={(clickedDate, clickedItems) => handleCellClick(clickedDate, clickedItems, themePath)}
                    />,
                ];
            }

            case '周': {
                const cells = [];
                let currentDate = start.startOf('isoWeek');
                const endDate = start.endOf('isoWeek');

                while (currentDate.isSameOrBefore(endDate, 'day')) {
                    const dateStr = currentDate.format('YYYY-MM-DD');
                    const dayItems = dataForTheme.get(dateStr);

                    cells.push(
                        <HeatmapCell
                            key={`${themePath}-${dateStr}`}
                            date={dateStr}
                            items={dayItems}
                            config={config}
                            ratingMapping={themeRatingMapping}
                            app={app}
                            onCellClick={(clickedDate, clickedItems) => handleCellClick(clickedDate, clickedItems, themePath)}
                        />
                    );

                    currentDate = currentDate.add(1, 'day');
                }

                return cells;
            }

            case '月': {
                const cells = [];
                let currentDate = start.startOf('month');
                const endDate = start.endOf('month');

                while (currentDate.isSameOrBefore(endDate, 'day')) {
                    const dateStr = currentDate.format('YYYY-MM-DD');
                    const dayItems = dataForTheme.get(dateStr);

                    cells.push(
                        <HeatmapCell
                            key={dateStr}
                            date={dateStr}
                            items={dayItems}
                            config={config}
                            ratingMapping={themeRatingMapping}
                            app={app}
                            onCellClick={(clickedDate, clickedItems) => handleCellClick(clickedDate, clickedItems, themePath)}
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
                    months.push(renderMonthGrid(currentMonth, dataForTheme, themePath));
                    currentMonth = currentMonth.add(1, 'month');
                }

                return months;
            }

            default:
                return [];
        }
    };

    const [verticalLayouts, setVerticalLayouts] = useState<Set<string>>(new Set());
    const [collapsedThemes, setCollapsedThemes] = useState<Set<string>>(new Set());
    const headerRefs = useRef<Map<string, HTMLElement>>(new Map());

    const toggleThemeCollapsed = (theme: string) => {
        setCollapsedThemes((prev) => {
            const next = new Set(prev);
            if (next.has(theme)) next.delete(theme);
            else next.add(theme);
            return next;
        });
    };

    // 检测是否需要垂直布局（仅用于天、月视图；周视图固定主题和 cell 一行）
    const checkLayout = (theme: string, headerElement: HTMLElement) => {
        if (!headerElement || theme === '__default__') return;

        const isGridLayout = ['年', '季'].includes(currentView);
        if (isGridLayout || currentView === '周') return;

        const containerWidth = headerElement.clientWidth;
        const threshold = currentView === '天' ? 320 : 600;
        const needsVertical = containerWidth < threshold;

        setVerticalLayouts((prev) => {
            const newSet = new Set(prev);
            if (needsVertical) {
                newSet.add(theme);
            } else {
                newSet.delete(theme);
            }
            return newSet;
        });
    };

    useEffect(() => {
        const resizeObserver = new ResizeObserver((entries) => {
            entries.forEach((entry) => {
                const element = entry.target as HTMLElement;
                const theme = element.dataset.theme;
                if (theme) {
                    checkLayout(theme, element);
                }
            });
        });

        headerRefs.current.forEach((element, theme) => {
            resizeObserver.observe(element);
            checkLayout(theme, element);
        });

        return () => {
            resizeObserver.disconnect();
        };
    }, [themesToTrack, currentView]);

    const buildDayThemeGroups = (): DayThemeGroup[] => {
        const themesToDisplay = themesToTrack.length > 0 ? themesToTrack : ['__default__'];
        const groups: DayThemeGroup[] = [];
        const groupMap = new Map<string, DayThemeGroup>();

        themesToDisplay.forEach((themePath) => {
            const title = getThemeGroupTitle(themePath);
            const label = getThemeLeafLabel(themePath);

            const entry: DayThemeEntry = {
                themePath,
                label,
                dataForTheme: dataByThemeAndDate.get(themePath) || new Map(),
            };

            const existingGroup = groupMap.get(title);
            if (existingGroup) {
                existingGroup.entries.push(entry);
                return;
            }

            const newGroup: DayThemeGroup = {
                title,
                entries: [entry],
            };
            groupMap.set(title, newGroup);
            groups.push(newGroup);
        });

        return groups;
    };

    // 天视图：
    // - 按一级主题分组
    // - 未打卡时，在 cell 内显示子主题
    // - 已打卡时，不显示主题文字
    const renderDayContent = () => {
        const dayDateStr = dayjs(dateRange[0]).format('YYYY-MM-DD');
        const dayGroups = buildDayThemeGroups();

        return (
            <div class="heatmap-day-view">
                {dayGroups.map((group) => (
                    <section class="heatmap-day-section" key={group.title}>
                        <h3 class="heatmap-day-section-title">{group.title}</h3>
                        <div class="heatmap-day-section-grid">
                            {group.entries.map((entry) => {
                                const themeRatingMapping = ratingMappingsCache.get(
                                    inputSettings,
                                    config.sourceBlockId || '',
                                    entry.themePath,
                                    themesByPath
                                );
                                const dayItems = entry.dataForTheme.get(dayDateStr);

                                return (
                                    <div class="heatmap-day-item" key={entry.themePath}>
                                        <HeatmapCell
                                            date={dayDateStr}
                                            items={dayItems}
                                            config={config}
                                            ratingMapping={themeRatingMapping}
                                            app={app}
                                            highlightToday={false}
                                            emptyLabel={!dayItems || dayItems.length === 0 ? entry.label : undefined}
                                            onCellClick={(clickedDate, clickedItems) => handleCellClick(clickedDate, clickedItems, entry.themePath)}
                                        />
                                    </div>
                                );
                            })}
                        </div>
                    </section>
                ))}
            </div>
        );
    };

    const renderContent = () => {
        if (currentView === '天') {
            return renderDayContent();
        }

        const themesToDisplay = themesToTrack.length > 0 ? themesToTrack : ['__default__'];
        const isRowLayout = ['周', '月'].includes(currentView);
        const wrapperClass = isRowLayout ? 'layout-row' : 'layout-grid';

        return (
            <div class={`heatmap-view-wrapper ${wrapperClass}`}>
                {themesToDisplay.map((theme) => {
                    const dataForTheme = dataByThemeAndDate.get(theme) || new Map();
                    const isVertical = currentView === '周' ? false : verticalLayouts.has(theme);
                    const isCollapsed = currentView === '年' && collapsedThemes.has(theme);
                    const leafLabel = getThemeLeafLabel(theme);

                    return (
                        <div class={`heatmap-theme-group ${currentView === '年' ? 'is-collapsible' : ''}`} key={theme}>
                            <div
                                class={`heatmap-theme-header ${currentView === '周' ? 'week-inline-layout' : ''} ${isVertical ? 'vertical-layout' : ''} ${isCollapsed ? 'is-collapsed' : ''}`}
                                data-theme={theme}
                                ref={(el) => {
                                    if (el && theme !== '__default__') {
                                        headerRefs.current.set(theme, el);
                                    }
                                }}
                            >
                                {theme !== '__default__' && (
                                    <div
                                        class={`heatmap-header-info ${currentView === '年' ? 'is-clickable' : ''}`}
                                        onClick={() => {
                                            if (currentView === '年') toggleThemeCollapsed(theme);
                                        }}
                                    >
                                        <div class="heatmap-header-info-left">
                                            {currentView === '年' && <span class={`heatmap-collapse-arrow ${isCollapsed ? 'is-collapsed' : ''}`}>▾</span>}
                                            <span class="theme-name">{leafLabel}</span>
                                        </div>
                                    </div>
                                )}

                                {!isCollapsed && (
                                    <div class={`heatmap-header-cells ${isRowLayout ? '' : 'grid-view'}`}>
                                        {renderHeaderCells(currentView, theme, dataForTheme)}
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    };

    return <div class="heatmap-container">{renderContent()}</div>;
}
