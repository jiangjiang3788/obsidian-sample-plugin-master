// src/features/dashboard/ui/HeatmapView.tsx

/** @jsxImportSource preact */
import { useMemo, useState, useRef, useEffect } from 'preact/hooks';
import { App, Notice } from 'obsidian';
import { Item, ViewInstance, BlockTemplate, InputSettings, ThemeDefinition } from '@/core/types/schema';
import { dayjs } from '@core/utils/date';
import { QuickInputModal } from '@/features/quickinput/QuickInputModal';
import { DEFAULT_CONFIG } from '@features/settings/HeatmapViewEditor';
import { getThemeLevelData, getEffectiveDisplayCount, getEffectiveLevelCount, type LevelResult, LEVEL_SYSTEM_PRESETS } from '@core/utils/levelingSystem';
import { CheckinManagerModal } from '@/features/settings/CheckinManagerModal';

// ========== Types ==========
interface HeatmapViewProps {
    items: Item[];
    app: App;
    dateRange: [Date, Date];
    module: ViewInstance;
    currentView: '年' | '季' | '月' | '周' | '天';
    inputSettings: InputSettings;
}

// [修改] item 变为 items 数组
interface HeatmapCellProps {
    date: string;
    items?: Item[]; // 改为 items 数组
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
function HeatmapCell({ date, items, config, ratingMapping, app, onCellClick, onEditCount }: HeatmapCellProps) {
    const today = dayjs().format('YYYY-MM-DD');
    const isToday = date === today;
    
    let cellContent: any = '';
    let cellStyle: any = {};
    let title = `${date}\n无记录`;

    let visualValue: string | null = null;
    
    // [修改] 从 items 数组中获取信息
    const item = items && items.length > 0 ? items[items.length - 1] : undefined;

    if (item && items) {
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
                const mappedValue = ratingMapping.get(String(latestItemWithValue.rating));
                visualValue = mappedValue || null;
            }
        }

        if (visualValue) {
            // 优先处理内容
            if (isHexColor(visualValue)) {
                cellStyle.backgroundColor = visualValue;
            } else if (isImagePath(visualValue)) {
                const imageUrl = app.vault.adapter.getResourcePath(visualValue);
                cellContent = (
                    <div class="cell-with-image">
                        <img src={imageUrl} alt="" class="w-full h-full object-cover" />
                    </div>
                );
            } else {
                cellContent = (
                    <div class="cell-with-text">
                        <span class="visual-content">{visualValue}</span>
                    </div>
                );
            }

            // 如果有多次打卡，使用更明显的描边代替数字
            if (displayCount > 1) {
                const colors = ['#4A90E2', '#E74C3C', '#F39C12', '#27AE60']; // 更鲜明的 Blue, Red, Orange, Green for 2, 3, 4, 5+
                const colorIndex = Math.min(displayCount - 2, colors.length - 1);
                cellStyle.boxShadow = `0 0 0 1px ${colors[colorIndex]} inset`;
                // 添加额外的外边框增强视觉效果
                cellStyle.border = `1px solid ${colors[colorIndex]}`;
            }
        } else {
            // 没有评分/图片时，显示纯次数
            if (displayCount > 0) {
                const sizeClass = displayCount > 99 ? 'large' : displayCount > 9 ? 'medium' : 'small';
                cellContent = (
                    <div class="cell-with-count">
                        <span class={`pure-count ${sizeClass}`}>
                            {displayCount > 999 ? '999+' : displayCount}
                        </span>
                    </div>
                );
                
                // 根据次数设置背景色强度
                // const intensity = Math.min(displayCount / 10, 1);
                // 使用紫色系代替绿色系
                // cellStyle.backgroundColor = `rgba(195, 180, 217, ${0.4 + intensity * 0.6})`;
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

    }

    // 空状态处理
    if (!visualValue && (!items || items.length === 0)) {
        // 移除硬编码的颜色，使用 CSS 类控制
        // cellStyle.backgroundColor = emptyColor;
        // cellStyle.opacity = 0.4;
    }

    // 今日特殊标记 - 使用更subtle的方式
    // if (isToday) {
    //     const todayShadow = '0 0 0 1px var(--interactive-accent)';
    //     cellStyle.boxShadow = cellStyle.boxShadow ? `${cellStyle.boxShadow}, ${todayShadow}` : todayShadow;
    //     cellStyle.opacity = 1; // 确保今日不透明
    // }

    return (
        <div 
            class={`heatmap-cell ${isToday ? 'current-day' : ''} ${item ? 'has-data' : 'empty'}`}
            style={cellStyle}
            title={title}
            onClick={() => onCellClick(date, item)}
            onContextMenu={(e) => {
                e.preventDefault();
                // [修改] 右键打开详情/编辑
                if (onEditCount) {
                    onEditCount(date, items);
                }
            }}
        >
            {/* 主要内容 */}
            <div class="heatmap-cell-content">
                {cellContent}
            </div>
        </div>
    );
}

// ========== Main View Component ==========
export function HeatmapView({ items, app, dateRange, module, currentView, inputSettings }: HeatmapViewProps) {
    // 移除不需要的模态框状态，直接使用Modal实例
    
    // [修复] 将 config 对象移入 useMemo，确保响应式更新
    const config = useMemo(
        () => ({ ...DEFAULT_CONFIG, ...module.viewConfig }), 
        [module.viewConfig]
    );
    
    const themesByPath = useMemo(() => {
        const map = new Map<string, ThemeDefinition>();
        inputSettings.themes.forEach(t => map.set(t.path, t));
        return map;
    }, [inputSettings.themes]);

    // [修复] 稳定的缓存映射，避免不必要的重建
    const ratingMappingsCache = useRef(new Map<string, Map<string, string>>()).current;
    
    // [修复] 当设置发生变化时，清空相关缓存
    useEffect(() => {
        // 清空评分映射缓存，因为设置可能已经改变
        ratingMappingsCache.clear();
    }, [inputSettings.themes, inputSettings.blocks, inputSettings.overrides]);

    // [新增] 当items数据发生变化时，确保重新计算数据聚合
    useEffect(() => {
        // 强制重新计算数据聚合，确保新数据能及时显示
        console.log(`🔄 [数据更新] 检测到items数据变化，项目数量: ${items.length}`);
        // 清空评分映射缓存，确保新数据能正确映射
        ratingMappingsCache.clear();
    }, [items]);

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
        
        const effectiveTemplate = getEffectiveTemplate(inputSettings, blockId, themeId);
        const ratingField = effectiveTemplate?.fields.find(f => f.type === 'rating');
        const newMapping = new Map<string, string>(
            ratingField?.options?.filter(opt => opt.value).map(opt => [opt.label || '', opt.value as string]) || []
        );
        ratingMappingsCache.set(cacheKey, newMapping);
        return newMapping;
    };
    
    const dataByThemeAndDate = useMemo(() => {
        const themeMap = new Map<string, Map<string, Item[]>>();
        
        const themesToTrack = config.themePaths && config.themePaths.length > 0 
            ? config.themePaths 
            : ['__default__'];
        
        // 初始化所有主题的映射
        themesToTrack.forEach(theme => themeMap.set(theme, new Map()));

        // 改进的数据聚合逻辑：确保每个 item 都被正确分配
        items.forEach((item) => {
            if (!item.date) return;
            
            // 确定这个 item 应该分配到哪个主题
            let targetTheme = '__default__';
            
            // 如果配置了多个主题，且 item 有主题信息
            if (themesToTrack.length > 1 && themesToTrack[0] !== '__default__') {
                // 只有当 item 的主题在要跟踪的主题列表中时，才分配到对应主题
                if (item.theme && themesToTrack.includes(item.theme)) {
                    targetTheme = item.theme;
                } else {
                    return; // 跳过这个 item
                }
            }
            
            // 将 item 分配到目标主题
            const targetThemeMap = themeMap.get(targetTheme);
            if (targetThemeMap) {
                const existingItems = targetThemeMap.get(item.date) || [];
                targetThemeMap.set(item.date, [...existingItems, item]);
            }
        });
        
        return themeMap;
    }, [items, config.themePaths]);

    const handleCellClick = (date: string, item?: Item, themePath?: string) => {
        if (!config.sourceBlockId) return;
        
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
            if (!config.sourceBlockId) return new Map<string, string>();
            const effectiveTemplate = getEffectiveTemplate(inputSettings, config.sourceBlockId, themeId || undefined);
            const ratingField = effectiveTemplate?.fields.find(f => f.type === 'rating');
            const newMapping = new Map<string, string>(
                ratingField?.options?.filter(opt => opt.value).map(opt => [opt.label || '', opt.value as string]) || []
            );
            ratingMappingsCache.set(cacheKey, newMapping);
            return newMapping;
        })();
        
        const days = [];
        for (let i = 1; i < firstWeekday; i++) { days.push(<div class="heatmap-cell grid-spacer"></div>); }
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
            <div class="month-section">
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
        
        // [修复] 使用 themePath 作为 cacheKey 的一部分，而不是 themeId
        const themeId = themePath !== '__default__' ? themesByPath.get(themePath)?.id : undefined;
        const cacheKey = `${config.sourceBlockId}:${themePath}`;
        
        const themeRatingMapping = ratingMappingsCache.get(cacheKey) || (() => {
            if (!config.sourceBlockId) {
                return new Map<string, string>();
            }
            const effectiveTemplate = getEffectiveTemplate(inputSettings, config.sourceBlockId, themeId || undefined);
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
                            key={`${themePath}-${dateStr}`} // 确保key唯一性
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
    // [新增] 折叠状态管理
    const [collapsedThemes, setCollapsedThemes] = useState<Set<string>>(new Set());
    const headerRefs = useRef<Map<string, HTMLElement>>(new Map());

    // [新增] 切换主题折叠状态
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
        const start = dayjs(dateRange[0]);
        const end = dayjs(dateRange[1]);
        // [修复] 使用 config.themePaths 的顺序而不是 Map.keys() 的顺序，确保主题行顺序稳定
        const themesToDisplay = config.themePaths && config.themePaths.length > 0 
            ? config.themePaths 
            : ['__default__'];
        const isRowLayout = ['天', '周', '月'].includes(currentView);


        return (
            <div class={`heatmap-view-wrapper ${isRowLayout ? 'layout-row' : 'layout-grid'}`}>
                {themesToDisplay.map((theme, themeIndex) => {
                    const dataForTheme = dataByThemeAndDate.get(theme)!;
                    
                    // 计算该主题的等级数据
                    const themeItems: Item[] = [];
                    dataForTheme.forEach(itemsOnDate => {
                        if (itemsOnDate) themeItems.push(...itemsOnDate);
                    });

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
