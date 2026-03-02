/** @jsxImportSource preact */
import { h } from 'preact';
import { useMemo } from 'preact/hooks';
import type { Item } from '@core/public';
import type { PeriodData, CategoryConfig } from '@core/public';

interface ChartBlockProps {
    data: PeriodData;
    label: string;
    onCellClick: (cellIdentifier: any, target: HTMLElement, blocks: Item[], title: string) => void;
    categories: CategoryConfig[];
    cellIdentifier: (cat: string) => any;
    isCompact?: boolean;
    isNarrow?: boolean;
    displayMode?: 'smart' | 'linear' | 'logarithmic';
    minVisibleHeight?: number;
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
    categories, 
    cellIdentifier, 
    isCompact = false, 
    isNarrow = false,
    displayMode = 'smart', 
    minVisibleHeight = 15 
}: ChartBlockProps) {
    const counts = data.counts as Record<string, number>;
    const total = Object.values(counts).reduce((sum, count) => sum + count, 0);
    
    // 计算所有分类的高度
    const allCounts = categories.map(cat => counts[cat.name] || 0);
    const categoryHeights = useMemo(() => {
        return categories.map(cat => {
            const count = counts[cat.name] || 0;
            return calculateSmartHeight(count, allCounts, displayMode, minVisibleHeight);
        });
    }, [counts, categories, displayMode, minVisibleHeight, allCounts]);
    
    const containerClasses = [
        'sv-chart-block',
        isCompact ? 'is-compact' : '',
        isNarrow ? 'is-narrow' : '',
        total === 0 ? 'is-empty' : '',
    ].filter(Boolean).join(' ');

    return (
        <div 
            class={containerClasses} 
            onClick={(e) => onCellClick(cellIdentifier('全部'), e.currentTarget as HTMLElement, data.blocks, `${label} · 全部`)}
        >
            <div class="sv-chart-label">{label}</div>
            <div class="sv-chart-content">
                <div class="sv-chart-numbers">
                    {categories.map(({ name }) => {
                        const count = counts[name] || 0;
                        return (
                            <div key={`num-${name}`} class="sv-chart-number">
                                {count > 0 ? count : ''}
                            </div>
                        );
                    })}
                </div>
                <div class="sv-chart-bars-container">
                    {categories.map(({ name, color, alias }, index) => {
                        const count = counts[name] || 0;
                        const height = categoryHeights[index];
                        const displayName = alias || name;
                        
                        return (
                            <div 
                                key={name} 
                                class="sv-vbar-wrapper" 
                                title={`${name}: ${count}`}
                                onClick={(e) => { 
                                    e.stopPropagation(); 
                                    onCellClick(
                                        cellIdentifier(name), 
                                        e.currentTarget as HTMLElement, 
                                        data.blocks.filter((b: Item) => (b.categoryKey || '').startsWith(name)), 
                                        `${label} · ${displayName}`
                                    ); 
                                }}
                            >
                                <div 
                                    class="sv-vbar-bar" 
                                    style={{ 
                                        height: `${height}%`, 
                                        backgroundColor: color || '#ccc' 
                                    }}
                                />
                            </div>
                        );
                    })}
                </div>
                <div class="sv-chart-categories">
                    {categories.map(({ name, alias }) => {
                        const displayName = alias || name;
                        return (
                            <div 
                                key={`cat-${name}`} 
                                class="sv-chart-category" 
                                title={`${name}${alias ? ` (${name})` : ''}`}
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
