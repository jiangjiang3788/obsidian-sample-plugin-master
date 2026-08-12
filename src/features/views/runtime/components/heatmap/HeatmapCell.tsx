/** @jsxImportSource preact */
import { h } from 'preact';
import type { RecordViewItem } from '@core/types/public';
import type { OpenRecordOriginHandler, ResolveResourcePathHandler } from '@shared/types/public';
import { dayjs } from '@core/utils/public';
import { getEffectiveDisplayCount, getEffectiveLevelCount, getLatestHeatmapVisualValue } from '@core/utils/public';
import { isImagePath, isHexColor } from '@core/utils/public';
import { hasPlatformModifier, isKeyboardActivation, stopInteractionEvent } from '@shared/ui/public';

interface HeatmapCellProps {
    date: string;
    items?: RecordViewItem[];
    config: any;
    resolveResourcePath?: ResolveResourcePathHandler;
    onCellClick: (date: string, items?: RecordViewItem[]) => void;
    onOpenRecordOrigin?: OpenRecordOriginHandler;
    ratingMapping: Map<string, string>;
    highlightToday?: boolean;
    emptyLabel?: string;
}

/**
 * 生成 HeatmapCell 的 tooltip 文本
 */
export function generateCellTooltip(date: string, items?: RecordViewItem[], displayCount = 0, levelCount = 0, wasEdited = false): string {
    if (!items || items.length === 0) {
        return `📅 ${date}\n无记录`;
    }

    const latestItem = items[items.length - 1];
    
    return [
        `📅 ${date}`,
        `👆 打卡次数: ${displayCount}`,
        levelCount !== displayCount ? `🏆 等级次数: ${levelCount}` : '',
        wasEdited ? `✏️ 包含手动编辑` : '',
        latestItem.rating !== undefined ? `⭐ 最后评分: ${latestItem.rating}` : '',
        latestItem.content ? `💭 最后内容: ${latestItem.content}` : '',
        '',
        '💡 左键：空白日期新增 / 有记录日期查看当天记录并继续新增',
        items.length === 1 ? '⌨️ Ctrl/⌘+点击：打开该条记录原文' : ''
    ].filter(Boolean).join('\n');
}

/**
 * 获取可视化内容（图片、颜色或评分文本）
 *
 * 结构说明：打卡记录可能有 `评分:: 1` + `图片:: ♨️`，也可能只有 `评分:: 1`。
 * 具体评分如何显示由目标预设的 rating options 决定，统一收敛到 core/utils/heatmapVisual。
 */
export function getVisualValue(items: RecordViewItem[], ratingMapping: Map<string, string>): string | null {
    return getLatestHeatmapVisualValue(items, ratingMapping);
}

export function HeatmapCell({ 
    date, 
    items, 
    config, 
    ratingMapping, 
    resolveResourcePath,
    onCellClick,
    onOpenRecordOrigin,
    highlightToday = true,
    emptyLabel
}: HeatmapCellProps) {
    const today = dayjs().format('YYYY-MM-DD');
    const isToday = highlightToday && date === today;
    
    let cellContent: any = '';
    let cellStyle: any = {};
    
    // 聚合 displayCount 和 levelCount
    const displayCount = items ? items.reduce((sum, i) => sum + getEffectiveDisplayCount(i), 0) : 0;
    const levelCount = items ? items.reduce((sum, i) => sum + getEffectiveLevelCount(i), 0) : 0;
    const wasEdited = items ? items.some(i => i.manuallyEdited) : false;
    
    const visualValue = getVisualValue(items || [], ratingMapping);
    const item = items && items.length > 0 ? items[items.length - 1] : undefined;

    if (visualValue) {
        // 优先处理可视化内容
        if (isHexColor(visualValue)) {
            cellStyle.backgroundColor = visualValue;
        } else if (isImagePath(visualValue)) {
            const imageUrl = resolveResourcePath?.(visualValue) || visualValue;
            cellContent = (
                <div class="cell-with-image">
                    <img src={imageUrl} alt="" class="heatmap-cell-image" />
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
            const colors = ['#4A90E2', '#E74C3C', '#F39C12', '#27AE60']; // Blue, Red, Orange, Green for 2, 3, 4, 5+
            const colorIndex = Math.min(displayCount - 2, colors.length - 1);
            cellStyle.boxShadow = `0 0 0 1px ${colors[colorIndex]} inset`;
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
        } else if (emptyLabel) {
            cellContent = (
                <div class="cell-with-empty-label">
                    <span class="empty-label-text">{emptyLabel}</span>
                </div>
            );
        }
    }
    
    const title = generateCellTooltip(date, items, displayCount, levelCount, wasEdited);

    return (
        <div 
            class={`heatmap-cell ${isToday ? 'current-day' : ''} ${item ? 'has-data' : 'empty'}`}
            style={cellStyle}
            title={title}
            role="button"
            tabIndex={0}
            onClick={(event: MouseEvent) => {
                if (items?.length === 1 && onOpenRecordOrigin && hasPlatformModifier(event)) {
                    stopInteractionEvent(event);
                    void onOpenRecordOrigin(items[0]);
                    return;
                }
                onCellClick(date, items);
            }}
            onKeyDown={(event: KeyboardEvent) => {
                if (!isKeyboardActivation(event)) return;
                stopInteractionEvent(event);
                if (items?.length === 1 && onOpenRecordOrigin && hasPlatformModifier(event)) {
                    void onOpenRecordOrigin(items[0]);
                    return;
                }
                onCellClick(date, items);
            }}
        >
            <div class="heatmap-cell-content">
                {cellContent}
            </div>
        </div>
    );
}
