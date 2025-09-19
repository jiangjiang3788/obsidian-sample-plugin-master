// src/core/utils/exportUtils.ts

import { Item, readField } from '@core/domain/schema';
import { EMOJI } from '@core/domain/constants';
import { getFieldLabel } from '@core/domain/fields';
import { dayjs } from './date'; // 导入 dayjs

/**
 * [核心修改] 将 Item 数组增强后导出为更详细、更具可读性的 Markdown 格式。
 * @param items - 要导出的 Item 数组。
 * @param title - 可选的导出标题 (此参数在当前版本中未使用，但保留以兼容旧接口)。
 * @returns Markdown 格式的字符串。
 */
export function exportItemsToMarkdown(items: Item[], title?: string): string {
    const lines: string[] = [];

    // 遍历并格式化每个 item
    items.forEach(item => {
        if (item.type === 'task') {
            // 对于任务，我们保留并微调原始的单行格式，因为它能很好地还原任务本身
            const isDone = item.categoryKey.includes('/done');
            const isCancelled = item.categoryKey.includes('/cancelled');
            const checkbox = isDone ? '[x]' : isCancelled ? '[-]' : '[ ]';
            
            // 重新构建任务行，确保所有信息都包含在内
            let taskLine = `- ${checkbox} ${item.title}`;

            // 添加标签
            if (item.tags && item.tags.length > 0) {
                taskLine += ` ${item.tags.map(t => `#${t}`).join(' ')}`;
            }

            // 添加核心和自定义字段 (key:: value)
            const extraFields: Record<string, any> = {
                '周期': item.period,
                '评分': item.rating,
                '时间': item.startTime,
                '结束': item.endTime,
                '时长': item.duration,
                ...item.extra,
            };
            for (const key in extraFields) {
                const value = extraFields[key];
                if (value !== null && value !== undefined && value !== '') {
                    taskLine += ` (${key}:: ${value})`;
                }
            }
            
            // 添加日期字段
            if (item.dueDate) taskLine += ` ${EMOJI.due} ${item.dueDate}`;
            if (item.scheduledDate) taskLine += ` ${EMOJI.scheduled} ${item.scheduledDate}`;
            if (item.startDate) taskLine += ` ${EMOJI.start} ${item.startDate}`;
            if (item.createdDate) taskLine += ` ${EMOJI.created} ${item.createdDate}`;
            if (item.doneDate) taskLine += ` ${EMOJI.done} ${item.doneDate}`;
            if (item.cancelledDate) taskLine += ` ${EMOJI.cancelled} ${item.cancelledDate}`;

            lines.push(taskLine.replace(/\s+/g, ' ').trim());

        } else if (item.type === 'block') {
            // [修改] id 作为五级标题
            lines.push(`##### ID ${item.id}`);
            
            // 详情不再使用无序列表
            if (item.categoryKey) lines.push(`**分类**: ${item.categoryKey}`);
            if (item.date) lines.push(`**日期**: ${item.date}`);
            if (item.tags && item.tags.length > 0) lines.push(`**标签**: ${item.tags.join(', ')}`);
            if (item.period) lines.push(`**周期**: ${item.period}`);
            if (item.rating !== undefined) lines.push(`**评分**: ${item.rating}`);
            if (item.pintu) lines.push(`**评图**: ![[${item.pintu}]]`);
            
            // 添加所有 extra 字段
            for (const key in item.extra) {
                lines.push(`**${key}**: ${item.extra[key]}`);
            }

            // 修正 content 字段的引用块格式，去除前置空格
            if (item.content && item.content.trim()) {
                lines.push(`**内容**:`);
                const contentLines = item.content.trim().split('\n');
                contentLines.forEach(line => {
                    lines.push(`> ${line}`);
                });
            }
            
            // [修改] 使用 <br> 换行符分隔不同的 block
            lines.push('<br>'); 
        }
    });

    return lines.join('\n');
}