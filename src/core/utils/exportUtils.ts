// src/core/utils/exportUtils.ts

import { Item, readField } from '@core/types/domain/schema';
import { EMOJI } from '@core/types/domain/constants';
import { getFieldLabel } from '@core/types/domain/fields';
import { dayjs } from './date'; // 导入 dayjs

/**
 * [核心修改] 将 Item 数组增强后导出为更详细、更具可读性的 Markdown 格式。
 * 新版本增加了按 `filename` 和 `header` 字段进行分组的功能。
 * @param items - 要导出的 Item 数组。
 * @param title - 可选的导出标题 (此参数在当前版本中未使用，但保留以兼容旧接口)。
 * @returns Markdown 格式的字符串。
 */
export function exportItemsToMarkdown(items: Item[], title?: string): string {
    const lines: string[] = [];
    
    // --- 新增：分组逻辑 ---
    // 1. 定义一个用于存储分组后数据的结构
    // Map<filename, Map<header, Item[]>>
    const groupedByFile = new Map<string, Map<string, Item[]>>();
    const UNGROUPED_FILE_KEY = '未分类文件';
    const UNGROUPED_HEADER_KEY = '正文内容';

    // 2. 遍历所有 item，将它们放入对应的分组
    items.forEach(item => {
        // 使用 readField 来安全地读取可能不存在的字段
        const filename = readField(item, 'filename') || UNGROUPED_FILE_KEY;
        const header = readField(item, 'header') || UNGROUPED_HEADER_KEY;

        // 获取或创建文件分组
        if (!groupedByFile.has(filename)) {
            groupedByFile.set(filename, new Map<string, Item[]>());
        }
        const fileGroup = groupedByFile.get(filename)!;

        // 获取或创建标题分组
        if (!fileGroup.has(header)) {
            fileGroup.set(header, []);
        }
        fileGroup.get(header)!.push(item);
    });

    // --- 修改：遍历分组后的数据并生成 Markdown ---
    // 3. 遍历按文件名分组的 Map
    groupedByFile.forEach((headers, filename) => {
        lines.push(`## ${filename}`); // 使用二级标题表示文件名
        lines.push(''); // 添加空行以改善格式

        // 4. 遍历当前文件下按标题分组的 Map
        headers.forEach((groupedItems, header) => {
            // 如果标题不是默认的“正文内容”，则显示标题
            if (header !== UNGROUPED_HEADER_KEY) {
                lines.push(`### ${header}`); // 使用三级标题表示 header
                lines.push('');
            }

            // 5. 遍历标题下的所有 item，并使用原有的格式化逻辑
            groupedItems.forEach(item => {
                if (item.type === 'task') {
                    // 对于任务，我们保留并微调原始的单行格式，因为它能很好地还原任务本身
                    const isDone = item.categoryKey.includes('/done');
                    const isCancelled = item.categoryKey.includes('/cancelled');
                    const checkbox = isDone ? '[x]' : isCancelled ? '[-]' : '[ ]';
                    
                    // 重新构建任务行，确保所有信息都包含在内
                    let taskLine = `- ${checkbox} ${item.title}`;

                    // --- 【本次修改】 ---
                    // 不再为 task 添加标签
                    /*
                    if (item.tags && item.tags.length > 0) {
                        taskLine += ` ${item.tags.map(t => `#${t}`).join(' ')}`;
                    }
                    */

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
                        // 过滤掉 filename 和 header，因为它们已经被用于分组
                        if (key === 'filename' || key === 'header') continue;
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
                    // block 类型的 item 仍然保留标签
                    if (item.tags && item.tags.length > 0) lines.push(`**标签**: ${item.tags.join(', ')}`);
                    if (item.period) lines.push(`**周期**: ${item.period}`);
                    if (item.rating !== undefined) lines.push(`**评分**: ${item.rating}`);
                    if (item.pintu) lines.push(`**评图**: ![[${item.pintu}]]`);
                    
                    // 添加所有 extra 字段
                    for (const key in item.extra) {
                         // 过滤掉 filename 和 header
                        if (key === 'filename' || key === 'header') continue;
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
        });
    });

    return lines.join('\n');
}
