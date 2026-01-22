// src/features/dashboard/ui/HeatmapView.tsx

/** @jsxImportSource preact */
import { useMemo, useState, useRef, useEffect } from 'preact/hooks';
import { App, Notice } from 'obsidian';
import { Item, ViewInstance, InputSettings, ThemeDefinition } from '@core/public';
import { dayjs } from '@core/public';
import { QuickInputModal } from '@shared/ui/modals/QuickInputModal';
import { HEATMAP_VIEW_DEFAULT_CONFIG } from '@core/public';
import { getThemeLevelData } from '@core/public';
import { CheckinManagerModal } from '@shared/ui/modals/CheckinManagerModal';
import { HeatmapCell } from '@shared/ui/heatmap/HeatmapCell';
import { buildThemeDataMap, buildThemesByPathMap, getThemeItems } from '@core/public';
import { RatingMappingCache } from '@core/public';

// ========== Types ==========
interface HeatmapViewProps {
    items: Item[];
    app: App;
    dateRange: [Date, Date];
    module: ViewInstance;
    currentView: '年' | '季' | '月' | '周' | '天';
    inputSettings: InputSettings;
}

// ========== Main View Component ==========
export function HeatmapView({ items, app, dateRange, module, currentView, inputSettings }: HeatmapViewProps) {
    // 将 config 对象移入 useMemo，确保响应式更新
    const config = useMemo(
        () => ({ ...HEATMAP_VIEW_DEFAULT_CONFIG, ...module.viewConfig }), 
        [module.viewConfig]
    );
    
    const themesByPath = useMemo(() => {
        return buildThemesByPathMap(inputSettings.themes);
    }, [inputSettings.themes]);

    // 评分映射缓存
    const ratingMappingsCache = useRef(new RatingMappingCache()).current;
    
    // 当设置发生变化时，清空相关缓存
    useEffect(() => {
        ratingMappingsCache.clear();
    }, [inputSettings.themes, inputSettings.blocks, inputSettings.overrides]);

    // 当items数据发生变化时，确保重新计算数据聚合
    useEffect(() => {
        console.log(`🔄 [数据更新] 检测到items数据变化，项目数量: ${items.length}`);
        ratingMappingsCache.clear();
    }, [items]);

    // 使用新的聚合函数
    const dataByThemeAndDate = useMemo(() => {
        return buildThemeDataMap(items, config.themePaths || []);
    }, [items, config.themePaths]);

    const handleCellClick = (date: string, item?: Item, themePath?: string) => {
        if (!config.sourceBlockId) return;
        
        let themeToPreselect: ThemeDefinition | undefined;

        // 优先使用传入的themePath，否则使用item.theme
        if (themePath && themePath !== '__default__') {
            themeToPreselect = themesByPath.get(themePath);
        } else if (item?.theme) {
            themeToPreselect = themesByPath.get(item.theme);
        }
        
        const context = {
            '日期': date,
            ...(item ? { '内容': item.content || '', '评分': item.rating ?? 0 } : {}),
            ...(themeToPreselect ? { '主题': themeToPreselect.path } : {})
        };
        
        new QuickInputModal(app, config.sourceBlockId, context, themeToPreselect?.id).open();
    };

    const handleEditCount = (date: string, items?: Item[]) => {
        const handleSave = async (data: { displayCount: number; levelCount: number; countForLevel: boolean }) => {
            try {
                // TODO: 实现实际的数据更新逻辑
                new Notice(`已更新 ${date} 的打卡数据`);
            } catch (error) {
                new Notice('保存失败：' + (error as Error).message);
                throw error;
            }
        };

        new CheckinManagerModal(app, date, items || [], handleSave).open();
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
                    onCellClick={(date, item) => handleCellClick(date, item, themePath)}
                    onEditCount={handleEditCount}
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
                        onCellClick={(date, item) => handleCellClick(date, item, themePath)}
                        onEditCount={handleEditCount}
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
                            onCellClick={(date, item) => handleCellClick(date, item, themePath)}
                            onEditCount={handleEditCount}
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
                            onCellClick={(date, item) => handleCellClick(date, item, themePath)}
                            onEditCount={handleEditCount}
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
    // 折叠状态管理
    const [collapsedThemes, setCollapsedThemes] = useState<Set<string>>(new Set());
    const headerRefs = useRef<Map<string, HTMLElement>>(new Map());

    // 切换主题折叠状态
    const toggleThemeCollapse = (theme: string) => {
        setCollapsedThemes(prev => {
            const newSet = new Set(prev);
            if (newSet.has(theme)) {
                newSet.delete(theme);
            } else {
                newSet.add(theme);
            }
            return newSet;
        });
    };

    // 检测是否需要垂直布局（仅用于天、周、月视图）
    const checkLayout = (theme: string, headerElement: HTMLElement) => {
        if (!headerElement || theme === '__default__') return;
        
        // 年、季度视图现在通过 CSS 强制垂直布局，不需要 JavaScript 处理
        const isGridLayout = ['年', '季'].includes(currentView);
        if (isGridLayout) return;
        
        // 其他视图根据容器宽度决定
        const containerWidth = headerElement.clientWidth;
        const threshold = 600; // 当容器宽度小于600px时切换为垂直布局
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
    }, [config.themePaths]);

    const renderContent = () => {
        const themesToDisplay = config.themePaths && config.themePaths.length > 0 
            ? config.themePaths 
            : ['__default__'];
        const isRowLayout = ['天', '周', '月'].includes(currentView);

        return (
            <div class={`heatmap-view-wrapper ${isRowLayout ? 'layout-row' : 'layout-grid'}`}>
                {themesToDisplay.map((theme) => {
                    const dataForTheme = dataByThemeAndDate.get(theme)!;
                    
                    // 计算该主题的等级数据
                    const themeItems = getThemeItems(dataByThemeAndDate, theme);
                    const levelData = config.enableLeveling && theme !== '__default__' ? getThemeLevelData(themeItems) : null;
                    
                    const isVertical = verticalLayouts.has(theme);
                    const isCollapsed = collapsedThemes.has(theme);
                    
                    return (
                        <div class="heatmap-theme-group" key={theme}>
                            <div 
                                class={`heatmap-theme-header ${isVertical ? 'vertical-layout' : ''}`}
                                data-theme={theme}
                                ref={(el) => {
                                    if (el && theme !== '__default__') {
                                        headerRefs.current.set(theme, el);
                                    }
                                }}
                            >
                                {/* 第一行：等级信息和进度条 */}
                                {theme !== '__default__' && (
                                    <div 
                                        class="heatmap-header-info"
                                        onClick={() => toggleThemeCollapse(theme)}
                                        title="点击折叠/展开"
                                    >
                                        {/* 左侧：等级信息和主题名称 */}
                                        <div class="heatmap-header-info-left">
                                            <span class="heatmap-toggle-icon" style={{ 
                                                display: 'inline-block', 
                                                width: '16px', 
                                                textAlign: 'center',
                                                transform: isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)',
                                                transition: 'transform 0.2s ease',
                                                marginRight: '4px',
                                                color: 'var(--text-muted)'
                                            }}>
                                                ▼
                                            </span>
                                            {levelData && (
                                                <>
                                                    <span class="level-icon">
                                                        {levelData.config.icon}
                                                    </span>
                                                    <span class="level-text">
                                                        Lv.{levelData.level}
                                                    </span>
                                                </>
                                            )}
                                            <span class="theme-name">
                                                {theme}
                                            </span>
                                        </div>

                                        {/* 右侧：进度条 */}
                                        {levelData && config.showLevelProgress && levelData.nextConfig && (
                                            <div class="heatmap-header-info-right">
                                                <div class="progress-bar-container"
                                                title={`当前进度: ${levelData.totalChecks}${levelData.nextRequirement ? ` / ${levelData.nextRequirement}` : ''} 
下一等级: ${levelData.nextConfig.title}
距离升级还需: ${levelData.nextRequirement ? Math.max(0, levelData.nextRequirement - levelData.totalChecks) : 0} 次打卡`}
                                                >
                                                    <div class="progress-bar" style={{ width: `${levelData.progress * 100}%`, backgroundColor: levelData.config.color }} />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                                
                                {/* 第二行：HeatmapCell展示区域 */}
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
