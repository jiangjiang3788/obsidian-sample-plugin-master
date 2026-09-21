// src/features/settings/views/runtime/components/timeline/ProgressBlock.tsx
/** @jsxImportSource preact */
import { h } from 'preact';
import type { JSX } from 'preact';
import { useMemo } from 'preact/hooks';

interface ProgressBlockProps {
    goalHours: Record<string, number>;
    order?: string[];
    totalHours: number;
    colorMap: Record<string, string>;
    untrackedLabel: string;
}

export function ProgressBlock({
    goalHours,
    order,
    totalHours,
    colorMap,
    untrackedLabel
}: ProgressBlockProps) {
    const sortedGoals = useMemo(() => {
        const orderToUse = Array.isArray(order) ? order : [];
        const presentGoals = new Set<string>();

        // 先添加指定顺序的分类
        orderToUse.forEach((goalKey: string) => {
            if ((goalHours[goalKey] || 0) > 0.01) {
                presentGoals.add(goalKey);
            }
        });

        // 再添加其他存在的分类
        Object.keys(goalHours).forEach((goalKey: string) => {
            if ((goalHours[goalKey] || 0) > 0.01) {
                presentGoals.add(goalKey);
            }
        });

        return Array.from(presentGoals);
    }, [goalHours, order, untrackedLabel]);

    if (sortedGoals.length === 0) return null;

    return (
        <div class="progress-block-container">
            {sortedGoals.map((goalKey: string) => {
                const hours = goalHours[goalKey];
                const percent = totalHours > 0 ? (hours / totalHours) * 100 : 0;

                if (percent < 0.1 && hours < 0.01) return null;

                const color = colorMap[goalKey] || 'var(--think-data-neutral)';
                const displayPercent = Math.max(percent, 0.5);

                return (
                    <div
                        key={goalKey}
                        title={`${goalKey}：${hours.toFixed(1)} 小时（${Math.round(percent)}%）`}
                        class="progress-block-item"
                    >
                        <div
                            class="progress-block-bar"
                            style={{ width: `${displayPercent}%`, '--timeline-progress-color': color } as JSX.CSSProperties}
                        />
                        <span
                            class={`progress-block-text ${
                                displayPercent > 50 ? 'progress-block-text-light' : 'progress-block-text-dark'
                            }`}
                        >
                            {`${goalKey} ${hours.toFixed(1)}h`}
                        </span>
                    </div>
                );
            })}
        </div>
    );
}
