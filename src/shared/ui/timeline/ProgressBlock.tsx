// src/shared/ui/timeline/ProgressBlock.tsx
/** @jsxImportSource preact */
import { h } from 'preact';
import { useMemo } from 'preact/hooks';

interface ProgressBlockProps {
    categoryHours: Record<string, number>;
    order?: string[];
    totalHours: number;
    colorMap: Record<string, string>;
    untrackedLabel: string;
}

export function ProgressBlock({ 
    categoryHours, 
    order, 
    totalHours, 
    colorMap, 
    untrackedLabel 
}: ProgressBlockProps) {
    const sortedCategories = useMemo(() => {
        const orderToUse = Array.isArray(order) ? order : [];
        const presentCategories = new Set<string>();
        
        // 先添加指定顺序的分类
        orderToUse.forEach(cat => {
            if ((categoryHours[cat] || 0) > 0.01) {
                presentCategories.add(cat);
            }
        });
        
        // 再添加其他存在的分类
        Object.keys(categoryHours).forEach(cat => {
            if ((categoryHours[cat] || 0) > 0.01) {
                presentCategories.add(cat);
            }
        });
        
        return Array.from(presentCategories);
    }, [categoryHours, order, untrackedLabel]);

    if (sortedCategories.length === 0) return null;

    return (
        <div class="progress-block-container">
            {sortedCategories.map((category) => {
                const hours = categoryHours[category];
                const percent = totalHours > 0 ? (hours / totalHours) * 100 : 0;
                
                if (percent < 0.1 && hours < 0.01) return null;
                
                const color = colorMap[category] || '#cccccc';
                const displayPercent = Math.max(percent, 0.5);
                
                return (
                    <div 
                        key={category} 
                        title={`${category}: ${hours.toFixed(1)}h (${Math.round(percent)}%)`} 
                        class="progress-block-item"
                    >
                        <div 
                            class="progress-block-bar" 
                            style={{ background: color, width: `${displayPercent}%` }} 
                        />
                        <span 
                            class={`progress-block-text ${
                                displayPercent > 50 ? 'progress-block-text-light' : 'progress-block-text-dark'
                            }`}
                        >
                            {`${category} ${hours.toFixed(1)}h`}
                        </span>
                    </div>
                );
            })}
        </div>
    );
}
