// src/core/utils/timelineInteraction.ts
import { App, Notice } from 'obsidian';
import { TaskBlock, splitTaskIntoDayBlocks } from '@features/views/timeline-parser';
import { minutesToTime, dayjs } from '@core/utils/date';
import { QuickInputModal } from '@features/quickinput/QuickInputModal';

interface CreateTaskOptions {
    app: App;
    inputBlocks: any[];
    hourHeight: number;
    dayBlocks: TaskBlock[];
}

/**
 * 处理时间轴上的点击创建任务
 */
export function handleTimelineTaskCreation(
    day: string,
    e: MouseEvent | TouchEvent,
    options: CreateTaskOptions
) {
    const { app, inputBlocks, hourHeight, dayBlocks } = options;
    
    if (!inputBlocks || inputBlocks.length === 0) {
        new Notice('没有可用的Block模板，请先在设置中创建一个。');
        return;
    }
    
    // 查找任务模板
    let taskBlock = inputBlocks.find((b: any) => b.name === 'Task' || b.name === '任务');
    if (!taskBlock) {
        taskBlock = inputBlocks[0];
    }

    // 计算点击位置
    const targetEl = e.currentTarget as HTMLElement;
    const rect = targetEl.getBoundingClientRect();
    
    let clientY = 0;
    if ('touches' in e) {
        clientY = (e as TouchEvent).touches[0].clientY;
    } else {
        clientY = (e as MouseEvent).clientY;
    }

    const y = clientY - rect.top;
    const clickedMinute = Math.floor((y / hourHeight) * 60);

    // 查找前后任务块
    const prevBlock = dayBlocks.filter(b => b.blockEndMinute <= clickedMinute).pop();
    const nextBlock = dayBlocks.find(b => b.blockStartMinute >= clickedMinute);

    // 构建上下文
    const context: Record<string, any> = { '日期': day };
    if (prevBlock) {
        context['时间'] = minutesToTime(prevBlock.blockEndMinute);
    } else {
        context['时间'] = minutesToTime(clickedMinute);
    }
    if (nextBlock) {
        context['结束'] = minutesToTime(nextBlock.blockStartMinute);
    }
    
    new QuickInputModal(app, taskBlock.id, context).open();
}

/**
 * 构建每日视图数据
 */
export function buildDailyViewData(
    timelineTasks: any[],
    dateRange: [Date, Date]
) {
    const start = dayjs(dateRange[0]);
    const end = dayjs(dateRange[1]);
    const diff = end.diff(start, 'day');
    const dateRangeDays = Array.from({ length: diff + 1 }, (_, i) => start.add(i, 'day'));
    const map: Record<string, TaskBlock[]> = {};
    const range: [dayjs.Dayjs, dayjs.Dayjs] = [start, end];

    dateRangeDays.forEach(day => map[day.format('YYYY-MM-DD')] = []);
    
    for (const task of timelineTasks) {
        const blocks = splitTaskIntoDayBlocks(task, range);
        for (const block of blocks) {
            if (map[block.day]) map[block.day].push(block);
        }
    }
    
    Object.values(map).forEach(dayBlocks => {
        dayBlocks.sort((a, b) => a.blockStartMinute - b.blockStartMinute);
    });

    return { dateRangeDays, blocksByDay: map };
}
