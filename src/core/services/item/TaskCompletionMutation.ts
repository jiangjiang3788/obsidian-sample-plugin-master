import { nowHHMM, todayISO } from '@core/utils/date';
import { applyTaskTimePolicy } from '@core/records/task/taskTime';
import { buildCompletedTaskRecord, markTaskDone } from '@core/records/task/mark';
import { upsertKvTag } from './lineMetadata';
import type { ItemLocator } from './ItemLocator';
import type { ItemMutationWriter } from './ItemMutationWriter';
import type { ItemCompletionOptions, ItemMutationOptions, ItemTimeUpdates } from './types';

export class TaskCompletionMutation {
    constructor(
        private readonly locator: ItemLocator,
        private readonly writer: ItemMutationWriter,
    ) {}

    async getItemLine(itemId: string): Promise<string> {
        const context = await this.locator.loadMutableTaskContext(itemId);
        return context.rawLine;
    }

    async completeItem(
        itemId: string,
        options?: ItemCompletionOptions,
        mutationOptions: ItemMutationOptions = {},
    ): Promise<void> {
        const context = await this.locator.loadMutableTaskContext(itemId);
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
                ? applyTaskTimePolicy({ ...seedOptions, mode: 'finalize', direction: 'forward' })
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
            await this.writer.writeLines(path, lines, mutationOptions);
            return;
        }

        if (item && item.duration) {
            const durationMinutes = item.duration;
            const endTime = nowHHMM();
            const normalizedTriple = applyTaskTimePolicy({ endTime, duration: durationMinutes, mode: 'finalize', direction: 'forward' });
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
            await this.writer.writeLines(path, lines, mutationOptions);
            return;
        }

        const { completedLine, nextTaskLine } = markTaskDone(rawLine, todayISO(), nowHHMM());
        lines[index] = completedLine;
        if (nextTaskLine) {
            lines.splice(index + 1, 0, nextTaskLine);
        }
        await this.writer.writeLines(path, lines, mutationOptions);
    }

    async appendCompletionRecord(
        itemId: string,
        options?: ItemCompletionOptions,
        mutationOptions: ItemMutationOptions = {},
    ): Promise<void> {
        const context = await this.locator.loadMutableTaskContext(itemId);
        const { path, index, rawLine } = context;
        const lines = [...context.lines];
        const completedLine = buildCompletedTaskRecord(
            rawLine,
            todayISO(),
            options?.endTime || nowHHMM(),
            options,
        );
        lines.splice(index + 1, 0, completedLine);
        await this.writer.writeLines(path, lines, mutationOptions);
    }

    async updateItemTime(
        itemId: string,
        updates: ItemTimeUpdates,
        mutationOptions: ItemMutationOptions = {},
    ): Promise<void> {
        const context = await this.locator.loadMutableTaskContext(itemId);
        const { path, index, rawLine } = context;
        const lines = [...context.lines];
        let line = rawLine;

        if (updates.time !== undefined) {
            line = upsertKvTag(line, '时间', updates.time);
        }
        if (updates.endTime !== undefined) {
            line = upsertKvTag(line, '结束', updates.endTime);
        }
        if (updates.duration !== undefined) {
            line = upsertKvTag(line, '时长', String(updates.duration));
        }

        lines[index] = line;
        await this.writer.writeLines(path, lines, mutationOptions);
    }
}
