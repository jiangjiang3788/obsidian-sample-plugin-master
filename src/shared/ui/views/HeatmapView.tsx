// src/features/dashboard/ui/HeatmapView.tsx

/** @jsxImportSource preact */
import { useMemo, useState, useRef, useEffect } from 'preact/hooks';
import { Item, ViewInstance, InputSettings, ThemeDefinition, devLog, getEffectiveDisplayCount } from '@core/public';
import { dayjs } from '@core/public';
import { QuickInputModal } from '@/app/public';
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
    // 将 config 对象移入 useMemo，确保响应式更新
    const config = useMemo(
        () => ({ ...HEATMAP_VIEW_DEFAULT_CONFIG, ...module.viewConfig }), 
        [module.viewConfig]
    );
    
    const themesByPath = useMemo(() => {
        return injectedThemesByPath ?? buildThemesByPathMap(inputSettings.themes);
    }, [injectedThemesByPath, inputSettings.themes]);

    // 评分映射缓存
    const ratingMappingsCache = useRef(new RatingMappingCache()).current;
    
    // 当设置发生变化时，清空相关缓存
    useEffect(() => {
        ratingMappingsCache.clear();
    }, [inputSettings.themes, inputSettings.blocks, inputSettings.overrides]);

    // 当items数据发生变化时，确保重新计算数据聚合
    useEffect(() => {
        devLog(`🔄 [数据更新] 检测到items数据变化，项目数量: ${items.length}`);
        ratingMappingsCache.clear();
    }, [items]);

    // 当 viewConfig 未显式指定 themePaths 时：
    // - 自动从当前 items 推断主题列表，避免落到 '__default__' 把不同主题混在同一张热力图里
    const inferredThemePaths = useMemo(() => {
        // 如果上层已经注入 themesToTrack，则无需在 shared/ui 再做推断
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

    // 使用新的聚合函数（用推断/配置后的 themesToTrack）
    const dataByThemeAndDate = useMemo(() => {
        return injectedDataByThemeAndDate ?? buildThemeDataMap(items, themesToTrack);
    }, [injectedDataByThemeAndDate, items, themesToTrack]);

    const openQuickCreate = (date: string, item?: Item, themePath?: string) => {
        if (!config.sourceBlockId) return;

        let themeToPreselect: ThemeDefinition | undefined;
        if (themePath && themePath !== '__default__') themeToPreselect = themesByPath.get(themePath);
        else if (item?.theme) themeToPreselect = themesByPath.get(item.theme);

        const context = {
            '日期': date,
            ...(item ? { '内容': item.content || '', '评分': item.rating ?? 0 } : {}),
            ...(themeToPreselect ? { '主题': themeToPreselect.path } : {}),
        };

        new QuickInputModal(app, config.sourceBlockId, context, themeToPreselect?.id).open();
    };

    const handleCellClick = (date: string, dayItems?: Item[], themePath?: string) => {
        const itemsForDay = dayItems || [];
        if (itemsForDay.length === 0) {
            openQuickCreate(date, undefined, themePath);
            return;
        }
        new CheckinManagerModal(app, date, itemsForDay, async () => {}, () => openQuickCreate(date, itemsForDay[itemsForDay.length - 1], themePath)).open();
    };

    const renderMonthGrid = (monthDate: dayjs.Dayjs, dataForMonth: Map<string, Item[]>, themePath: string) => {
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
                    onCellClick={(date, dayItems) => handleCellClick(date, dayItems, themePath)}
                />
            );
        }
        return (
            <div key={monthDate.format('YYYY-MM')} class="month-section">
                <div class="month-label">
                    {monthDate.format('M月')}
                </div>
                <div class="heatmap-row calendar">
                    {days}
                </div>
            </div>
        );
    };

    const renderHeaderCells = (currentView: string, themePath: string, dataForTheme: Map<string, Item[]>) => {
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
                        onCellClick={(date, dayItems) => handleCellClick(date, dayItems, themePath)}
                    />
                ];
            }
            case '周': {
                const cells = [];
                let currentDate = start.startOf('isoWeek');
                const endDate = start.endOf('isoWeek');
                while(currentDate.isSameOrBefore(endDate, 'day')) {
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
                            onCellClick={(date, dayItems) => handleCellClick(date, dayItems, themePath)}
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
                while(currentDate.isSameOrBefore(endDate, 'day')) {
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
                            onCellClick={(date, dayItems) => handleCellClick(date, dayItems, themePath)}
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

    // 响应式布局检测
    const [verticalLayouts, setVerticalLayouts] = useState<Set<string>>(new Set());
    const headerRefs = useRef<Map<string, HTMLElement>>(new Map());

    // 检测是否需要垂直布局（仅用于天、周、月视图）
    const checkLayout = (theme: string, headerElement: HTMLElement) => {
        if (!headerElement || theme === '__default__') return;
        
        // 年、季度视图现在通过 CSS 强制垂直布局，不需要 JavaScript 处理
        const isGridLayout = ['年', '季'].includes(currentView);
        if (isGridLayout) return;
        
        // 其他视图根据容器宽度决定
        const containerWidth = headerElement.clientWidth;
        const threshold = currentView === '天' ? 320 : 600;
        const needsVertical = containerWidth < threshold;
        
        setVerticalLayouts(prev => {
            const newSet = new Set(prev);
            if (needsVertical) {
                newSet.add(theme);
            } else {
                newSet.delete(theme);
            }
            return newSet;
        });
    };

    // 使用ResizeObserver监听容器大小变化
    useEffect(() => {
        const resizeObserver = new ResizeObserver(entries => {
            entries.forEach(entry => {
                const element = entry.target as HTMLElement;
                const theme = element.dataset.theme;
                if (theme) {
                    checkLayout(theme, element);
                }
            });
        });

        // 监听所有主题头部容器
        headerRefs.current.forEach((element, theme) => {
            resizeObserver.observe(element);
            // 初始检测
            checkLayout(theme, element);
        });

        return () => {
            resizeObserver.disconnect();
        };
    }, [themesToTrack, currentView]);

    const renderContent = () => {
        const themesToDisplay = themesToTrack.length > 0 ? themesToTrack : ['__default__'];
        const isDayGridLayout = currentView === '天';
        const isRowLayout = ['周', '月'].includes(currentView);
        const dayDateStr = isDayGridLayout ? dayjs(dateRange[0]).format('YYYY-MM-DD') : '';
        const wrapperClass = isDayGridLayout
            ? 'layout-day-grid'
            : (isRowLayout ? 'layout-row' : 'layout-grid');

        return (
            <div class={`heatmap-view-wrapper ${wrapperClass}`}>
                {themesToDisplay.map((theme) => {
                    const dataForTheme = dataByThemeAndDate.get(theme) || new Map();
                    const isVertical = verticalLayouts.has(theme);
                    const todayItems = isDayGridLayout ? (dataForTheme.get(dayDateStr) || []) : [];
                    const todayCount = todayItems.reduce((sum, item) => sum + getEffectiveDisplayCount(item), 0);
                    const hasTodayData = todayCount > 0;

                    return (
                        <div class={`heatmap-theme-group ${isDayGridLayout ? 'compact-theme-group' : ''}`} key={theme}>
                            <div 
                                class={`heatmap-theme-header ${isVertical ? 'vertical-layout' : ''} ${isDayGridLayout ? 'compact-theme-header day-table-theme-header' : ''}`}
                                data-theme={theme}
                                ref={(el) => {
                                    if (el && theme !== '__default__') {
                                        headerRefs.current.set(theme, el);
                                    }
                                }}
                            >
                                {theme !== '__default__' && (
                                    <div class={`heatmap-header-info ${isDayGridLayout ? 'compact-day-header-info' : ''}`}>
                                        <div class={`heatmap-header-info-left ${isDayGridLayout ? 'compact-day-info-left' : ''}`}>
                                            <span class="theme-name">
                                                {theme}
                                            </span>
                                            {isDayGridLayout && (
                                                <span class={`day-checkin-badge ${hasTodayData ? 'has-data' : 'empty'}`}>
                                                    {hasTodayData ? `${todayCount} 次` : '未打卡'}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                )}
                                <div class={`heatmap-header-cells ${isRowLayout ? '' : 'grid-view'} ${isDayGridLayout ? 'compact-day-cells day-single-cell' : ''}`}>
                                    {renderHeaderCells(currentView, theme, dataForTheme)}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    };

    return <div class="heatmap-container">{renderContent()}</div>;
}
