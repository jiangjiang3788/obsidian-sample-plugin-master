// src/features/dashboard/ui/HeatmapView.tsx

/** @jsxImportSource preact */
import { useMemo } from 'preact/hooks';
import { App } from 'obsidian';
import { Item, ViewInstance, BlockTemplate, InputSettings, ThemeDefinition } from '@core/domain/schema';
import { dayjs } from '@core/utils/date';
import { useStore } from '@state/AppStore';
import { QuickInputModal } from '@features/quick-input/ui/QuickInputModal';
import { DEFAULT_CONFIG } from '@features/settings/ui/components/view-editors/HeatmapViewEditor';

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
function HeatmapCell({ date, item, count, config, ratingMapping, app, onCellClick }: HeatmapCellProps) {
    const today = dayjs().format('YYYY-MM-DD');
    const isToday = date === today;
    
    let cellContent: any = '';
    let cellStyle: any = {};
    let title = `${date}\n无记录`;

    let visualValue: string | null = null;
    
    if (config.displayMode === 'habit' && item) {
        if (item.pintu) {
            visualValue = item.pintu;
        } else if (item.rating !== undefined) {
            visualValue = ratingMapping.get(String(item.rating)) || null;
        }

        if (visualValue) {
            if (isHexColor(visualValue)) {
                cellStyle.backgroundColor = visualValue;
            } else if (isImagePath(visualValue)) {
                const imageUrl = app.vault.adapter.getResourcePath(visualValue);
                cellContent = <img src={imageUrl} alt="" />;
            } else {
                cellContent = visualValue;
            }
        }
        title = `${date}\n评分: ${item.rating || 'N/A'}\n内容: ${item.content || ''}`;

    } else if (config.displayMode === 'count' && (count || 0) > 0) {
        const colorIndex = Math.min(count!, config.countColors.length - 1);
        cellStyle.backgroundColor = config.countColors[colorIndex];
        title = `${date}\n数量: ${count}`;
    }

    if (!visualValue && !(config.displayMode === 'count' && count! > 0)) {
        const emptyColor = config.displayMode === 'count' ? config.countColors[0] : '#E5DDEE';
        cellStyle.backgroundColor = emptyColor;
    }

    return (
        <div 
            class={`heatmap-cell ${isToday ? 'current-day' : ''}`}
            style={cellStyle}
            title={title}
            onClick={() => onCellClick(date, item)}
        >
            {isToday && <span class="current-day-star"></span>}
            <div class="heatmap-cell-content">{cellContent}</div>
        </div>
    );
}

// ========== Main View Component ==========
export function HeatmapView({ items, app, dateRange, module, currentView }: HeatmapViewProps) {
    const config = { ...DEFAULT_CONFIG, ...module.viewConfig };
    const settings = useStore(state => state.settings);
    
    const themesByPath = useMemo(() => {
        const map = new Map<string, ThemeDefinition>();
        settings.inputSettings.themes.forEach(t => map.set(t.path, t));
        return map;
    }, [settings.inputSettings.themes]);

    const ratingMappingsCache = useMemo(() => new Map<string, Map<string, string>>(), []);

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
                    map.set(item.date, (map.get(item.date) || 0) + 1);
                }
            });
        } else {
            // [修复] 基于 item.theme 字段进行分组，而不是 item.tags
            items.forEach(item => {
                if (!item.date) return;
                
                // 如果配置了多个主题路径，检查item的theme是否匹配
                if (themesToTrack.length > 1 && themesToTrack[0] !== '__default__') {
                    // item.theme 必须在配置的主题列表中
                    if (item.theme && themesToTrack.includes(item.theme)) {
                        themeMap.get(item.theme)?.set(item.date, item);
                    }
                } else {
                    // 默认模式：所有item归入__default__
                    themeMap.get('__default__')?.set(item.date, item);
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

    const renderMonthGrid = (monthDate: dayjs.Dayjs, dataForMonth: Map<string, any>, themePath: string) => {
        const startOfMonth = monthDate.startOf('month');
        const endOfMonth = monthDate.endOf('month');
        const firstWeekday = startOfMonth.isoWeekday();
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
                    ratingMapping={getMappingForItem(item)} 
                    app={app} 
                    onCellClick={(date, item) => handleCellClick(date, item, themePath)}
                />
            );
        }
        return <div class="month-section"><div class="month-label">{monthDate.format('MMMM')}</div><div class="heatmap-row calendar">{days}</div></div>;
    };

    const renderSingleRow = (startDate: dayjs.Dayjs, endDate: dayjs.Dayjs, dataForRow: Map<string, any>, themePath: string) => {
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
                    ratingMapping={getMappingForItem(item)} 
                    app={app} 
                    onCellClick={(date, item) => handleCellClick(date, item, themePath)}
                />
            );
            currentDate = currentDate.add(1, 'day');
        }
        return <div class="heatmap-row single-row">{days}</div>;
    };

    const renderContent = () => {
        const start = dayjs(dateRange[0]);
        const end = dayjs(dateRange[1]);
        const themes = Array.from(dataByThemeAndDate.keys());
        const isRowLayout = ['天', '周', '月'].includes(currentView);

        return (
            <div class={`heatmap-view-wrapper ${isRowLayout ? 'layout-row' : 'layout-grid'}`}>
                {themes.map(theme => (
                    <div class="heatmap-theme-group" key={theme}>
                        {theme !== '__default__' && <div class="heatmap-theme-label">{theme}</div>}
                        <div class="heatmap-theme-content">
                        {(() => {
                            const dataForTheme = dataByThemeAndDate.get(theme)!;
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
                ))}
            </div>
        );
    };

    return <div class="heatmap-container">{renderContent()}</div>;
}
