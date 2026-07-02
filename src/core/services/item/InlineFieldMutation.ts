import { normalizeNonEmptyFieldEntries, upsertKvTag } from './lineMetadata';
import type { ItemLocator } from './ItemLocator';
import type { ItemMutationWriter } from './ItemMutationWriter';
import type { ItemMutationOptions } from './types';

export class InlineFieldMutation {
    constructor(
        private readonly locator: ItemLocator,
        private readonly writer: ItemMutationWriter,
    ) {}

    /**
     * 目标中心 Markdown 回填：在定位到的记录行上补齐内联元数据。
     * 保留给任务行使用：只改当前行的 `(key:: value)`，不移动正文。
     */
    async upsertItemInlineFields(
        itemId: string,
        fields: Record<string, string>,
        mutationOptions: ItemMutationOptions = {},
    ): Promise<{ path: string; beforeLine: string; afterLine: string }> {
        const context = await this.locator.loadMutableTaskContext(itemId);
        const { path, index, rawLine } = context;
        const lines = [...context.lines];
        let line = rawLine;

        for (const [key, value] of normalizeNonEmptyFieldEntries(fields)) {
            line = upsertKvTag(line, key, value);
        }

        lines[index] = line;
        await this.writer.writeLines(path, lines, mutationOptions);
        return { path, beforeLine: rawLine, afterLine: line };
    }
}
