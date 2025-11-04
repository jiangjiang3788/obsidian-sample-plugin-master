// src/features/dashboard/ui/HeatmapView.tsx

/** @jsxImportSource preact */
import { useMemo, useState } from 'preact/hooks';
import { App, Notice } from 'obsidian';
import { Item, ViewInstance, BlockTemplate, InputSettings, ThemeDefinition } from '../../../lib/types/domain/schema';
import { dayjs } from '../../../lib/utils/core/date';
import { useStore } from '../../../store/AppStore';
import { QuickInputModal } from '../../QuickInput/ui/QuickInputModal';
import { DEFAULT_CONFIG } from '../../Settings/ui/components/view-editors/HeatmapViewEditor';
import { getThemeLevelData, getEffectiveDisplayCount, getEffectiveLevelCount, type LevelResult } from '../../../lib/utils/core/levelingSystem';
import { CountEditModal } from './CountEditModal';

// ========== Types ==========
interface HeatmapViewProps {
    items: Item[];
    app: App;
    dateRange: [Date, Date];
    module: ViewInstance;
    currentView: '年' | '季' | '月' | '周' | '天';
}

interface HeatmapCellProps {
    date: string;
    item?: Item;
    count?: number;
    config: typeof DEFAULT_CONFIG;
    app: App;
    onCellClick: (date: string, item?: Item) => void;
    onEditCount?: (date: string, item?: Item) => void;
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
function HeatmapCell({ date, item, count, config, ratingMapping, app, onCellClick, onEditCount }: HeatmapCellProps) {
    const today = dayjs().format('YYYY-MM-DD');
    const isToday = date === today;
    
    let cellContent: any = '';
    let cellStyle: any = {};
    let title = `${date}\n无记录`;

    let visualValue: string | null = null;
    
    if (config.displayMode === 'habit' && item) {
        const displayCount = getEffectiveDisplayCount(item);
        const levelCount = getEffectiveLevelCount(item);
        const wasEdited = item.manuallyEdited;
        
        // 优先显示原有的评分/图片系统
        if (item.pintu) {
            visualValue = item.pintu;
        } else if (item.rating !== undefined) {
            visualValue = ratingMapping.get(String(item.rating)) || null;
        }

        if (visualValue) {
            if (isHexColor(visualValue)) {
                cellStyle.backgroundColor = visualValue;
                // 如果有多次打卡，在颜色上叠加次数标记
                if (displayCount > 1) {
                    cellContent = (
                        <div class="cell-with-count">
                            <span class="check-count-overlay">×{displayCount}</span>
                        </div>
                    );
                }
            } else if (isImagePath(visualValue)) {
                const imageUrl = app.vault.adapter.getResourcePath(visualValue);
                cellContent = (
                    <div class="cell-with-image">
                        <img src={imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        {displayCount > 1 && (
                            <span class="check-count-overlay">×{displayCount}</span>
                        )}
                    </div>
                );
            } else {
                cellContent = (
                    <div class="cell-with-text">
                        <span class="visual-content">{visualValue}</span>
                        {displayCount > 1 && (
                            <span class="check-count-overlay">×{displayCount}</span>
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
            `👆 显示次数: ${displayCount}`,
            levelCount !== displayCount ? `🏆 等级次数: ${levelCount}` : '',
            wasEdited ? `✏️ 已手动编辑` : '',
            item.rating !== undefined ? `⭐ 评分: ${item.rating}` : '',
            item.content ? `💭 ${item.content}` : '',
            '',
            '💡 点击编辑打卡'
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
    if (!visualValue && !(config.displayMode === 'count' && count! > 0) && (!item || getEffectiveDisplayCount(item) === 0)) {
        const emptyColor = config.displayMode === 'count' ? config.countColors[0] : '#E5DDEE';
        cellStyle.backgroundColor = emptyColor;
        cellStyle.opacity = 0.3;
    }

    // 今日特殊标记 - 简化为单一边框
    if (isToday) {
        cellStyle.border = '2px solid var(--interactive-accent)';
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
                if (config.allowManualEdit && onEditCount) {
                    onEditCount(date, item);
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
            ratingField?.options?.map(opt => [opt.label || '', opt.value]) || []
        );
        ratingMappingsCache.set(cacheKey, newMapping);
        return newMapping;
    };
    
    const dataByThemeAndDate = useMemo(() => {
        const themeMap = new Map<string, Map<string, any>>();
        
        // [修复] 使用 themePaths 替代 themeTags，表示主题路径列表
        const themesToTrack = config.displayMode === 'habit' && config.themePaths && config.themePaths.length > 0 
            ? config.themePaths 
            : ['__default__'];
        
        themesToTrack.forEach(theme => themeMap.set(theme, new Map()));

        if (config.displayMode === 'count') {
            items.forEach(item => {
                if (item.date) {
                    const map = themeMap.get('__default__')!;
                    const currentCount = map.get(item.date) || 0;
                    // 支持多次打卡计数
                    const itemDisplayCount = getEffectiveDisplayCount(item);
                    map.set(item.date, currentCount + itemDisplayCount);
                }
            });
        } else {
            // [新增] 支持同日期多次打卡的聚合逻辑
            items.forEach(item => {
                if (!item.date) return;
                
                // 如果配置了多个主题路径，检查item的theme是否匹配
                if (themesToTrack.length > 1 && themesToTrack[0] !== '__default__') {
                    // item.theme 必须在配置的主题列表中
                    if (item.theme && themesToTrack.includes(item.theme)) {
                        const targetThemeMap = themeMap.get(item.theme);
                        if (targetThemeMap) {
                            const existingItem = targetThemeMap.get(item.date);
                            if (existingItem) {
                                // 聚合同日期的多次打卡
                                existingItem.displayCount = (existingItem.displayCount || 1) + getEffectiveDisplayCount(item);
                                existingItem.levelCount = (existingItem.levelCount || 1) + getEffectiveLevelCount(item);
                                existingItem.manuallyEdited = existingItem.manuallyEdited || item.manuallyEdited;
                                // 保留最新的其他字段
                                if (item.rating !== undefined) existingItem.rating = item.rating;
                                if (item.pintu) existingItem.pintu = item.pintu;
                                if (item.content) existingItem.content = item.content;
                            } else {
                                // 新的日期记录
                                targetThemeMap.set(item.date, {
                                    ...item,
                                    displayCount: getEffectiveDisplayCount(item),
                                    levelCount: getEffectiveLevelCount(item)
                                });
                            }
                        }
                    }
                } else {
                    // 默认模式：所有item归入__default__
                    const defaultMap = themeMap.get('__default__');
                    if (defaultMap) {
                        const existingItem = defaultMap.get(item.date);
                        if (existingItem) {
                            // 聚合同日期的多次打卡
                            existingItem.displayCount = (existingItem.displayCount || 1) + getEffectiveDisplayCount(item);
                            existingItem.levelCount = (existingItem.levelCount || 1) + getEffectiveLevelCount(item);
                            existingItem.manuallyEdited = existingItem.manuallyEdited || item.manuallyEdited;
                            // 保留最新的其他字段
                            if (item.rating !== undefined) existingItem.rating = item.rating;
                            if (item.pintu) existingItem.pintu = item.pintu;
                            if (item.content) existingItem.content = item.content;
                        } else {
                            // 新的日期记录
                            defaultMap.set(item.date, {
                                ...item,
                                displayCount: getEffectiveDisplayCount(item),
                                levelCount: getEffectiveLevelCount(item)
                            });
                        }
                    }
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
            ...(item ? { '内容': item.content, '评分': item.rating } : {}),
            ...(themeToPreselect ? { '主题': themeToPreselect.path } : {})
        };
        
        new QuickInputModal(app, config.sourceBlockId, context, themeToPreselect?.id).open();
    };

    const handleEditCount = (date: string, item?: Item) => {
        const currentDisplayCount = item ? getEffectiveDisplayCount(item) : 0;
        const currentLevelCount = item ? getEffectiveLevelCount(item) : 0;
        const countForLevel = item ? !item.manuallyEdited : true;
        
        const handleSave = async (data: { displayCount: number; levelCount: number; countForLevel: boolean }) => {
            try {
                // TODO: 实现实际的数据更新逻辑
                // 这里需要调用store的更新方法来保存新的打卡次数
                new Notice(`已更新 ${date} 的打卡次数：显示${data.displayCount}次，等级${data.levelCount}次`);
            } catch (error) {
                new Notice('保存失败：' + (error as Error).message);
                throw error; // 重新抛出错误，让模态框处理
            }
        };
        
        new CountEditModal(
            app,
            date,
            currentDisplayCount,
            currentLevelCount,
            countForLevel,
            handleSave
        ).open();
    };

    const renderMonthGrid = (monthDate: dayjs.Dayjs, dataForMonth: Map<string, any>, themePath: string) => {
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
                ratingField?.options?.map(opt => [opt.label || '', opt.value]) || []
            );
            ratingMappingsCache.set(cacheKey, newMapping);
            return newMapping;
        })();
        
        const days = [];
        for (let i = 1; i < firstWeekday; i++) { days.push(<div class="heatmap-cell empty"></div>); }
        for (let i = 1; i <= endOfMonth.date(); i++) {
            const dateStr = startOfMonth.clone().date(i).format('YYYY-MM-DD');
            const item = dataForMonth.get(dateStr);
            days.push(
                <HeatmapCell 
                    key={dateStr} 
                    date={dateStr} 
                    item={item} 
                    config={config} 
                    ratingMapping={themRatingMapping} 
                    app={app} 
                    onCellClick={(date, item) => handleCellClick(date, item, themePath)}
                    onEditCount={config.allowManualEdit ? handleEditCount : undefined}
                />
            );
        }
        return <div class="month-section"><div class="month-label">{monthDate.format('MMMM')}</div><div class="heatmap-row calendar">{days}</div></div>;
    };

    const renderSingleRow = (startDate: dayjs.Dayjs, endDate: dayjs.Dayjs, dataForRow: Map<string, any>, themePath: string) => {
        // [修复] 使用 themePath 作为 cacheKey 的一部分，而不是 themeId
        // 这样即使 theme 定义缺失，每个 themePath 也有独立的映射
        const themeId = themePath !== '__default__' ? themesByPath.get(themePath)?.id : undefined;
        const cacheKey = `${config.sourceBlockId}:${themePath}`;
        
        const themeRatingMapping = ratingMappingsCache.get(cacheKey) || (() => {
            const effectiveTemplate = getEffectiveTemplate(settings.inputSettings, config.sourceBlockId || '', themeId);
            const ratingField = effectiveTemplate?.fields.find(f => f.type === 'rating');
            const newMapping = new Map<string, string>(
                ratingField?.options?.map(opt => [opt.label || '', opt.value]) || []
            );
            ratingMappingsCache.set(cacheKey, newMapping);
            return newMapping;
        })();
        
        const days = [];
        let currentDate = startDate.clone();
        while(currentDate.isSameOrBefore(endDate, 'day')) {
            const dateStr = currentDate.format('YYYY-MM-DD');
            const item = dataForRow.get(dateStr);
            days.push(
                <HeatmapCell 
                    key={dateStr} 
                    date={dateStr} 
                    item={config.displayMode === 'habit' ? item : undefined}
                    count={config.displayMode === 'count' ? item : undefined}
                    config={config} 
                    ratingMapping={themeRatingMapping} 
                    app={app} 
                    onCellClick={(date, item) => handleCellClick(date, item, themePath)}
                    onEditCount={config.allowManualEdit ? handleEditCount : undefined}
                />
            );
            currentDate = currentDate.add(1, 'day');
        }
        return <div class="heatmap-row single-row">{days}</div>;
    };

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
                    dataForTheme.forEach(item => {
                        if (item) themeItems.push(item);
                    });
                    const levelData = config.enableLeveling && theme !== '__default__' ? getThemeLevelData(themeItems) : null;
                    
                    return (
                        <div class="heatmap-theme-group" key={theme}>
                            {theme !== '__default__' && (
                                <div class="heatmap-theme-header" style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    marginBottom: '8px',
                                    padding: '10px 16px',
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

                                    {/* 中间：进度条 */}
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
                                                position: 'relative'
                                            }}
                                            title={`${levelData.totalChecks}${levelData.nextRequirement ? ` / ${levelData.nextRequirement}` : ''}`}
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

                                    {/* 右侧：统计和快捷按钮 */}
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '12px',
                                        flex: '0 0 auto'
                                    }}>
                                        {/* 打卡历史点 */}
                                        <div style={{
                                            display: 'flex',
                                            gap: '2px',
                                            alignItems: 'center'
                                        }}>
                                            {Array.from({ length: 7 }, (_, i) => {
                                                const date = dayjs().subtract(6 - i, 'day').format('YYYY-MM-DD');
                                                const hasData = dataForTheme.has(date);
                                                return (
                                                    <div 
                                                        key={date}
                                                        style={{
                                                            width: '8px',
                                                            height: '8px',
                                                            borderRadius: '50%',
                                                            backgroundColor: hasData ? levelData?.config.color || 'var(--interactive-accent)' : 'var(--background-modifier-border)',
                                                            opacity: hasData ? 1 : 0.3
                                                        }}
                                                        title={date}
                                                    />
                                                );
                                            })}
                                        </div>

                                        {/* 快捷打卡按钮 */}
                                        {config.sourceBlockId && (
                                            <button
                                                style={{
                                                    width: '24px',
                                                    height: '24px',
                                                    borderRadius: '4px',
                                                    border: '1px solid var(--background-modifier-border)',
                                                    backgroundColor: 'var(--background-secondary)',
                                                    color: 'var(--text-normal)',
                                                    fontSize: '16px',
                                                    lineHeight: '1',
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    transition: 'all 0.2s ease'
                                                }}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleCellClick(dayjs().format('YYYY-MM-DD'), undefined, theme);
                                                }}
                                                onMouseEnter={(e) => {
                                                    (e.target as HTMLElement).style.backgroundColor = 'var(--interactive-accent)';
                                                    (e.target as HTMLElement).style.color = 'var(--text-on-accent)';
                                                    (e.target as HTMLElement).style.borderColor = 'var(--interactive-accent)';
                                                }}
                                                onMouseLeave={(e) => {
                                                    (e.target as HTMLElement).style.backgroundColor = 'var(--background-secondary)';
                                                    (e.target as HTMLElement).style.color = 'var(--text-normal)';
                                                    (e.target as HTMLElement).style.borderColor = 'var(--background-modifier-border)';
                                                }}
                                                title="快速打卡"
                                            >
                                                +
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )}
                            
                            <div class="heatmap-theme-content">
                            {(() => {
                                switch (currentView) {
                                    case '天': return renderSingleRow(start, start, dataForTheme, theme);
                                    case '周': return renderSingleRow(start.startOf('isoWeek'), start.endOf('isoWeek'), dataForTheme, theme);
                                    case '月': return renderSingleRow(start.startOf('month'), start.endOf('month'), dataForTheme, theme);
                                    case '年':
                                    case '季':
                                        const months = [];
                                        let currentMonth = start.clone().startOf('month');
                                        while (currentMonth.isSameOrBefore(end, 'month')) {
                                            months.push(currentMonth.clone());
                                            currentMonth = currentMonth.add(1, 'month');
                                        }
                                        return (<div class="heatmap-grid-container">{months.map(m => renderMonthGrid(m, dataForTheme, theme))}</div>);
                                    default: return <div>Unsupported view mode for Heatmap.</div>
                                }
                            })()}
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    };

    return <div class="heatmap-container">{renderContent()}</div>;
}
