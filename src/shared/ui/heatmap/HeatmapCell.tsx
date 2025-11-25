/** @jsxImportSource preact */
import { h } from 'preact';
import { App } from 'obsidian';
import type { Item } from '@/core/types/schema';
import { dayjs } from '@core/utils/date';
import { getEffectiveDisplayCount, getEffectiveLevelCount } from '@core/utils/levelingSystem';
import { isImagePath, isHexColor } from '@core/config/heatmapViewConfig';

interface HeatmapCellProps {
    date: string;
    items?: Item[];
    config: any;
    app: App;
    onCellClick: (date: string, item?: Item) => void;
    onEditCount?: (date: string, items?: Item[]) => void;
    ratingMapping: Map<string, string>;
}

/**
 * 生成 HeatmapCell 的 tooltip 文本
 */
export function generateCellTooltip(date: string, items?: Item[], displayCount = 0, levelCount = 0, wasEdited = false): string {
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
        '💡 左键点击新增打卡',
        '💡 右键查看详情或编辑'
    ].filter(Boolean).join('\n');
}

/**
 * 获取可视化内容（图片、颜色或评分文本）
 */
export function getVisualValue(items: Item[], ratingMapping: Map<string, string>): string | null {
    if (!items || items.length === 0) return null;
    
    // 优先显示最新的评分/图片系统
    const latestItemWithValue = [...items].reverse().find(i => i.pintu || i.rating !== undefined);
    if (!latestItemWithValue) return null;
    
    if (latestItemWithValue.pintu) {
        return latestItemWithValue.pintu;
    } 
    
    if (latestItemWithValue.rating !== undefined) {
        return ratingMapping.get(String(latestItemWithValue.rating)) || null;
    }
    
    return null;
}

export function HeatmapCell({ 
    date, 
    items, 
    config, 
    ratingMapping, 
    app, 
    onCellClick, 
    onEditCount 
}: HeatmapCellProps) {
    const today = dayjs().format('YYYY-MM-DD');
    const isToday = date === today;
    
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
        }
    }
    
    const title = generateCellTooltip(date, items, displayCount, levelCount, wasEdited);

    return (
        <div 
            class={`heatmap-cell ${isToday ? 'current-day' : ''} ${item ? 'has-data' : 'empty'}`}
            style={cellStyle}
            title={title}
            onClick={() => onCellClick(date, item)}
            onContextMenu={(e) => {
                e.preventDefault();
                if (onEditCount) {
                    onEditCount(date, items);
                }
            }}
        >
            <div class="heatmap-cell-content">
                {cellContent}
            </div>
        </div>
    );
}
