// src/core/services/ItemService.ts
import { singleton, inject } from 'tsyringe';
import { DataStore } from '@core/services/DataStore';
import { VAULT_PORT_TOKEN, type VaultPort } from '@core/ports/VaultPort';
import { nowHHMM, todayISO } from '@core/utils/date';
import { normalizeTaskTimeTriple } from '@core/utils/taskTime';
import { buildCompletedTaskRecord, markTaskDone } from '@core/utils/mark';
import { resolveTaskLineIndexForMutation } from '@core/services/recordInput/mutationLocator';
import { createRecordConflictError } from '@core/services/recordInput/mutationErrors';

interface ItemMutationOptions {
    autoRefresh?: boolean;
}

@singleton()
export class ItemService {
    constructor(
        @inject(DataStore) private dataStore: DataStore,
        @inject(VAULT_PORT_TOKEN) private vault: VaultPort
    ) {}

    public async getItemLine(itemId: string): Promise<string> {
        const context = await this.loadMutableTaskContext(itemId);
        return context.rawLine;
    }

    private async writeLines(path: string, lines: string[], options: ItemMutationOptions = {}): Promise<void> {
        await this.vault.writeFile(path, lines.join('\n'));
        if (options.autoRefresh !== false) {
            await this.dataStore.scanFileByPath(path);
            this.dataStore.notifyChange();
        }
    }

    public async completeItem(
        itemId: string,
        options?: { duration?: number; startTime?: string; endTime?: string },
        mutationOptions: ItemMutationOptions = {},
    ): Promise<void> {
        const context = await this.loadMutableTaskContext(itemId);
        const { path, index, rawLine, item } = context;
        const lines = [...context.lines];

        if (options) {
            const fallbackEndTime = options.endTime || nowHHMM();
            const seedOptions = {
                duration: typeof options.duration === 'number' ? options.duration : undefined,
                startTime: options.startTime || undefined,
                endTime: fallbackEndTime,
            };
            const normalizedTriple = seedOptions.duration !== undefined
                ? normalizeTaskTimeTriple(seedOptions)
                : {
                    startTime: seedOptions.startTime,
                    endTime: fallbackEndTime,
                    duration: undefined,
                };
            const normalizedOptions = {
                duration: normalizedTriple.duration,
                startTime: normalizedTriple.startTime,
                endTime: normalizedTriple.endTime || fallbackEndTime,
            };

            const { completedLine, nextTaskLine } = markTaskDone(
                rawLine,
                todayISO(),
                normalizedOptions.endTime || nowHHMM(),
                normalizedOptions,
            );
            lines[index] = completedLine;
            if (nextTaskLine) {
                lines.splice(index + 1, 0, nextTaskLine);
            }
            await this.writeLines(path, lines, mutationOptions);
            return;
        }

        if (item && item.duration) {
            const durationMinutes = item.duration;
            const endTime = nowHHMM();
            const normalizedTriple = normalizeTaskTimeTriple({ endTime, duration: durationMinutes });
            const startTime = normalizedTriple.startTime || undefined;

            const calculatedOptions = {
                duration: normalizedTriple.duration ?? durationMinutes,
                startTime,
                endTime,
            };

            const { completedLine, nextTaskLine } = markTaskDone(
                rawLine,
                todayISO(),
                endTime,
                calculatedOptions,
            );
            lines[index] = completedLine;
            if (nextTaskLine) {
                lines.splice(index + 1, 0, nextTaskLine);
            }
            await this.writeLines(path, lines, mutationOptions);
            return;
        }

        const { completedLine, nextTaskLine } = markTaskDone(rawLine, todayISO(), nowHHMM());
        lines[index] = completedLine;
        if (nextTaskLine) {
            lines.splice(index + 1, 0, nextTaskLine);
        }
        await this.writeLines(path, lines, mutationOptions);
    }

    public async appendCompletionRecord(
        itemId: string,
        options?: { duration?: number; startTime?: string; endTime?: string },
        mutationOptions: ItemMutationOptions = {},
    ): Promise<void> {
        const context = await this.loadMutableTaskContext(itemId);
        const { path, index, rawLine } = context;
        const lines = [...context.lines];
        const completedLine = buildCompletedTaskRecord(
            rawLine,
            todayISO(),
            options?.endTime || nowHHMM(),
            options,
        );
        lines.splice(index + 1, 0, completedLine);
        await this.writeLines(path, lines, mutationOptions);
    }

    public async updateItemTime(
        itemId: string,
        updates: { time?: string; endTime?: string; duration?: number },
        mutationOptions: ItemMutationOptions = {},
    ): Promise<void> {
        const context = await this.loadMutableTaskContext(itemId);
        const { path, index, rawLine } = context;
        const lines = [...context.lines];
        let line = rawLine;

        if (updates.time !== undefined) {
            line = this.upsertKvTag(line, '时间', updates.time);
        }
        if (updates.endTime !== undefined) {
            line = this.upsertKvTag(line, '结束', updates.endTime);
        }
        if (updates.duration !== undefined) {
            line = this.upsertKvTag(line, '时长', String(updates.duration));
        }

        lines[index] = line;
        await this.writeLines(path, lines, mutationOptions);
    }

    private async loadMutableTaskContext(itemId: string): Promise<{
        path: string;
        index: number;
        lines: string[];
        rawLine: string;
        item?: { content?: string; title?: string; duration?: number };
    }> {
        const { path, lineNo } = this.parseItemId(itemId);
        const content = await this.vault.readFile(path);
        if (content == null) {
            throw createRecordConflictError('record_path_missing', `找不到条目文件: ${path}`);
        }

        const lines = content.split('\n');
        const item = this.dataStore.queryItems().find((candidate) => candidate.id === itemId);
        const resolvedIndex = resolveTaskLineIndexForMutation(lines, item ?? null, lineNo - 1);
        const rawLine = lines[resolvedIndex];

        if (!rawLine) {
            throw createRecordConflictError('record_item_missing', '条目已不存在，无法继续操作。');
        }

        return {
            path,
            index: resolvedIndex,
            lines,
            rawLine,
            item: item
                ? {
                    content: item.content,
                    title: item.title,
                    duration: item.duration,
                }
                : undefined,
        };
    }

    private parseItemId(itemId: string): { path: string; lineNo: number } {
        const hashIndex = itemId.lastIndexOf('#');
        if (hashIndex === -1) throw createRecordConflictError('record_locator_invalid', `无效的条目ID格式: ${itemId}`);

        const path = itemId.substring(0, hashIndex);
        const lineNo = parseInt(itemId.substring(hashIndex + 1), 10);
        if (isNaN(lineNo)) throw createRecordConflictError('record_locator_invalid', `无效的条目行号: ${itemId}`);

        return { path, lineNo };
    }

    private upsertKvTag(line: string, key: string, value: string): string {
        const pattern = new RegExp(`([\\(\\[]\\s*${key}::\\s*)[^\\)\\]]*(\\s*[\\)\\]])`);
        if (pattern.test(line)) {
            return line.replace(pattern, `$1${value}$2`);
        }
        return `${line.trim()} (${key}:: ${value})`;
    }
}
