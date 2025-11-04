// src/features/dashboard/ui/HeatmapView.tsx

/** @jsxImportSource preact */
import { useMemo, useState, useRef, useEffect } from 'preact/hooks';
import { App, Notice } from 'obsidian';
import { Item, ViewInstance, BlockTemplate, InputSettings, ThemeDefinition } from '../../../lib/types/domain/schema';
import { dayjs } from '../../../lib/utils/core/date';
import { useStore } from '../../../store/AppStore';
import { QuickInputModal } from '../../QuickInput/ui/QuickInputModal';
import { DEFAULT_CONFIG } from '../../Settings/ui/components/view-editors/HeatmapViewEditor';
import { getThemeLevelData, getEffectiveDisplayCount, getEffectiveLevelCount, type LevelResult } from '../../../lib/utils/core/levelingSystem';
import { CheckinManagerModal } from './CheckinManagerModal';

// ========== Types ==========
interface HeatmapViewProps {
    items: Item[];
    app: App;
    dateRange: [Date, Date];
    module: ViewInstance;
    currentView: '年' | '季' | '月' | '周' | '天';
}

// [修改] item 变为 items 数组
interface HeatmapCellProps {
    date: string;
    items?: Item[]; // 改为 items 数组
    count?: number;
    config: typeof DEFAULT_CONFIG;
    app: App;
    onCellClick: (date: string, item?: Item) => void;
    onEditCount?: (date: string, items?: Item[]) => void; // 改为 items 数组
    ratingMapping: Map<string, string>;
}

// ========== Helper Functions ==========
function getEffectiveTemplate(settings: InputSettings, blockId: string, themeId?: string): BlockTemplate | null {
    const baseBlock = settings.blocks.find(b => b.id === blockId);
    if (!baseBlock) return null;
    if (themeId) {
        const override = settings.overrides.find(o => o.blockId === blockId && o.themeId === themeId);
        // [修复] ThemeOverride使用disabled字段，不是status
        if (override && !override.disabled) {
            return { ...baseBlock, fields: override.fields ?? baseBlock.fields, outputTemplate: override.outputTemplate ?? baseBlock.outputTemplate, targetFile: override.targetFile ?? baseBlock.targetFile, appendUnderHeader: override.appendUnderHeader ?? baseBlock.appendUnderHeader };
        }
    }
    return baseBlock;
}

const isImagePath = (value: string) => /\.(png|svg|jpg|jpeg|gif)$/i.test(value);
const isHexColor = (value: string) => /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(value);


// ========== Sub-Components ==========
function HeatmapCell({ date, items, count, config, ratingMapping, app, onCellClick, onEditCount }: HeatmapCellProps) {
    const today = dayjs().format('YYYY-MM-DD');
    const isToday = date === today;
    
    let cellContent: any = '';
    let cellStyle: any = {};
    let title = `${date}\n无记录`;

    let visualValue: string | null = null;
    
    // [修改] 从 items 数组中获取信息
    const item = items && items.length > 0 ? items[items.length - 1] : undefined;

    if (config.displayMode === 'habit' && item && items) {
        // [修改] 聚合 displayCount 和 levelCount
        const displayCount = items.reduce((sum, i) => sum + getEffectiveDisplayCount(i), 0);
        const levelCount = items.reduce((sum, i) => sum + getEffectiveLevelCount(i), 0);
        const wasEdited = items.some(i => i.manuallyEdited);
        
        // 优先显示最新的评分/图片系统
        const latestItemWithValue = [...items].reverse().find(i => i.pintu || i.rating !== undefined);
        if (latestItemWithValue) {
            if (latestItemWithValue.pintu) {
                visualValue = latestItemWithValue.pintu;
            } else if (latestItemWithValue.rating !== undefined) {
                visualValue = ratingMapping.get(String(latestItemWithValue.rating)) || null;
            }
        }

        if (visualValue) {
            if (isHexColor(visualValue)) {
                cellStyle.backgroundColor = visualValue;
                // 如果有多次打卡，在颜色上叠加次数标记
                if (displayCount > 1) {
                    cellContent = (
                        <div class="cell-with-count">
                            <span class="check-count-overlay" style={{
                                fontSize: '10px',
                                fontWeight: 'bold',
                                color: 'var(--text-on-accent)',
                                backgroundColor: 'rgba(0,0,0,0.2)',
                                borderRadius: '8px',
                                padding: '1px 4px',
                                position: 'absolute',
                                top: '2px',
                                right: '2px',
                                lineHeight: '1'
                            }}>{displayCount}</span>
                        </div>
                    );
                }
            } else if (isImagePath(visualValue)) {
                const imageUrl = app.vault.adapter.getResourcePath(visualValue);
                cellContent = (
                    <div class="cell-with-image">
                        <img src={imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        {displayCount > 1 && (
                            <span class="check-count-overlay" style={{
                                fontSize: '10px',
                                fontWeight: 'bold',
                                color: 'var(--text-on-accent)',
                                backgroundColor: 'rgba(0,0,0,0.2)',
                                borderRadius: '8px',
                                padding: '1px 4px',
                                position: 'absolute',
                                top: '2px',
                                right: '2px',
                                lineHeight: '1'
                            }}>{displayCount}</span>
                        )}
                    </div>
                );
            } else {
                cellContent = (
                    <div class="cell-with-text">
                        <span class="visual-content">{visualValue}</span>
                        {displayCount > 1 && (
                            <span class="check-count-overlay" style={{
                                fontSize: '10px',
                                fontWeight: 'bold',
                                color: 'var(--text-on-accent)',
                                backgroundColor: 'rgba(0,0,0,0.2)',
                                borderRadius: '8px',
                                padding: '1px 4px',
                                position: 'absolute',
                                top: '2px',
                                right: '2px',
                                lineHeight: '1'
                            }}>{displayCount}</span>
                        )}
                    </div>
                );
            }
        } else {
            // 没有评分/图片时，显示纯次数
            if (displayCount > 0) {
                cellContent = (
                    <span class="pure-count" style={{
                        fontSize: displayCount > 99 ? '8px' : displayCount > 9 ? '10px' : '12px',
                        fontWeight: 'bold',
                        color: 'var(--text-on-accent)',
                        textShadow: '1px 1px 1px rgba(0,0,0,0.3)'
                    }}>
                        {displayCount > 999 ? '999+' : displayCount}
                    </span>
                );
                
                // 根据次数设置背景色强度
                const intensity = Math.min(displayCount / 10, 1);
                cellStyle.backgroundColor = `rgba(100, 200, 100, ${0.3 + intensity * 0.5})`;
            }
        }
        
        // 构建详细的提示信息
        title = [
            `📅 ${date}`,
            `👆 打卡次数: ${displayCount}`,
            levelCount !== displayCount ? `🏆 等级次数: ${levelCount}` : '',
            wasEdited ? `✏️ 包含手动编辑` : '',
            item.rating !== undefined ? `⭐ 最后评分: ${item.rating}` : '',
            item.content ? `💭 最后内容: ${item.content}` : '',
            '',
            '💡 左键点击新增打卡',
            '💡 右键查看详情或编辑'
        ].filter(Boolean).join('\n');

    } else if (config.displayMode === 'count' && (count || 0) > 0) {
        const colorIndex = Math.min(count!, config.countColors.length - 1);
        cellStyle.backgroundColor = config.countColors[colorIndex];
        
        if (count! > 1) {
            cellContent = (
                <span class="count-number" style={{
                    fontSize: count! > 99 ? '8px' : count! > 9 ? '10px' : '12px',
                    fontWeight: 'bold',
                    color: 'white',
                    textShadow: '1px 1px 1px rgba(0,0,0,0.5)'
                }}>
                    {count! > 999 ? '999+' : count}
                </span>
            );
        }
        
        title = `${date}\n打卡次数: ${count}`;
    }

    // 空状态处理
    if (!visualValue && !(config.displayMode === 'count' && count! > 0) && (!items || items.length === 0)) {
        const emptyColor = config.displayMode === 'count' ? config.countColors[0] : '#E5DDEE';
        cellStyle.backgroundColor = emptyColor;
        cellStyle.opacity = 0.3;
    }

    // 今日特殊标记 - 使用更subtle的方式
    if (isToday) {
        cellStyle.boxShadow = '0 0 0 1px var(--interactive-accent)';
        cellStyle.opacity = 1; // 确保今日不透明
    }

    return (
        <div 
            class={`heatmap-cell ${isToday ? 'current-day' : ''} ${item ? 'has-data' : 'empty'}`}
            style={{
                position: 'relative',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                ...cellStyle
            }}
            title={title}
            onClick={() => onCellClick(date, item)}
            onContextMenu={(e) => {
                e.preventDefault();
                // [修改] 右键打开详情/编辑
                if (onEditCount) {
                    onEditCount(date, items);
                }
            }}
            onMouseEnter={(e) => {
                // 悬停效果
                (e.target as HTMLElement).style.transform = 'scale(1.05)';
                (e.target as HTMLElement).style.zIndex = '10';
            }}
            onMouseLeave={(e) => {
                (e.target as HTMLElement).style.transform = 'scale(1)';
                (e.target as HTMLElement).style.zIndex = '1';
            }}
        >
            {/* 主要内容 */}
            <div class="heatmap-cell-content" style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative'
            }}>
                {cellContent}
            </div>
        </div>
    );
}

// ========== Main View Component ==========
export function HeatmapView({ items, app, dateRange, module, currentView }: HeatmapViewProps) {
    const settings = useStore(state => state.settings);
    
    // 移除不需要的模态框状态，直接使用Modal实例
    
    // [修复] 将 config 对象移入 useMemo，确保响应式更新
    const config = useMemo(
        () => ({ ...DEFAULT_CONFIG, ...module.viewConfig }), 
        [module.viewConfig]
    );
    
    const themesByPath = useMemo(() => {
        const map = new Map<string, ThemeDefinition>();
        settings.inputSettings.themes.forEach(t => map.set(t.path, t));
        return map;
    }, [settings.inputSettings.themes]);

    // [修复] 添加正确的依赖项，当配置变化时清空缓存
    const ratingMappingsCache = useMemo(
        () => new Map<string, Map<string, string>>(), 
        [settings.inputSettings.themes, settings.inputSettings.blocks, settings.inputSettings.overrides]
    );

    const getMappingForItem = (item?: Item): Map<string, string> => {
        const blockId = config.sourceBlockId;
        if (!blockId) return new Map();
        
        // [修复] 直接使用 item.theme 字段，而不是从 tags 中查找
        const themePath = item?.theme;
        const themeId = themePath ? themesByPath.get(themePath)?.id : undefined;
        const cacheKey = `${blockId}:${themeId || 'default'}`;
        
        if (ratingMappingsCache.has(cacheKey)) {
            return ratingMappingsCache.get(cacheKey)!;
        }
        
        const effectiveTemplate = getEffectiveTemplate(settings.inputSettings, blockId, themeId);
        const ratingField = effectiveTemplate?.fields.find(f => f.type === 'rating');
        const newMapping = new Map<string, string>(
            ratingField?.options?.filter(opt => opt.value).map(opt => [opt.label || '', opt.value as string]) || []
        );
        ratingMappingsCache.set(cacheKey, newMapping);
        return newMapping;
    };
    
    const dataByThemeAndDate = useMemo(() => {
        const themeMap = new Map<string, Map<string, Item[]>>();
        
        const themesToTrack = config.displayMode === 'habit' && config.themePaths && config.themePaths.length > 0 
            ? config.themePaths 
            : ['__default__'];
        
        themesToTrack.forEach(theme => themeMap.set(theme, new Map()));

        if (config.displayMode === 'count') {
            // count 模式逻辑不变，但为了统一返回类型，我们将 count 存在 Item[] 的一个伪字段里
            const countDataMap = new Map<string, number>();
            items.forEach(item => {
                if (item.date) {
                    const currentCount = countDataMap.get(item.date) || 0;
                    const itemDisplayCount = getEffectiveDisplayCount(item);
                    countDataMap.set(item.date, currentCount + itemDisplayCount);
                }
            });
            const defaultMap = themeMap.get('__default__')!;
            countDataMap.forEach((count, date) => {
                // @ts-ignore - 伪造一个Item来存储count
                defaultMap.set(date, [{ displayCount: count }] as Item[]);
            });

        } else {
            // [修改] 聚合逻辑：保留原始 items 数组
            items.forEach(item => {
                if (!item.date) return;
                
                const processItem = (themeKey: string) => {
                    const targetThemeMap = themeMap.get(themeKey);
                    if (targetThemeMap) {
                        const existingItems = targetThemeMap.get(item.date) || [];
                        targetThemeMap.set(item.date, [...existingItems, item]);
                    }
                };

                if (themesToTrack.length > 1 && themesToTrack[0] !== '__default__') {
                    if (item.theme && themesToTrack.includes(item.theme)) {
                        processItem(item.theme);
                    }
                } else {
                    processItem('__default__');
                }
            });
        }
        
        return themeMap;
    }, [items, config.displayMode, config.themePaths]);

    const handleCellClick = (date: string, item?: Item, themePath?: string) => {
        if (config.displayMode !== 'habit' || !config.sourceBlockId) return;
        
        let themeToPreselect: ThemeDefinition | undefined;

        // [修复] 优先使用传入的themePath，否则使用item.theme
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
                // 这个逻辑需要连接到你的状态管理（如Zustand store）来持久化数据
                new Notice(`已更新 ${date} 的打卡数据`);
            } catch (error) {
                new Notice('保存失败：' + (error as Error).message);
                throw error; // 重新抛出错误，让模态框处理
            }
        };

        new CheckinManagerModal(
            app,
            date,
            items || [],
            handleSave
        ).open();
    };

    const renderMonthGrid = (monthDate: dayjs.Dayjs, dataForMonth: Map<string, Item[]>, themePath: string) => {
        const startOfMonth = monthDate.startOf('month');
        const endOfMonth = monthDate.endOf('month');
        const firstWeekday = startOfMonth.isoWeekday();
        // [修复] 使用 themePath 作为 cacheKey 的一部分，而不是 themeId
        // 这样即使 theme 定义缺失，每个 themePath 也有独立的映射
        const themeId = themePath !== '__default__' ? themesByPath.get(themePath)?.id : undefined;
        const cacheKey = `${config.sourceBlockId}:${themePath}`;
        
        const themRatingMapping = ratingMappingsCache.get(cacheKey) || (() => {
            const effectiveTemplate = getEffectiveTemplate(settings.inputSettings, config.sourceBlockId || '', themeId);
            const ratingField = effectiveTemplate?.fields.find(f => f.type === 'rating');
            const newMapping = new Map<string, string>(
                ratingField?.options?.filter(opt => opt.value).map(opt => [opt.label || '', opt.value as string]) || []
            );
            ratingMappingsCache.set(cacheKey, newMapping);
            return newMapping;
        })();
        
        const days = [];
        for (let i = 1; i < firstWeekday; i++) { days.push(<div class="heatmap-cell empty"></div>); }
        for (let i = 1; i <= endOfMonth.date(); i++) {
            const dateStr = startOfMonth.clone().date(i).format('YYYY-MM-DD');
            const dayItems = dataForMonth.get(dateStr);
            days.push(
                <HeatmapCell 
                    key={dateStr} 
                    date={dateStr} 
                    items={dayItems} 
                    config={config} 
                    ratingMapping={themRatingMapping} 
                    app={app} 
                    onCellClick={(date, item) => handleCellClick(date, item, themePath)}
                    onEditCount={handleEditCount}
                />
            );
        }
        return (
            <div class="month-section" style={{ marginBottom: '12px' }}>
                <div class="month-label" style={{ 
                    fontSize: '12px', 
                    marginBottom: '4px', 
                    color: 'var(--text-muted)',
                    textAlign: 'center'
                }}>
                    {monthDate.format('YYYY年M月')}
                </div>
                <div class="heatmap-row calendar" style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(7, var(--heatmap-cell-size))',
                    gap: '3px'
                }}>
                    {days}
                </div>
            </div>
        );
    };

    const renderHeaderCells = (currentView: string, themePath: string, dataForTheme: Map<string, Item[]>) => {
        const start = dayjs(dateRange[0]);
        const end = dayjs(dateRange[1]);
        
        // [修复] 使用 themePath 作为 cacheKey 的一部分，而不是 themeId
        const themeId = themePath !== '__default__' ? themesByPath.get(themePath)?.id : undefined;
        const cacheKey = `${config.sourceBlockId}:${themePath}`;
        
        const themeRatingMapping = ratingMappingsCache.get(cacheKey) || (() => {
            const effectiveTemplate = getEffectiveTemplate(settings.inputSettings, config.sourceBlockId || '', themeId);
            const ratingField = effectiveTemplate?.fields.find(f => f.type === 'rating');
            const newMapping = new Map<string, string>(
                ratingField?.options?.filter(opt => opt.value).map(opt => [opt.label || '', opt.value as string]) || []
            );
            ratingMappingsCache.set(cacheKey, newMapping);
            return newMapping;
        })();
        
        switch (currentView) {
            case '天': {
                const dateStr = start.format('YYYY-MM-DD');
                const dayItems = dataForTheme.get(dateStr);
                const count = config.displayMode === 'count' && dayItems && dayItems.length > 0 ? dayItems[0].displayCount : undefined;
                return [
                    <HeatmapCell 
                        key={dateStr} 
                        date={dateStr} 
                        items={config.displayMode === 'habit' ? dayItems : undefined}
                        count={count}
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
                    const count = config.displayMode === 'count' && dayItems && dayItems.length > 0 ? dayItems[0].displayCount : undefined;
                    cells.push(
                        <HeatmapCell 
                            key={dateStr} 
                            date={dateStr} 
                            items={config.displayMode === 'habit' ? dayItems : undefined}
                            count={count}
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
                    const count = config.displayMode === 'count' && dayItems && dayItems.length > 0 ? dayItems[0].displayCount : undefined;
                    cells.push(
                        <HeatmapCell 
                            key={dateStr} 
                            date={dateStr} 
                            items={config.displayMode === 'habit' ? dayItems : undefined}
                            count={count}
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
                // 对于年视图和季视图，返回月份日历网格
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

    // 检测是否需要垂直布局
    const checkLayout = (theme: string, headerElement: HTMLElement) => {
        if (!headerElement || theme === '__default__') return;
        
        // 季度和年视图总是使用垂直布局
        const isGridLayout = ['年', '季'].includes(currentView);
        
        let needsVertical = false;
        
        if (isGridLayout) {
            // 季度和年视图强制垂直布局
            needsVertical = true;
        } else {
            // 其他视图根据容器宽度决定
            const containerWidth = headerElement.clientWidth;
            const threshold = 600; // 当容器宽度小于600px时切换为垂直布局
            needsVertical = containerWidth < threshold;
        }
        
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
        const start = dayjs(dateRange[0]);
        const end = dayjs(dateRange[1]);
        // [修复] 使用 config.themePaths 的顺序而不是 Map.keys() 的顺序，确保主题行顺序稳定
        const themesToDisplay = config.displayMode === 'habit' && config.themePaths && config.themePaths.length > 0 
            ? config.themePaths 
            : ['__default__'];
        const isRowLayout = ['天', '周', '月'].includes(currentView);

        return (
            <div class={`heatmap-view-wrapper ${isRowLayout ? 'layout-row' : 'layout-grid'}`}>
                {themesToDisplay.map(theme => {
                    const dataForTheme = dataByThemeAndDate.get(theme)!;
                    
                    // 计算该主题的等级数据
                    const themeItems: Item[] = [];
                    dataForTheme.forEach(itemsOnDate => {
                        if (itemsOnDate) themeItems.push(...itemsOnDate);
                    });

                    let itemsForLeveling = themeItems;
                    if (config.oncePerDayForLevel) {
                        const dailyItems: Item[] = [];
                        dataForTheme.forEach((itemsOnDate) => {
                            if (itemsOnDate && itemsOnDate.length > 0) {
                                // 创建一个代表这一天的 item，其 levelCount 强制为 1
                                const representativeItem: Item = {
                                    ...itemsOnDate[0], // 以第一个 item 为基础，保留 theme 等信息
                                    levelCount: 1,
                                    manuallyEdited: true, // 强制使用 levelCount
                                };
                                dailyItems.push(representativeItem);
                            }
                        });
                        itemsForLeveling = dailyItems;
                    }
                    
                    const levelData = config.enableLeveling && theme !== '__default__' ? getThemeLevelData(itemsForLeveling) : null;
                    
                    const isVertical = verticalLayouts.has(theme);
                    
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
                                style={{
                                    marginBottom: '16px',
                                    padding: '12px 16px',
                                    backgroundColor: 'var(--background-primary)',
                                    borderRadius: '8px',
                                    border: '1px solid var(--background-modifier-border)',
                                    transition: 'all 0.2s ease'
                                }}
                                onMouseEnter={(e) => {
                                    (e.target as HTMLElement).style.backgroundColor = 'var(--background-modifier-hover)';
                                }}
                                onMouseLeave={(e) => {
                                    (e.target as HTMLElement).style.backgroundColor = 'var(--background-primary)';
                                }}
                            >
                                {/* 第一行：等级信息和进度条 */}
                                {theme !== '__default__' && (
                                    <div class="heatmap-header-info" style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between'
                                    }}>
                                        {/* 左侧：等级信息和主题名称 */}
                                        <div style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                            flex: '0 0 auto'
                                        }}>
                                            {levelData && (
                                                <>
                                                    <span style={{ fontSize: '16px' }}>
                                                        {levelData.config.icon}
                                                    </span>
                                                    <span style={{ 
                                                        fontWeight: 'bold', 
                                                        fontSize: '13px',
                                                        color: 'var(--text-normal)'
                                                    }}>
                                                        Lv.{levelData.level}
                                                    </span>
                                                </>
                                            )}
                                            <span style={{
                                                fontWeight: 'bold',
                                                fontSize: '14px',
                                                color: 'var(--text-normal)'
                                            }}>
                                                {theme}
                                            </span>
                                        </div>

                                        {/* 右侧：进度条 */}
                                        {levelData && config.showLevelProgress && levelData.nextConfig && (
                                            <div style={{
                                                flex: '1 1 auto',
                                                margin: '0 16px',
                                                minWidth: '100px'
                                            }}>
                                                <div style={{
                                                    width: '100%',
                                                    height: '6px',
                                                    backgroundColor: 'var(--background-modifier-border)',
                                                    borderRadius: '3px',
                                                    overflow: 'hidden',
                                                    position: 'relative',
                                                    cursor: 'pointer'
                                                }}
                                                title={`当前进度: ${levelData.totalChecks}${levelData.nextRequirement ? ` / ${levelData.nextRequirement}` : ''} 
下一等级: ${levelData.nextConfig.title}
距离升级还需: ${levelData.nextRequirement ? Math.max(0, levelData.nextRequirement - levelData.totalChecks) : 0} 次打卡`}
                                                >
                                                    <div style={{
                                                        width: `${levelData.progress * 100}%`,
                                                        height: '100%',
                                                        backgroundColor: levelData.config.color,
                                                        transition: 'width 0.3s ease'
                                                    }} />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                                
                                {/* 第二行：HeatmapCell展示区域 */}
                                <div class="heatmap-header-cells" style={{
                                    display: 'flex',
                                    gap: '2px',
                                    flexWrap: 'wrap',
                                    justifyContent: 'flex-start',
                                    width: '100%'
                                }}>
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
