// src/features/settings/views/runtime/components/timeline/DayColumnBody.tsx
/** @jsxImportSource preact */
import { h } from 'preact';
import type { JSX } from 'preact';
import { useRef } from 'preact/hooks';
import type { TaskBlock } from '@core/types/public';
import { createRecordGestureHandlers, RECORD_GESTURE_HINT, ThinkIcon, ThinkIconButton } from '@shared/ui/public';
import { getTaskSessionResultPresentation, getTaskStatusPresentation } from '@core/records/public';
import { dayjs, mapTaskToCategory, timelineOffsetFromMinute, timelineVisibleEndMinute } from '@core/utils/public';
import type { OpenRecordHandler, OpenRecordOriginHandler } from '@shared/types/public';
import type { UpdateTaskTimeHandler } from '@shared/types/public';

interface DayColumnBodyProps {
    day: string;
    blocks: TaskBlock[];
    hourHeight: number;
    categoriesConfig: Record<string, { files?: string[]; color?: string }>;
    colorMap: Record<string, string>;
    maxHours: number;
    onColumnClick: (day: string, e: MouseEvent | TouchEvent) => void;
    /** 由 feature 层注入的保存处理器：用于“对齐/精确编辑”等需要写回的操作 */
    onUpdateTaskTime?: UpdateTaskTimeHandler;
    onOpenRecord?: OpenRecordHandler;
    onOpenRecordOrigin?: OpenRecordOriginHandler;
    onNotice?: (message: string) => void;
    onEditTask?: (block: TaskBlock) => void;
    onAlignPrev?: (block: TaskBlock, prevBlock: TaskBlock | null) => void;
    onAlignNext?: (block: TaskBlock, nextBlock: TaskBlock | null) => void;
}

// 辅助函数
const formatTimeMinute = (minute: number) => {
    const total = Math.round(minute);
    const h = Math.floor(total / 60) % 24;
    const m = ((total % 60) + 60) % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

const generateTaskBlockTitle = (block: TaskBlock): string => {
    if (block.timelineSource === 'task-point' || (block.timelineSource === 'task-plan' && block.duration <= 0)) {
        return `${block.timelineSource === 'task-plan' ? '计划' : '任务'}: ${block.pureText}\n时间点: ${formatTimeMinute(block.startMinute)}\n${RECORD_GESTURE_HINT}`;
    }

    const isCrossNight = (block.startMinute % 1440) + block.duration > 1440;
    if (isCrossNight) {
        const startDateTime = dayjs(block.actualStartDate).add(block.startMinute, 'minute');
        const endDateTime = startDateTime.add(block.duration, 'minute');
        return `任务: ${block.pureText}\n时间: ${startDateTime.format('HH:mm')} - ${endDateTime.format('HH:mm')}\n${RECORD_GESTURE_HINT}`;
    }

    return `${block.timelineSource === 'task-plan' ? '计划' : '任务'}: ${block.pureText}\n时间: ${formatTimeMinute(block.startMinute)} - ${formatTimeMinute(block.endMinute)}\n${RECORD_GESTURE_HINT}`;
};


export function DayColumnBody({
    day,
    blocks,
    hourHeight,
    categoriesConfig,
    colorMap,
    maxHours,
    onColumnClick,
    onUpdateTaskTime,
    onOpenRecord,
    onOpenRecordOrigin,
    onNotice,
    onEditTask,
    onAlignPrev,
    onAlignNext
}: DayColumnBodyProps) {
    const lastTouchRef = useRef<{ time: number; x: number; y: number } | null>(null);
    const suppressClickUntilRef = useRef(0);

    const tryUpdateTaskTime = async (recordId: string, updates: Parameters<UpdateTaskTimeHandler>[1]) => {
        if (!onUpdateTaskTime) {
            onNotice?.('未提供保存处理器，无法更新时间');
            return;
        }
        try {
            await onUpdateTaskTime(recordId, updates);
        } catch (e) {
            onNotice?.('更新记录时间失败');
        }
    };

    const handleOpenTask = (block: TaskBlock) => {
        void onOpenRecord?.({ ...block, id: block.taskRecordId } as any);
    };

    const handlePreciseEdit = (block: TaskBlock) => {
        if (block.timelineSource === 'task-plan') {
            handleOpenTask(block);
            return;
        }
        if (onEditTask) {
            onEditTask(block);
            return;
        }
        handleOpenTask(block);
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
                onNotice?.('无法对齐：任务时长将变为负数或零');
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
            style={{ height: `${timelineOffsetFromMinute(timelineVisibleEndMinute(maxHours), hourHeight)}px` }}
            onClick={(e) => handleBodyClick(e as any)}
            onTouchEnd={(e) => handleBodyTouchEnd(e as any)}
        >
{blocks.map((block: TaskBlock, index: number) => {
                const top = timelineOffsetFromMinute(block.blockStartMinute, hourHeight);
                const naturalHeight = timelineOffsetFromMinute(block.blockEndMinute, hourHeight) - top;
                const isPlanned = block.timelineSource === 'task-plan';
                const isPoint = block.timelineSource === 'task-point' || (isPlanned && block.duration <= 0);
                const renderHeight = isPoint ? 22 : Math.max(naturalHeight, 2);
                const category = mapTaskToCategory(block.fileName || '', categoriesConfig);
                const color = colorMap[category] || 'var(--think-data-neutral)';
                const prevBlock = index > 0 ? blocks[index - 1] : null;
                const nextBlock = index < blocks.length - 1 ? blocks[index + 1] : null;
                const canAlign = !isPoint && !isPlanned;
                const canAlignToNext = canAlign && nextBlock && (nextBlock.blockStartMinute > block.blockStartMinute);
                const lifecycle = block.timelineSource === 'task-session'
                    ? (getTaskSessionResultPresentation(block.sessionResult) || getTaskStatusPresentation(block.status))
                    : getTaskStatusPresentation(block.status);

                const blockGesture = createRecordGestureHandlers({ item: { ...block, id: block.taskRecordId } as any, onOpenOrigin: onOpenRecordOrigin, onPrimary: () => handleOpenTask(block) });

                return (
                    <div 
                        key={block.id + block.day}
                        class={`timeline-task-block timeline-task-block--${lifecycle.className}${isPoint ? ' timeline-task-block--point' : ''}${isPlanned ? ' timeline-task-block--planned' : ''}`}
                        data-task-status={lifecycle.status}
                        data-timeline-kind={isPoint ? 'point' : 'range'}
                        data-timeline-layer={isPlanned ? 'planned' : (block.timelineSource === 'task-session' ? 'actual' : 'legacy')}
                        title={`${generateTaskBlockTitle(block)}\n状态: ${lifecycle.label}`}
                        style={{ top: `${top}px`, height: `${renderHeight}px`, '--timeline-task-color': color } as JSX.CSSProperties}
                        onClick={(e) => e.stopPropagation()}
                        onTouchStart={(e) => e.stopPropagation()}
                        onTouchEnd={(e) => e.stopPropagation()}
                    >
                        <a 
                            class="timeline-task-link"
                            role="button"
                            tabIndex={0}
                            onClick={blockGesture.onClick as any}
                            onDblClick={blockGesture.onDblClick as any}
                            onTouchEnd={blockGesture.onTouchEnd as any}
                            onKeyDown={blockGesture.onKeyDown as any}
                        >
                            <div class="timeline-task-indicator" />
                            <div class="timeline-task-content">
                                <span
                                    class="timeline-task-status"
                                    aria-label={lifecycle.label}
                                    title={lifecycle.label}
                                >
                                    {lifecycle.emoji}
                                </span>
                                {block.icon ? <span class="timeline-task-icon">{block.icon}</span> : null}
                                <span class="timeline-task-title">{block.title || block.pureText}</span>
                            </div>
                        </a>
                        <div class="task-buttons">
                            {canAlign ? (
                                <>
                                    <ThinkIconButton
                                        className="timeline-task-action"
                                        size="sm"
                                        label="向前对齐"
                                        icon={<ThinkIcon name="chevron-up" />}
                                        disabled={!prevBlock}
                                        onClick={() => handleAlignToPrev(block, prevBlock)}
                                    />
                                    <ThinkIconButton
                                        className="timeline-task-action"
                                        size="sm"
                                        label="向后对齐"
                                        icon={<ThinkIcon name="chevron-down" />}
                                        disabled={!canAlignToNext}
                                        onClick={() => handleAlignToNext(block, nextBlock)}
                                    />
                                </>
                            ) : null}
                            <ThinkIconButton
                                className="timeline-task-action"
                                size="sm"
                                label="精确编辑"
                                icon={<ThinkIcon name="pencil" />}
                                onClick={() => handlePreciseEdit(block)}
                            />
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
