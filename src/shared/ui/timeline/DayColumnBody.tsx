// src/shared/ui/timeline/DayColumnBody.tsx
/** @jsxImportSource preact */
import { h } from 'preact';
import { useRef, useState } from 'preact/hooks';
import { useUiPort } from '@/app/public';
import type { TaskBlock } from '@core/public';
import { EditTaskModal } from '@shared/ui/modals/EditTaskModal';
import { createRecordGestureHandlers } from '@/shared/ui/utils/recordOrigin';
import { mapTaskToCategory } from '@core/public';
import { dayjs } from '@core/public';
import type { UpdateTaskTimeHandler } from '@shared/types/taskTime';

interface DayColumnBodyProps {
    app: any;
    day: string;
    blocks: TaskBlock[];
    hourHeight: number;
    categoriesConfig: Record<string, { files?: string[]; color?: string }>;
    colorMap: Record<string, string>;
    maxHours: number;
    onColumnClick: (day: string, e: MouseEvent | TouchEvent) => void;
    /** 由 feature 层注入的保存处理器：用于“对齐/精确编辑”等需要写回的操作 */
    onUpdateTaskTime?: UpdateTaskTimeHandler;
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
    onColumnClick,
    onUpdateTaskTime,
    onEditTask,
    onAlignPrev,
    onAlignNext
}: DayColumnBodyProps) {
    const [editingTask, setEditingTask] = useState<TaskBlock | null>(null);
    const ui = useUiPort();
    const lastTouchRef = useRef<{ time: number; x: number; y: number } | null>(null);
    const suppressClickUntilRef = useRef(0);

    const tryUpdateTaskTime = async (taskId: string, updates: Parameters<UpdateTaskTimeHandler>[1]) => {
        if (!onUpdateTaskTime) {
            ui.notice('未提供保存处理器，无法更新任务时间');
            return;
        }
        try {
            await onUpdateTaskTime(taskId, updates);
        } catch (e) {
            ui.notice('更新任务时间失败');
        }
    };

    const handleEdit = (block: TaskBlock) => {
        if (onEditTask) {
            onEditTask(block);
        } else {
            if (!onUpdateTaskTime) {
                ui.notice('未提供保存处理器，无法打开编辑弹窗');
                return;
            }
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
            void tryUpdateTaskTime(block.id, { time: newStartTimeString });
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
                ui.notice('无法对齐：任务时长将变为负数或零');
                return;
            }
            void tryUpdateTaskTime(block.id, { duration: newDuration });
        }
    };


    const handleBodyClick = (event: MouseEvent) => {
        if (Date.now() < suppressClickUntilRef.current) return;
        onColumnClick(day, event);
    };

    const handleBodyTouchEnd = (event: TouchEvent) => {
        const touch = event.changedTouches?.[0];
        if (!touch) return;

        const now = Date.now();
        const previous = lastTouchRef.current;
        const isDoubleTap = !!previous
            && now - previous.time <= 350
            && Math.abs(previous.x - touch.clientX) <= 24
            && Math.abs(previous.y - touch.clientY) <= 24;

        lastTouchRef.current = {
            time: now,
            x: touch.clientX,
            y: touch.clientY,
        };
        suppressClickUntilRef.current = now + 450;

        if (!isDoubleTap) return;

        event.preventDefault();
        onColumnClick(day, event);
        lastTouchRef.current = null;
    };

    return (
        <div 
            class="day-column-body"
            style={{ height: `${maxHours * hourHeight}px` }}
            onClick={(e) => handleBodyClick(e as any)}
            onTouchEnd={(e) => handleBodyTouchEnd(e as any)}
        >
            {editingTask && onUpdateTaskTime && (
                <EditTaskModal
                    isOpen={true}
                    onClose={handleCloseModal}
                    task={editingTask}
                    onUpdateTaskTime={onUpdateTaskTime}
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

                const blockGesture = createRecordGestureHandlers({ item: block as any, app, onPrimary: () => handleEdit(block) });

                return (
                    <div 
                        key={block.id + block.day}
                        class="timeline-task-block"
                        title={generateTaskBlockTitle(block)}
                        style={{ top: `${top}px`, height: `${Math.max(height, 2)}px` }}
                        onClick={(e) => e.stopPropagation()}
                        onTouchStart={(e) => e.stopPropagation()}
                        onTouchEnd={(e) => e.stopPropagation()}
                    >
                        <a 
                            class="timeline-task-link"
                            onClick={blockGesture.onClick as any}
                            onDblClick={blockGesture.onDblClick as any}
                            onTouchEnd={blockGesture.onTouchEnd as any}
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
