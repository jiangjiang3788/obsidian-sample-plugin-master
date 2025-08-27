// src/core/services/taskService.ts
import { DataStore } from './dataStore';
import { markTaskDone } from '@core/utils/mark';
import { TFile } from 'obsidian';
import { dayjs } from '@core/utils/date';

// 修正正则表达式以正确处理 (key::) 这样值为空的情况
function upsertKvTag(line: string, key: string, value: string): string {
    // 将 + (匹配一个或多个) 改为 * (匹配零个或多个)，以匹配空值
    const pattern = new RegExp(`([\\(\\[]\\s*${key}::\\s*)[^\\)\\]]*(\\s*[\\)\\]])`);
    if (pattern.test(line)) {
        // 如果标签已存在，则替换其值
        return line.replace(pattern, `$1${value}$2`);
    } else {
        // 如果标签不存在，则在行尾追加它
        return `${line.trim()} (${key}:: ${value})`;
    }
}

export class TaskService {
    /**
     * [新增] 一个辅助函数，用于根据ID安全地获取文件中的原始行文本
     * @param itemId - 任务的唯一ID
     * @returns 返回行内容的字符串，如果找不到则返回 null
     */
    static async getTaskLine(itemId: string): Promise<string | null> {
        const ds = DataStore.instance;
        if (!ds) return null;
        
        const [filePath, lineStr] = itemId.split('#');
        const lineNo = Number(lineStr);
        const file = ds.app.vault.getAbstractFileByPath(filePath);

        if (!(file instanceof TFile)) return null;
        
        const content = await ds.platform.readFile(file);
        const lines = content.split(/\r?\n/);
        
        if (lineNo < 1 || lineNo > lines.length) return null;

        return lines[lineNo - 1];
    }

    static async completeTask(itemId: string, options?: { duration?: number }): Promise<void> {
        const ds = DataStore.instance;
        if (!ds) throw new Error('DataStore not ready');

        const [filePath, lineStr] = itemId.split('#');
        const lineNo = Number(lineStr);
        const file = ds.app.vault.getAbstractFileByPath(filePath);

        if (!(file instanceof TFile)) {
            console.warn(`[TaskService] File not found or is not a TFile: ${filePath}`);
            return;
        }

        const content = await ds.platform.readFile(file);
        const lines = content.split(/\r?\n/);
        if (lineNo < 1 || lineNo > lines.length) return;

        const rawLine = lines[lineNo - 1];
        // 确保这是一个未完成的任务
        if (!/^\s*-\s*\[ \]\s*/.test(rawLine)) return;

        const todayISO = dayjs().format('YYYY-MM-DD');
        const nowTime = dayjs().format('HH:mm');
        
        const { completedLine, nextTaskLine } = markTaskDone(
            rawLine,
            todayISO,
            nowTime,
            options?.duration,
        );
        
        lines[lineNo - 1] = completedLine;
        if (nextTaskLine) {
            lines.splice(lineNo, 0, nextTaskLine);
        }

        await ds.platform.writeFile(file, lines.join('\n'));
    }

    static async updateTaskTime(itemId: string, newValues: { time?: string; duration?: number }): Promise<void> {
        const ds = DataStore.instance;
        if (!ds) throw new Error('DataStore not ready');

        const [filePath, lineStr] = itemId.split('#');
        const lineNo = Number(lineStr);
        const file = ds.app.vault.getAbstractFileByPath(filePath);

        if (!(file instanceof TFile)) {
            console.warn(`[TaskService] File not found for updating time: ${filePath}`);
            return;
        }

        const content = await ds.platform.readFile(file);
        const lines = content.split(/\r?\n/);
        if (lineNo < 1 || lineNo > lines.length) return;

        let targetLine = lines[lineNo - 1];

        if (newValues.time) {
            targetLine = upsertKvTag(targetLine, '时间', newValues.time);
        }
        if (newValues.duration !== undefined) {
            targetLine = upsertKvTag(targetLine, '时长', String(newValues.duration));
        }

        lines[lineNo - 1] = targetLine;
        await ds.platform.writeFile(file, lines.join('\n'));
    }
}