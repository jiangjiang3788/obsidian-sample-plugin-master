// src/features/dashboard/ui/HeatmapView.tsx

/** @jsxImportSource preact */
import { useMemo, useState, useRef, useEffect } from 'preact/hooks';
import { Item, ViewInstance, InputSettings, ThemeDefinition } from '@core/types/public';
import { devLog, buildHeatmapRatingMapping } from '@core/utils/public';
import type { OpenCheckinManagerHandler, OpenHeatmapCreateHandler, ResolveResourcePathHandler } from '../../types/actions';
import { HEATMAP_VIEW_DEFAULT_CONFIG } from '@core/view/public';
import { dayjs } from '@core/utils/public';
import { buildThemeDataMap, buildThemesByPathMap } from '@core/utils/public';
import {
    filterGoalHeatmapGroups,
    inferHeatmapBlockIdByTheme,
    inferHeatmapThemePaths,
    normalizeHeatmapBlockId,
    resolveHeatmapCreateBlockId,
    selectHeatmapThemesToTrack,
    type GoalHeatmapGroup,
    type HeatmapPresetContext,
} from './HeatmapViewModel';
import { HeatmapViewContent } from './HeatmapViewContent';
import {
    applyHeatmapVerticalLayout,
    resolveHeatmapVerticalLayout,
    toggleHeatmapCollapsedTheme,
} from './HeatmapLayoutModel';
import { RatingMappingCache } from '@core/utils/public';

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
    }, [inputSettings.themes, inputSettings.blocks]);

    useEffect(() => {
        devLog(`🔄 [数据更新] 检测到items数据变化，项目数量: ${items.length}`);
        ratingMappingsCache.clear();
    }, [items]);

    // 当 viewConfig 未显式指定 themePaths 时：
    // - 自动从当前 items 推断主题列表，避免落到 '__default__' 把不同主题混在同一张热力图里
    const inferredThemePaths = useMemo(() => {
        return injectedThemesToTrack ? [] : inferHeatmapThemePaths(items);
    }, [items, injectedThemesToTrack]);

    const themesToTrack = useMemo(() => {
        return selectHeatmapThemesToTrack({
            injectedThemesToTrack,
            configuredThemePaths: config.themePaths,
            inferredThemePaths,
        });
    }, [injectedThemesToTrack, config.themePaths, inferredThemePaths]);

    const dataByThemeAndDate = useMemo(() => {
        return injectedDataByThemeAndDate ?? buildThemeDataMap(items, themesToTrack);
    }, [injectedDataByThemeAndDate, items, themesToTrack]);

    const goalGroupsToDisplay = useMemo(() => {
        return filterGoalHeatmapGroups(injectedGoalHeatmapGroups);
    }, [injectedGoalHeatmapGroups]);

    const resolveBlockId = (candidate?: string | null): string => normalizeHeatmapBlockId({
        candidate,
        inputSettings,
        configuredSourceBlockId: config.sourceBlockId,
    });

    const heatmapSourceBlockId = resolveBlockId(config.sourceBlockId);

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

    const inferredBlockIdByTheme = useMemo(() => inferHeatmapBlockIdByTheme(items), [items]);

    const resolveCreateBlockId = (themePath?: string, item?: Item, sourceBlockId?: string) => {
        return resolveHeatmapCreateBlockId({
            themePath,
            item,
            sourceBlockId,
            heatmapSourceBlockId,
            inferredBlockIdByTheme,
            normalizeBlockId: resolveBlockId,
        });
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

    const [verticalLayouts, setVerticalLayouts] = useState<Set<string>>(new Set());
    const [collapsedThemes, setCollapsedThemes] = useState<Set<string>>(new Set());
    const headerRefs = useRef<Map<string, HTMLElement>>(new Map());

    const toggleThemeCollapsed = (theme: string) => {
        setCollapsedThemes((prev) => toggleHeatmapCollapsedTheme(prev, theme));
    };

    // 检测是否需要垂直布局（仅用于天、月视图；周视图固定主题和 cell 一行）
    const checkLayout = (theme: string, headerElement: HTMLElement) => {
        const needsVertical = resolveHeatmapVerticalLayout({
            theme,
            normalizedCurrentView,
            isDayView,
            containerWidth: headerElement?.clientWidth ?? 0,
        });
        if (needsVertical === null) return;

        setVerticalLayouts((prev) => applyHeatmapVerticalLayout(prev, theme, needsVertical));
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


    const dateRangeStart = useMemo(() => dayjs(dateRange[0]).format('YYYY-MM-DD'), [dateRange]);

    return (
        <div class="heatmap-container">
            <HeatmapViewContent
                isDayView={isDayView}
                normalizedCurrentView={normalizedCurrentView}
                dateRangeStart={dateRangeStart}
                dateRange={dateRange}
                config={config}
                resolveResourcePath={resolveResourcePath}
                goalGroupsToDisplay={goalGroupsToDisplay}
                themesToTrack={themesToTrack}
                dataByThemeAndDate={dataByThemeAndDate}
                verticalLayouts={verticalLayouts}
                collapsedThemes={collapsedThemes}
                headerRefs={headerRefs}
                onToggleThemeCollapsed={toggleThemeCollapsed}
                onCellClick={handleCellClick}
                resolveCellRatingMapping={resolveCellRatingMapping}
            />
        </div>
    );
}
