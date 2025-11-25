// src/core/services/ItemService.ts
// [架构标准化] 抽象化业务概念，避免 core 层出现具体业务词汇
import { singleton, inject } from 'tsyringe';
import { App, TFile, Notice } from 'obsidian';
import { DataStore } from '@core/services/DataStore';
import { AppToken } from '@core/services/types';
import { dayjs, nowHHMM, todayISO, timeToMinutes, minutesToTime } from '@core/utils/date';
import { markTaskDone } from '@core/utils/mark';

@singleton()
export class ItemService {
    constructor(
        @inject(DataStore) private dataStore: DataStore,
        @inject(AppToken) private app: App
    ) {}

    /**
     * [架构标准化] 根据条目ID获取其在文件中的原始行文本。
     */
    public async getItemLine(itemId: string): Promise<string> {
        const { path, lineNo } = this.parseItemId(itemId);
        const file = this.app.vault.getAbstractFileByPath(path);
        if (!(file instanceof TFile)) throw new Error(`找不到条目文件: ${path}`);

        const content = await this.app.vault.read(file);
        const lines = content.split('\n');
        if (lineNo > lines.length) throw new Error(`文件 ${path} 的行号 ${lineNo} 超出范围。`);

        return lines[lineNo - 1];
    }

    /**
     * [架构标准化] 更新文件中的特定行。
     */
    private async updateItemLine(path: string, lineNo: number, newLine: string, nextLine?: string): Promise<void> {
        const file = this.app.vault.getAbstractFileByPath(path);
        if (!(file instanceof TFile)) throw new Error(`找不到文件: ${path}`);
        
        const content = await this.app.vault.read(file);
        const lines = content.split('\n');
        lines[lineNo - 1] = newLine;

        if (nextLine) {
            lines.splice(lineNo, 0, nextLine);
        }

        await this.app.vault.modify(file, lines.join('\n'));
        this.dataStore.scanFile(file).then(() => this.dataStore.notifyChange());
    }

    /**
     * [架构标准化] 完成一个条目。
     */
    public async completeItem(itemId: string, options?: { duration?: number; startTime?: string; endTime?: string }): Promise<void> {
        const { path, lineNo } = this.parseItemId(itemId);
        const rawLine = await this.getItemLine(itemId);

        // 如果 options 明确从外部（如计时器）传入，则直接使用它们
        if (options) {
            const { completedLine, nextTaskLine } = markTaskDone(
                rawLine,
                todayISO(),
                options.endTime || nowHHMM(),
                options
            );
            await this.updateItemLine(path, lineNo, completedLine, nextTaskLine);
            return;
        }

        // [核心修改] 如果是手动点击复选框，则执行新的计算逻辑
        const item = this.dataStore.queryItems().find(i => i.id === itemId);

        // 检查条目本身是否有"时长"属性
        if (item && item.duration) {
            const durationMinutes = item.duration;
            const endTime = nowHHMM(); // 当前时间作为结束时间
            const endMinutes = timeToMinutes(endTime);

            if (endMinutes !== null) {
                // 根据结束时间和时长反推开始时间
                const startMinutes = endMinutes - durationMinutes;
                const startTime = minutesToTime(startMinutes);

                const calculatedOptions = {
                    duration: durationMinutes,
                    startTime: startTime,
                    endTime: endTime
                };

                const { completedLine, nextTaskLine } = markTaskDone(
                    rawLine, todayISO(), endTime, calculatedOptions
                );
                await this.updateItemLine(path, lineNo, completedLine, nextTaskLine);
            } else {
                // 时间解析失败则回退
                const { completedLine, nextTaskLine } = markTaskDone(rawLine, todayISO(), nowHHMM());
                await this.updateItemLine(path, lineNo, completedLine, nextTaskLine);
            }
        } else {
            // 如果条目没有"时长"，则按旧逻辑处理
            const { completedLine, nextTaskLine } = markTaskDone(rawLine, todayISO(), nowHHMM());
            await this.updateItemLine(path, lineNo, completedLine, nextTaskLine);
        }
    }

    /**
     * [架构标准化] 更新条目的时间和/或时长。
     */
    public async updateItemTime(itemId: string, updates: { time?: string; endTime?: string; duration?: number }): Promise<void> {
        const { path, lineNo } = this.parseItemId(itemId);
        let line = await this.getItemLine(itemId);

        if (updates.time !== undefined) {
            line = this.upsertKvTag(line, '时间', updates.time);
        }
        if (updates.endTime !== undefined) {
            line = this.upsertKvTag(line, '结束', updates.endTime);
        }
        if (updates.duration !== undefined) {
            line = this.upsertKvTag(line, '时长', String(updates.duration));
        }

        await this.updateItemLine(path, lineNo, line);
    }

    /**
     * [架构标准化] 辅助函数：解析条目ID为路径和行号。
     */
    private parseItemId(itemId: string): { path: string; lineNo: number } {
        const hashIndex = itemId.lastIndexOf('#');
        if (hashIndex === -1) throw new Error(`无效的条目ID格式: ${itemId}`);
        
        const path = itemId.substring(0, hashIndex);
        const lineNo = parseInt(itemId.substring(hashIndex + 1), 10);
        if (isNaN(lineNo)) throw new Error(`无效的条目行号: ${itemId}`);

        return { path, lineNo };
    }

    /**
     * [架构标准化] 辅助函数：在条目行中更新或插入 (key:: value) 格式的标签。
     */
    private upsertKvTag(line: string, key: string, value: string): string {
        const pattern = new RegExp(`([\(\\[]\\s*${key}::\\s*)[^\\)\\]]*(\\s*[\\)\\]])`);
        if (pattern.test(line)) {
            // 如果已存在，则替换值
            return line.replace(pattern, `$1${value}$2`);
        } else {
            // 如果不存在，则追加
            return `${line.trim()} (${key}:: ${value})`;
        }
    }
}
