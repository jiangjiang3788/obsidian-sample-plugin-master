// src/features/dashboard/ui/HeatmapView.tsx

/** @jsxImportSource preact */
import { useMemo, useState, useRef, useEffect } from 'preact/hooks';
import { Item, ViewInstance, InputSettings, ThemeDefinition, devLog, parsePath, buildHeatmapRatingMapping } from '@core/public';
import { dayjs } from '@core/public';
import type { OpenCheckinManagerHandler, OpenHeatmapCreateHandler, ResolveResourcePathHandler } from '../../types/actions';
import { HEATMAP_VIEW_DEFAULT_CONFIG, getItemThemePath } from '@core/public';
import { HeatmapCell } from '../heatmap/HeatmapCell';
import { buildThemeDataMap, buildThemesByPathMap } from '@core/public';
import { RatingMappingCache } from '@core/public';

// ========== Types ==========
interface HeatmapViewProps {
    items: Item[];
    resolveResourcePath?: ResolveResourcePathHandler;
    dateRange: [Date, Date];
    module: ViewInstance;
    currentView: '年' | '季' | '月' | '周' | '天' | '日' | string;
    inputSettings: InputSettings;

    // Phase2: shared/ui 纯化试点（可注入 renderModel）
    injectedThemesByPath?: Map<string, ThemeDefinition>;
    injectedThemesToTrack?: string[];
    injectedDataByThemeAndDate?: Map<string, Map<string, Item[]>>;
    injectedGoalHeatmapGroups?: GoalHeatmapGroup[];
    onOpenHeatmapCreate?: OpenHeatmapCreateHandler;
    onOpenCheckinManager?: OpenCheckinManagerHandler;
    onNotice?: (message: string) => void;
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

interface HeatmapPresetContext {
    sourceBlockId?: string;
    goalId?: string;
    templateId?: string;
    templateVariantId?: string;
    ratingOptions?: Array<{ value?: unknown; label?: unknown }>;
}

interface GoalHeatmapThemeEntry {
    presetKey?: string;
    templateId?: string;
    templateVariantId?: string;
    sourceBlockId?: string;
    goalId?: string;
    ratingOptions?: Array<{ value?: unknown; label?: unknown }>;
    themePath: string;
    label: string;
    count: number;
    dataForTheme: Map<string, Item[]>;
}

interface GoalHeatmapGroup {
    goalPath: string;
    label: string;
    count: number;
    entries: GoalHeatmapThemeEntry[];
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
    resolveResourcePath,
    dateRange,
    module,
    currentView,
    inputSettings,
    injectedThemesByPath,
    injectedThemesToTrack,
    injectedDataByThemeAndDate,
    injectedGoalHeatmapGroups,
    onOpenHeatmapCreate,
    onOpenCheckinManager,
    onNotice,
}: HeatmapViewProps) {

    const config = useMemo(
        () => ({ ...HEATMAP_VIEW_DEFAULT_CONFIG, ...module.viewConfig }),
        [module.viewConfig]
    );

    const normalizedCurrentView = currentView === '日' || currentView === 'day' ? '天' : currentView;
    const isDayView = normalizedCurrentView === '天';

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
            const themePath = getItemThemePath(it);
            if (themePath) {
                set.add(themePath);
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

    const goalGroupsToDisplay = useMemo(() => {
        return (injectedGoalHeatmapGroups || []).filter((group) => group && Array.isArray(group.entries) && group.entries.length > 0);
    }, [injectedGoalHeatmapGroups]);

    const normalizeHeatmapBlockId = (candidate?: string | null): string => {
        const value = String(candidate || '').trim();
        if (!value) return '';
        const byId = inputSettings.blocks.find((block) => block.id === value);
        if (byId) return byId.id;
        const byCore = inputSettings.blocks.find((block) => block.coreBlockId === value);
        if (byCore) return byCore.id;
        const byCategory = inputSettings.blocks.find((block) => block.categoryKey === value || block.name === value);
        if (byCategory) return byCategory.id;
        // 旧数据里常见 sourceBlockId 已经不存在；打卡视图优先回退到 core.habit。
        if (config.sourceBlockId && value === config.sourceBlockId) {
            const habit = inputSettings.blocks.find((block) => block.coreBlockId === 'core.habit' || block.categoryKey === '打卡' || block.name === '打卡');
            if (habit) return habit.id;
        }
        return value;
    };

    const heatmapSourceBlockId = normalizeHeatmapBlockId(config.sourceBlockId);

    const resolveCellRatingMapping = (themePath: string, presetContext?: HeatmapPresetContext): Map<string, string> => {
        if (presetContext?.ratingOptions?.length) {
            return buildHeatmapRatingMapping(presetContext.ratingOptions);
        }
        return ratingMappingsCache.get(
            inputSettings,
            heatmapSourceBlockId || '',
            themePath,
            themesByPath
        );
    };

    const inferredBlockIdByTheme = useMemo(() => {
        const result = new Map<string, string>();
        const counts = new Map<string, Map<string, number>>();

        for (const it of items) {
            const themePath = getItemThemePath(it);
            const themeKey = themePath || '__default__';
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

    const resolveCreateBlockId = (themePath?: string, item?: Item, sourceBlockId?: string) => {
        const rowBlock = normalizeHeatmapBlockId(sourceBlockId);
        const itemBlock = item?.coreBlock || item?.templateId || item?.categoryKey;
        return rowBlock
            || normalizeHeatmapBlockId(heatmapSourceBlockId)
            || normalizeHeatmapBlockId(itemBlock)
            || normalizeHeatmapBlockId(themePath ? inferredBlockIdByTheme.get(themePath) : undefined)
            || normalizeHeatmapBlockId(inferredBlockIdByTheme.get('__default__'))
            || '';
    };

    const openQuickCreate = (date: string, item?: Item, themePath?: string, goalPath?: string, presetContext?: HeatmapPresetContext) => {
        if (!onOpenHeatmapCreate) {
            onNotice?.('未提供创建处理器，无法创建记录');
            return;
        }

        onOpenHeatmapCreate({
            sourceBlockId: resolveCreateBlockId(themePath, item, presetContext?.sourceBlockId),
            date,
            item,
            themePath,
            goalPath,
            goalId: presetContext?.goalId,
            templateId: presetContext?.templateId,
            templateVariantId: presetContext?.templateVariantId,
            themesByPath,
        });
    };

    const openCellRecordManager = (date: string, itemsForDay: Item[], themePath?: string, goalPath?: string, presetContext?: HeatmapPresetContext) => {
        if (!onOpenCheckinManager) {
            onNotice?.('未提供记录管理处理器，无法打开记录列表');
            return;
        }

        onOpenCheckinManager({
            date,
            items: itemsForDay,
            onAddRecord: () => openQuickCreate(date, itemsForDay[itemsForDay.length - 1], themePath, goalPath, presetContext),
        });
    };

    // 单元格点击行为是所有视图共用的唯一交互真源：
    // - 0 条记录：直接进入该日期/主题/目标/预设上下文的创建面板。
    // - >=1 条记录：进入记录管理器，由管理器统一承担选择、打开、删除、新增。
    // 这样天/周/月/季/年不会再出现“一条直接创建、多条才选择”的分叉。
    const handleCellClick = (date: string, dayItems?: Item[], themePath?: string, goalPath?: string, presetContext?: HeatmapPresetContext) => {
        const itemsForDay = dayItems || [];

        if (itemsForDay.length === 0) {
            openQuickCreate(date, undefined, themePath, goalPath, presetContext);
            return;
        }

        openCellRecordManager(date, itemsForDay, themePath, goalPath, presetContext);
    };

    const renderMonthGrid = (
        monthDate: dayjs.Dayjs,
        dataForMonth: Map<string, Item[]>,
        themePath: string,
        goalPath?: string,
        presetContext?: HeatmapPresetContext
    ) => {
        const startOfMonth = monthDate.startOf('month');
        const endOfMonth = monthDate.endOf('month');
        const firstWeekday = startOfMonth.isoWeekday();

        const themeRatingMapping = resolveCellRatingMapping(themePath, presetContext);

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
                    resolveResourcePath={resolveResourcePath}
                    onCellClick={(clickedDate, clickedItems) => handleCellClick(clickedDate, clickedItems, themePath, goalPath, presetContext)}
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
        dataForTheme: Map<string, Item[]>,
        goalPath?: string,
        presetContext?: HeatmapPresetContext
    ) => {
        const start = dayjs(dateRange[0]);
        const end = dayjs(dateRange[1]);

        const themeRatingMapping = resolveCellRatingMapping(themePath, presetContext);

        switch (currentView) {
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
                        onCellClick={(clickedDate, clickedItems) => handleCellClick(clickedDate, clickedItems, themePath, goalPath, presetContext)}
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
                            resolveResourcePath={resolveResourcePath}
                            onCellClick={(clickedDate, clickedItems) => handleCellClick(clickedDate, clickedItems, themePath, goalPath, presetContext)}
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
                            resolveResourcePath={resolveResourcePath}
                            onCellClick={(clickedDate, clickedItems) => handleCellClick(clickedDate, clickedItems, themePath, goalPath, presetContext)}
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
                    months.push(renderMonthGrid(currentMonth, dataForTheme, themePath, goalPath, presetContext));
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

        const isGridLayout = ['年', '季'].includes(normalizedCurrentView);
        if (isGridLayout || normalizedCurrentView === '周') return;

        const containerWidth = headerElement.clientWidth;
        const threshold = isDayView ? 320 : 600;
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
    }, [themesToTrack, normalizedCurrentView]);

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
    // - 目标为第一层
    // - 主题为目标下的多个打卡表单/预设来源
    const renderDayContent = () => {
        const dayDateStr = dayjs(dateRange[0]).format('YYYY-MM-DD');

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
                                    const presetContext: HeatmapPresetContext = { sourceBlockId: entry.sourceBlockId, goalId: entry.goalId, templateId: entry.templateId, templateVariantId: entry.templateVariantId, ratingOptions: entry.ratingOptions };
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
                                                onCellClick={(clickedDate, clickedItems) => handleCellClick(clickedDate, clickedItems, entry.themePath, goalGroup.goalPath, presetContext)}
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

        const dayGroups = buildDayThemeGroups();

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

    const renderThemeGroup = (params: {
        theme: string;
        dataForTheme: Map<string, Item[]>;
        goalPath?: string;
        keyPrefix?: string;
        entryKey?: string;
        label?: string;
        presetContext?: HeatmapPresetContext;
    }) => {
        const { theme, dataForTheme, goalPath, keyPrefix = '', entryKey, label, presetContext } = params;
        const rowKey = `${keyPrefix}${entryKey || theme}`;
        const isRowLayout = ['周', '月'].includes(normalizedCurrentView);
        const isVertical = normalizedCurrentView === '周' ? false : verticalLayouts.has(rowKey);
        const isCollapsed = normalizedCurrentView === '年' && collapsedThemes.has(rowKey);
        const leafLabel = label || getThemeLeafLabel(theme);

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
                                if (normalizedCurrentView === '年') toggleThemeCollapsed(rowKey);
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
                            {renderHeaderCells(normalizedCurrentView, theme, dataForTheme, goalPath, presetContext)}
                        </div>
                    )}
                </div>
            </div>
        );
    };

    const renderContent = () => {
        if (isDayView) {
            return renderDayContent();
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
                                    presetContext: { sourceBlockId: entry.sourceBlockId, goalId: entry.goalId, templateId: entry.templateId, templateVariantId: entry.templateVariantId, ratingOptions: entry.ratingOptions },
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
                {themesToDisplay.map((theme) => {
                    const dataForTheme = dataByThemeAndDate.get(theme) || new Map();
                    return renderThemeGroup({ theme, dataForTheme });
                })}
            </div>
        );
    };

    return <div class="heatmap-container">{renderContent()}</div>;
}
