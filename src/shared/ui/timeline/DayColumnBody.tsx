// src/shared/ui/timeline/DayColumnBody.tsx
/** @jsxImportSource preact */
import { h } from 'preact';
import { useState } from 'preact/hooks';
import { App, Notice } from 'obsidian';
import { TaskBlock } from '@features/views/timeline-parser';
import { ItemService } from '@core/services/ItemService';
import { EditTaskModal } from '@features/settings/EditTaskModal';
import { makeObsUri } from '@core/utils/obsidian';
import { mapTaskToCategory } from '@core/utils/timelineAggregation';
import { dayjs } from '@core/utils/date';

interface DayColumnBodyProps {
    app: App;
    day: string;
    blocks: TaskBlock[];
    hourHeight: number;
    categoriesConfig: Record<string, { files?: string[]; color?: string }>;
    colorMap: Record<string, string>;
    maxHours: number;
    itemService: ItemService;
    onColumnClick: (day: string, e: MouseEvent | TouchEvent) => void;
    onEditTask?: (block: TaskBlock) => void;
    onAlignPrev?: (block: TaskBlock, prevBlock: TaskBlock | null) => void;
    onAlignNext?: (block: TaskBlock, nextBlock: TaskBlock | null) => void;
}

// 辅助函数
const hexToRgba = (hex: string, alpha = 0.35) => {
    const h = hex.replace("#", "");
    const bigint = parseInt(h, 16);
    return `rgba(${(bigint >> 16) & 255},${(bigint >> 8) & 255},${bigint & 255},${alpha})`;
};

const formatTimeMinute = (minute: number) => {
    const h = Math.floor(minute / 60);
    const m = minute % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

const generateTaskBlockTitle = (block: TaskBlock): string => {
    const isCrossNight = (block.startMinute % 1440) + block.duration > 1440;

    if (isCrossNight) {
        const startDateTime = dayjs(block.actualStartDate).add(block.startMinute, 'minute');
        const endDateTime = startDateTime.add(block.duration, 'minute');
        const startFormat = startDateTime.format('HH:mm');
        const endFormat = endDateTime.format('HH:mm');
        return `任务: ${block.pureText}\n时间: ${startFormat} - ${endFormat}`;
    } else {
        const startTime = formatTimeMinute(block.startMinute);
        const endTime = formatTimeMinute(block.endMinute);
        return `任务: ${block.pureText}\n时间: ${startTime} - ${endTime}`;
    }
};

export function DayColumnBody({
    app,
    day,
    blocks,
    hourHeight,
    categoriesConfig,
    colorMap,
    maxHours,
    itemService,
    onColumnClick,
    onEditTask,
    onAlignPrev,
    onAlignNext
}: DayColumnBodyProps) {
    const [editingTask, setEditingTask] = useState<TaskBlock | null>(null);

    const handleEdit = (block: TaskBlock) => {
        if (onEditTask) {
            onEditTask(block);
        } else {
            setEditingTask(block);
        }
    };

    const handleCloseModal = () => {
        setEditingTask(null);
    };

    const handleAlignToPrev = (block: TaskBlock, prevBlock: TaskBlock | null) => {
        if (onAlignPrev) {
            onAlignPrev(block, prevBlock);
        } else {
            // 默认实现
            if (!prevBlock) return;
            const deltaMinutes = prevBlock.blockEndMinute - block.blockStartMinute;
            const newAbsoluteStartMinute = block.startMinute + deltaMinutes;
            const newStartTimeString = formatTimeMinute(newAbsoluteStartMinute);
            itemService.updateItemTime(block.id, { time: newStartTimeString });
        }
    };

    const handleAlignToNext = (block: TaskBlock, nextBlock: TaskBlock | null) => {
        if (onAlignNext) {
            onAlignNext(block, nextBlock);
        } else {
            // 默认实现
            if (!nextBlock) return;
            const deltaDuration = nextBlock.blockStartMinute - block.blockEndMinute;
            const newDuration = block.duration + deltaDuration;
            if (newDuration <= 0) {
                new Notice('无法对齐：任务时长将变为负数或零');
                return;
            }
            itemService.updateItemTime(block.id, { duration: newDuration });
        }
    };

    return (
        <div 
            class="day-column-body"
            style={{ height: `${maxHours * hourHeight}px` }}
            onClick={(e) => onColumnClick(day, e as any)}
            onTouchStart={(e) => onColumnClick(day, e as any)}
        >
            {editingTask && (
                <EditTaskModal
                    isOpen={true}
                    onClose={handleCloseModal}
                    task={editingTask}
                    itemService={itemService}
                />
            )}
            
            {blocks.map((block: TaskBlock, index: number) => {
                const top = (block.blockStartMinute / 60) * hourHeight;
                const height = ((block.blockEndMinute - block.blockStartMinute) / 60) * hourHeight;
                const category = mapTaskToCategory(block.fileName || '', categoriesConfig);
                const color = colorMap[category] || '#ccc';
                const prevBlock = index > 0 ? blocks[index - 1] : null;
                const nextBlock = index < blocks.length - 1 ? blocks[index + 1] : null;
                const canAlignToNext = nextBlock && (nextBlock.blockStartMinute > block.blockStartMinute);

                return (
                    <div 
                        key={block.id + block.day}
                        class="timeline-task-block"
                        title={generateTaskBlockTitle(block)}
                        style={{ top: `${top}px`, height: `${Math.max(height, 2)}px` }}
                        onClick={(e) => e.stopPropagation()}
                        onTouchStart={(e) => e.stopPropagation()}
                    >
                        <a 
                            class="timeline-task-link"
                            onClick={(e) => { 
                                e.preventDefault(); 
                                window.open(makeObsUri(block, app)); 
                            }}
                        >
                            <div class="timeline-task-indicator" style={{ background: color }}></div>
                            <div class="timeline-task-content" style={{ background: hexToRgba(color) }}>
                                {block.pureText}
                            </div>
                        </a>
                        <div class="task-buttons">
                            <button 
                                class="task-button" 
                                title="向前对齐" 
                                disabled={!prevBlock} 
                                onClick={() => handleAlignToPrev(block, prevBlock)}
                            >
                                ⇡
                            </button>
                            <button 
                                class="task-button" 
                                title="向后对齐" 
                                disabled={!canAlignToNext} 
                                onClick={() => handleAlignToNext(block, nextBlock)}
                            >
                                ⇣
                            </button>
                            <button 
                                class="task-button" 
                                title="精确编辑" 
                                onClick={() => handleEdit(block)}
                            >
                                ✎
                            </button>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
