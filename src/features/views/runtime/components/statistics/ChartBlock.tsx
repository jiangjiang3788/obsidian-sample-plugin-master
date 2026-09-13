/** @jsxImportSource preact */
import { h } from 'preact';
import { useMemo } from 'preact/hooks';
import type { RecordViewItem } from '@core/types/public';
import type { PeriodData } from '@core/utils/public';
import type { StatisticsBucketConfig } from '@core/view/public';
import { getItemRootGoalKey } from '@core/goal/public';
import type { OpenRecordOriginHandler } from '@shared/types/public';
import { hasPlatformModifier, isKeyboardActivation, stopInteractionEvent } from '@shared/ui/public';

interface ChartBlockProps {
    data: PeriodData;
    label: string;
    onCellClick: (cellIdentifier: any, target: HTMLElement, blocks: RecordViewItem[], title: string) => void;
    buckets: StatisticsBucketConfig[];
    cellIdentifier: (cat: string) => any;
    isCompact?: boolean;
    isNarrow?: boolean;
    displayMode?: 'smart' | 'linear' | 'logarithmic';
    minVisibleHeight?: number;
    bucketAccessor?: (item: RecordViewItem) => string;
    onOpenRecordOrigin?: OpenRecordOriginHandler;
}


/**
 * 高度计算：按数量线性比例
 */
function calculateSmartHeight(
    count: number,
    allCounts: number[],
    _displayMode: string,
    minVisibleHeight: number
): number {
    if (count === 0) return 0;

    const nonZeroCounts = allCounts.filter(c => c > 0);
    if (nonZeroCounts.length === 0) return 0;

    const maxCount = Math.max(...nonZeroCounts);

    // 按数量线性比例显示
    let height = (count / maxCount) * 100;

    // 确保最小可见高度
    if (height > 0 && height < minVisibleHeight) {
        height = minVisibleHeight;
    }

    return Math.min(height, 100);
}

/**
 * 可复用的图表块组件
 */
export function ChartBlock({
    data,
    label,
    onCellClick,
    buckets,
    cellIdentifier,
    isCompact = false,
    isNarrow = false,
    displayMode = 'smart',
    minVisibleHeight = 15,
    onOpenRecordOrigin,
    bucketAccessor = (item: RecordViewItem) => getItemRootGoalKey(item)
}: ChartBlockProps) {
    const counts = data.counts as Record<string, number>;
    const total = Object.values(counts).reduce((sum, count) => sum + count, 0);
    // Statistics keeps a stable comparison frame. A zero-count goal still owns its
    // column so time periods remain comparable instead of collapsing into blank space.
    const chartBuckets = buckets;
    const allCounts = chartBuckets.map(cat => counts[cat.name] || 0);
    const bucketHeights = useMemo(() => {
        return chartBuckets.map(cat => {
            const count = counts[cat.name] || 0;
            return calculateSmartHeight(count, allCounts, displayMode, minVisibleHeight);
        });
    }, [counts, chartBuckets, displayMode, minVisibleHeight, allCounts]);

    const containerClasses = [
        'sv-chart-block',
        isCompact ? 'is-compact' : '',
        isNarrow ? 'is-narrow' : '',
        total === 0 ? 'is-empty' : '',
    ].filter(Boolean).join(' ');

    const openBlocks = (event: MouseEvent | KeyboardEvent, blocks: RecordViewItem[], identifier: unknown, title: string) => {
        stopInteractionEvent(event);
        if (blocks.length === 1 && onOpenRecordOrigin && hasPlatformModifier(event)) {
            void onOpenRecordOrigin(blocks[0]);
            return;
        }
        onCellClick(identifier, event.currentTarget as HTMLElement, blocks, title);
    };

    const openAll = (event: MouseEvent | KeyboardEvent) => {
        openBlocks(event, data.blocks, cellIdentifier('全部'), `${label} · 全部`);
    };

    const openBucket = (event: MouseEvent | KeyboardEvent, name: string, displayName: string) => {
        const blocks = data.blocks.filter((block: RecordViewItem) => bucketAccessor(block) === name);
        openBlocks(event, blocks, cellIdentifier(name), `${label} · ${displayName}`);
    };

    return (
        <div
            class={containerClasses}
            role="button"
            tabIndex={0}
            title={data.blocks.length === 1 && onOpenRecordOrigin ? `${label} · Ctrl/⌘+点击打开原文` : label}
            onClick={openAll}
            onKeyDown={(event: KeyboardEvent) => {
                if (!isKeyboardActivation(event)) return;
                openAll(event);
            }}
        >
            <div class="sv-chart-label think-viz-label">{label}</div>
            <div class="sv-chart-content">
                <div class="sv-chart-numbers">
                    {chartBuckets.map(({ name }) => {
                        const count = counts[name] || 0;
                        const displayName = buckets.find((bucket) => bucket.name === name)?.alias || name;
                        return (
                            <div key={`num-${name}`} class="sv-chart-number think-viz-value" onClick={(event) => openBucket(event, name, displayName)}>
                                {count}
                            </div>
                        );
                    })}
                </div>
                <div class="sv-chart-bars-container">
                    {chartBuckets.map(({ name, color, alias }, index) => {
                        const count = counts[name] || 0;
                        const height = bucketHeights[index];
                        const displayName = alias || name;

                        return (
                            <div
                                key={name}
                                class="sv-vbar-wrapper"
                                role="button"
                                tabIndex={0}
                                title={`${displayName}: ${count}`}
                                onClick={(event) => openBucket(event, name, displayName)}
                                onKeyDown={(event: KeyboardEvent) => {
                                    if (!isKeyboardActivation(event)) return;
                                    openBucket(event, name, displayName);
                                }}
                            >
                                <div
                                    class="sv-vbar-bar"
                                    style={{
                                        height: `${height}%`,
                                        backgroundColor: color || 'var(--think-data-neutral)'
                                    }}
                                />
                            </div>
                        );
                    })}
                </div>
                <div class="sv-chart-categories">
                    {chartBuckets.map(({ name, alias }) => {
                        const displayName = alias || name;
                        return (
                            <div
                                key={`cat-${name}`}
                                class="sv-chart-category think-viz-axis-label"
                                title={`${displayName}${alias ? ` (${name})` : ''}`}
                                onClick={(event) => openBucket(event, name, displayName)}
                            >
                                {displayName}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
