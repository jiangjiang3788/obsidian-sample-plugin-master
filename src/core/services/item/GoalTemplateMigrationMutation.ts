import type { VaultPort } from '@core/ports/VaultPort';
import { resolveBlockRangeForMutation } from '@core/recordInput/mutationLocator';
import { createRecordConflictError } from '@core/recordInput/mutationErrors';
import type { DataStore } from '../DataStore';
import { parseItemId } from './itemId';
import { normalizeNonEmptyFieldEntries, upsertBlockMetadataLine, upsertKvTag } from './lineMetadata';
import type { ItemLocator } from './ItemLocator';
import type { ItemMutationWriter } from './ItemMutationWriter';
import type { GoalTemplateMigrationResult, ItemMutationOptions } from './types';

export class GoalTemplateMigrationMutation {
    constructor(
        private readonly dataStore: DataStore,
        private readonly vault: VaultPort,
        private readonly locator: ItemLocator,
        private readonly writer: ItemMutationWriter,
    ) {}

    /**
     * 目标迁移专用写回：
     * - task：写回当前任务行内 `(字段:: 值)`；
     * - block：写回 `<!-- start --> ... <!-- end -->` 内的块元数据行。
     *
     * 这样旧记录改写不再只覆盖任务行，也能安全处理计划/总结/打卡等块记录。
     */
    async upsertItemGoalTemplateMigrationFields(
        itemId: string,
        fields: Record<string, string>,
        mutationOptions: ItemMutationOptions = {},
    ): Promise<GoalTemplateMigrationResult> {
        const { path, lineNo } = parseItemId(itemId);
        const content = await this.vault.readFile(path);
        if (content == null) {
            throw createRecordConflictError('record_path_missing', `找不到条目文件: ${path}`);
        }

        const lines = content.split('\n');
        const item = this.dataStore.queryItems().find((candidate) => candidate.id === itemId);
        const expectedIndex = lineNo - 1;

        if (item?.type === 'block') {
            const range = resolveBlockRangeForMutation(lines, item, expectedIndex);
            const beforeText = lines.slice(range.startIndex, range.endIndex + 1).join('\n');
            let endIndex = range.endIndex;

            for (const [key, value] of normalizeNonEmptyFieldEntries(fields)) {
                endIndex = upsertBlockMetadataLine(lines, range.startIndex, endIndex, key, value);
            }

            const afterText = lines.slice(range.startIndex, endIndex + 1).join('\n');
            await this.writer.writeLines(path, lines, mutationOptions);
            return { path, beforeText, afterText, shape: 'block-metadata' };
        }

        const context = await this.locator.loadMutableTaskContext(itemId);
        const mutableLines = [...context.lines];
        let line = context.rawLine;
        for (const [key, value] of normalizeNonEmptyFieldEntries(fields)) {
            line = upsertKvTag(line, key, value);
        }
        mutableLines[context.index] = line;
        await this.writer.writeLines(path, mutableLines, mutationOptions);
        return { path, beforeText: context.rawLine, afterText: line, shape: 'task-inline' };
    }
}
