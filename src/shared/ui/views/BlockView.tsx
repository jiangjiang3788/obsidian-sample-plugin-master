// src/features/dashboard/ui/BlockView.tsx
/** @jsxImportSource preact */
import { h } from 'preact';
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import type { GoalDefinition } from '@core/goal/public';
import type { GroupNode } from '@core/utils/public';
import type { Item, ThemeDefinition } from '@core/types/public';
import type { MessageRenderPort } from '@core/ports/public';
import type { OpenRecordHandler, OpenRecordOriginHandler, ResolveResourcePathHandler, TimerController } from '../../types/actions';
import { GroupedContainer } from '../GroupedContainer';
import { BlockViewItemList } from './BlockViewItemList';
import { buildBlockViewGroupClassNames, buildBlockViewRenderModel } from './BlockViewModel';

interface BlockViewProps {
    items: Item[];
    groupField?: string;          // 兼容旧配置：单字段分组
    groupFields?: string[];       // 新配置：多字段层级分组（A -> B -> C）
    /**
     * Phase2: shared/ui 纯化（渐进）
     * 如果上层（feature/usecase）已经预先算好了分组树，则直接使用。
     */
    groupTree?: GroupNode[] | null;
    /** 上层已经归一化后的分组字段（优先级：groupFields > groupField） */
    effectiveGroupFields?: string[];
    fields?: string[];
    resolveResourcePath?: ResolveResourcePathHandler;
    onOpenRecordOrigin?: OpenRecordOriginHandler;
    messageRenderPort?: MessageRenderPort;
    onMarkDone: (id: string) => void;
    timerService: TimerController;
    timers: any[];
    allThemes: ThemeDefinition[];
    goals?: GoalDefinition[];
    onOpenRecord?: OpenRecordHandler;
}

export function BlockView(props: BlockViewProps) {
    const {
        items,
        groupField,
        groupFields,
        groupTree: injectedGroupTree,
        effectiveGroupFields: injectedGroupFields,
        fields = [],
        resolveResourcePath,
        onOpenRecordOrigin,
        messageRenderPort,
        onMarkDone,
        timerService,
        timers,
        allThemes,
        goals = [],
        onOpenRecord,
    } = props;
    const containerRef = useRef<HTMLDivElement>(null);
    const [isNarrow, setIsNarrow] = useState(false);

    useEffect(() => {
        const observer = new ResizeObserver(entries => {
            for (const entry of entries) setIsNarrow(entry.contentRect.width < 450);
        });
        if (containerRef.current) observer.observe(containerRef.current);
        return () => observer.disconnect();
    }, []);

    const renderModel = useMemo(() => buildBlockViewRenderModel({
        items,
        groupField,
        groupFields,
        groupTree: injectedGroupTree,
        effectiveGroupFields: injectedGroupFields,
        goals,
    }), [items, groupField, groupFields, injectedGroupTree, injectedGroupFields, goals]);

    const itemListProps = {
        fields,
        isNarrow,
        resolveResourcePath,
        onOpenRecordOrigin,
        messageRenderPort,
        onMarkDone,
        timerService,
        timers,
        allThemes,
        onOpenRecord,
    };

    if (!renderModel.isGrouped) {
        return (
            <div class="bv-container" ref={containerRef}>
                <BlockViewItemList items={items} {...itemListProps} />
            </div>
        );
    }

    return (
        <div class="bv-container" ref={containerRef}>
            <GroupedContainer
                nodes={renderModel.groupTree}
                classNames={buildBlockViewGroupClassNames()}
                renderLeaf={(leafItems) => <BlockViewItemList items={leafItems} {...itemListProps} />}
            />
        </div>
    );
}
