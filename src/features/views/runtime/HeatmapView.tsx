// src/features/dashboard/ui/HeatmapView.tsx
/** @jsxImportSource preact */
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import type { InputSettings, RecordViewItem, ViewInstance } from '@core/types/public';
import { buildHeatmapRatingMapping, dayjs } from '@core/utils/public';
import type { OpenCheckinManagerHandler, OpenHeatmapCreateHandler, OpenRecordOriginHandler, ResolveResourcePathHandler } from '@shared/types/public';
import { HEATMAP_VIEW_DEFAULT_CONFIG } from '@core/view/public';
import {
    filterGoalHeatmapGroups,
    inferHeatmapRecordTypeIdByGoal,
    normalizeHeatmapRecordTypeId,
    resolveHeatmapCreateRecordTypeId,
    type HeatmapPresetContext,
} from './HeatmapViewModel';
import { HeatmapViewContent } from './HeatmapViewContent';
import {
    applyHeatmapVerticalLayout,
    resolveHeatmapVerticalLayout,
    toggleHeatmapCollapsedGoal,
} from './HeatmapLayoutModel';
import { RatingMappingCache } from '@core/utils/public';
import type { GoalDefinition, GoalSettings } from '@core/goal/public';
import { buildHeatmapViewModel } from '../models/heatmapViewModel';

interface HeatmapViewProps {
    items: RecordViewItem[];
    resolveResourcePath?: ResolveResourcePathHandler;
    dateRange: [Date, Date];
    module: ViewInstance;
    currentView: '年' | '季' | '月' | '周' | '天' | '日' | string;
    inputSettings: InputSettings;
    onOpenHeatmapCreate?: OpenHeatmapCreateHandler;
    onOpenCheckinManager?: OpenCheckinManagerHandler;
    onOpenRecordOrigin?: OpenRecordOriginHandler;
    onNotice?: (message: string) => void;
    goals?: GoalDefinition[];
    goalSettings?: GoalSettings;
}

export function HeatmapView({
    items,
    resolveResourcePath,
    dateRange,
    module,
    currentView,
    inputSettings,
    onOpenHeatmapCreate,
    onOpenCheckinManager,
    onOpenRecordOrigin,
    onNotice,
    goals = [],
    goalSettings,
}: HeatmapViewProps) {
    const config = useMemo(() => ({ ...HEATMAP_VIEW_DEFAULT_CONFIG, ...module.viewConfig }), [module.viewConfig]);
    const ratingMappingsCache = useMemo(() => new RatingMappingCache(), []);
    const normalizedCurrentView = currentView === '日' || currentView === 'day' ? '天' : currentView;
    const isDayView = normalizedCurrentView === '天';

    const dataModel = useMemo(() => buildHeatmapViewModel({ items, module, inputSettings, goals, goalSettings }), [items, module, inputSettings, goals, goalSettings]);
    const goalPathsToTrack = dataModel.goalPathsToTrack;
    const dataByGoalAndDate = dataModel.dataByGoalAndDate;
    const goalGroupsToDisplay = useMemo(() => filterGoalHeatmapGroups(dataModel.goalGroups), [dataModel.goalGroups]);

    const resolveRecordTypeId = (candidate?: string | null): string => normalizeHeatmapRecordTypeId({
        candidate,
        inputSettings,
        configuredSourceRecordTypeId: config.sourceRecordTypeId,
    });
    const heatmapSourceRecordTypeId = resolveRecordTypeId(config.sourceRecordTypeId);

    const resolveCellRatingMapping = (goalPath: string, presetContext?: HeatmapPresetContext): Map<string, string> => {
        if (presetContext?.ratingOptions?.length) return buildHeatmapRatingMapping(presetContext.ratingOptions);
        return ratingMappingsCache.get(inputSettings, heatmapSourceRecordTypeId || '', goalPath);
    };

    const inferredRecordTypeIdByGoal = useMemo(() => inferHeatmapRecordTypeIdByGoal(items), [items]);
    const resolveCreateRecordTypeId = (goalPath?: string, item?: RecordViewItem, sourceRecordTypeId?: string) => resolveHeatmapCreateRecordTypeId({
        goalPath,
        item,
        sourceRecordTypeId,
        heatmapSourceRecordTypeId,
        inferredRecordTypeIdByGoal,
        normalizeRecordTypeId: resolveRecordTypeId,
    });

    const openQuickCreate = (date: string, item?: RecordViewItem, goalPath?: string, presetContext?: HeatmapPresetContext) => {
        if (!onOpenHeatmapCreate) {
            onNotice?.('未提供创建处理器，无法创建记录');
            return;
        }
        onOpenHeatmapCreate({
            sourceRecordTypeId: resolveCreateRecordTypeId(goalPath, item, presetContext?.sourceRecordTypeId),
            date,
            item,
            goalPath,
        });
    };

    const openCellRecordManager = (date: string, itemsForDay: RecordViewItem[], goalPath?: string, presetContext?: HeatmapPresetContext) => {
        if (!onOpenCheckinManager) {
            onNotice?.('未提供记录管理处理器，无法打开记录列表');
            return;
        }
        onOpenCheckinManager({
            date,
            items: itemsForDay,
            onAddRecord: () => openQuickCreate(date, itemsForDay[itemsForDay.length - 1], goalPath, presetContext),
        });
    };

    const handleCellClick = (date: string, dayItems?: RecordViewItem[], goalPath?: string, presetContext?: HeatmapPresetContext) => {
        const itemsForDay = dayItems || [];
        if (itemsForDay.length === 0) {
            openQuickCreate(date, undefined, goalPath, presetContext);
            return;
        }
        openCellRecordManager(date, itemsForDay, goalPath, presetContext);
    };

    const [verticalLayouts, setVerticalLayouts] = useState<Set<string>>(new Set());
    const [collapsedGoals, setCollapsedGoals] = useState<Set<string>>(new Set());
    const headerRefs = useRef<Map<string, HTMLElement>>(new Map());

    const toggleGoalCollapsed = (goalPath: string) => setCollapsedGoals((prev) => toggleHeatmapCollapsedGoal(prev, goalPath));
    const checkLayout = (goalPath: string, headerElement: HTMLElement) => {
        const needsVertical = resolveHeatmapVerticalLayout({
            goalPath,
            normalizedCurrentView,
            isDayView,
            containerWidth: headerElement?.clientWidth ?? 0,
        });
        if (needsVertical === null) return;
        setVerticalLayouts((prev) => applyHeatmapVerticalLayout(prev, goalPath, needsVertical));
    };

    useEffect(() => {
        if (typeof ResizeObserver === 'undefined') return;
        const resizeObserver = new ResizeObserver((entries) => {
            entries.forEach((entry) => {
                const element = entry.target as HTMLElement;
                const goalPath = element.dataset.goal;
                if (goalPath) checkLayout(goalPath, element);
            });
        });
        headerRefs.current.forEach((element, goalPath) => {
            resizeObserver.observe(element);
            checkLayout(goalPath, element);
        });
        return () => resizeObserver.disconnect();
    }, [goalPathsToTrack, normalizedCurrentView]);

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
                onOpenRecordOrigin={onOpenRecordOrigin}
                goalGroupsToDisplay={goalGroupsToDisplay}
                goalPathsToTrack={goalPathsToTrack}
                dataByGoalAndDate={dataByGoalAndDate}
                verticalLayouts={verticalLayouts}
                collapsedGoals={collapsedGoals}
                headerRefs={headerRefs}
                onToggleGoalCollapsed={toggleGoalCollapsed}
                onCellClick={handleCellClick}
                resolveCellRatingMapping={resolveCellRatingMapping}
            />
        </div>
    );
}
