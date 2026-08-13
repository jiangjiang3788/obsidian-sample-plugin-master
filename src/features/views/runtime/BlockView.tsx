// src/features/dashboard/ui/BlockView.tsx
/** @jsxImportSource preact */
import { h } from 'preact';
import { useMemo } from 'preact/hooks';
import type { GoalDefinition } from '@core/goal/public';
import type { RecordViewItem, ThemeDefinition } from '@core/types/public';
import type { MessageRenderPort } from '@core/ports/public';
import type { OpenRecordHandler, OpenRecordOriginHandler, ResolveResourcePathHandler, TimerController } from '@shared/types/public';
import { GroupedContainer } from '@shared/ui/public';
import { BlockViewItemList } from './BlockViewItemList';
import { buildBlockViewGroupClassNames, buildBlockViewRenderModel } from './BlockViewModel';

interface BlockViewProps {
    items: RecordViewItem[];
    groupField?: string;          // 兼容旧配置：单字段分组
    groupFields?: string[];       // 新配置：多字段层级分组（A -> B -> C）
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
    const renderModel = useMemo(() => buildBlockViewRenderModel({
        items,
        groupField,
        groupFields,
        goals,
    }), [items, groupField, groupFields, goals]);

    const itemListProps = {
        fields,
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
            <div class="bv-container think-list">
                <BlockViewItemList items={items} {...itemListProps} />
            </div>
        );
    }

    return (
        <div class="bv-container think-list">
            <GroupedContainer
                nodes={renderModel.groupTree}
                classNames={buildBlockViewGroupClassNames()}
                renderLeaf={(leafItems) => <BlockViewItemList items={leafItems} {...itemListProps} />}
            />
        </div>
    );
}
