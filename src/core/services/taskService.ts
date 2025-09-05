//src/core/services/TaskService.ts
import { singleton } from 'tsyringe';
import { DataStore } from './dataStore';
import { markTaskDone } from '@core/utils/mark';
import { TFile } from 'obsidian';
import { dayjs } from '@core/utils/date';

function upsertKvTag(line: string, key: string, value: string): string {
    const pattern = new RegExp(`([\\(\\[]\\s*${key}::\\s*)[^\\)\\]]*(\\s*[\\)\\]])`);
    if (pattern.test(line)) {
        return line.replace(pattern, `$1${value}$2`);
    } else {
        return `${line.trim()} (${key}:: ${value})`;
    }
}

@singleton()
export class TaskService {
    private dataStore!: DataStore;

    // [核心修复] 构造函数变为空
    constructor() { }

    // [核心修复] 新增 init 方法用于注入依赖
    public init(dataStore: DataStore) {
        this.dataStore = dataStore;
    }

    public async getTaskLine(itemId: string): Promise<string | null> {
        const [filePath, lineStr] = itemId.split('#');
        const lineNo = Number(lineStr);
        const file = this.dataStore.app.vault.getAbstractFileByPath(filePath);

        if (!(file instanceof TFile)) return null;

        const content = await this.dataStore.platform.readFile(file);
        const lines = content.split(/\r?\n/);

        if (lineNo < 1 || lineNo > lines.length) return null;

        return lines[lineNo - 1];
    }

    public async completeTask(itemId: string, options?: { duration?: number }): Promise<void> {
        const [filePath, lineStr] = itemId.split('#');
        const lineNo = Number(lineStr);
        const file = this.dataStore.app.vault.getAbstractFileByPath(filePath);

        if (!(file instanceof TFile)) {
            console.warn(`[TaskService] File not found or is not a TFile: ${filePath}`);
            return;
        }

        const content = await this.dataStore.platform.readFile(file);
        const lines = content.split(/\r?\n/);
        if (lineNo < 1 || lineNo > lines.length) return;

        const rawLine = lines[lineNo - 1];
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

        await this.dataStore.platform.writeFile(file, lines.join('\n'));
    }

    public async updateTaskTime(itemId: string, newValues: { time?: string; duration?: number }): Promise<void> {
        const [filePath, lineStr] = itemId.split('#');
        const lineNo = Number(lineStr);
        const file = this.dataStore.app.vault.getAbstractFileByPath(filePath);

        if (!(file instanceof TFile)) {
            console.warn(`[TaskService] File not found for updating time: ${filePath}`);
            return;
        }

        const content = await this.dataStore.platform.readFile(file);
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
        await this.dataStore.platform.writeFile(file, lines.join('\n'));
    }
}