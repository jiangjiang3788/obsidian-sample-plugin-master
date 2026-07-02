import type { VaultPort } from '@core/ports/VaultPort';
import { resolveTaskLineIndexForMutation } from '@core/recordInput/mutationLocator';
import { createRecordConflictError } from '@core/recordInput/mutationErrors';
import type { DataStore } from '../DataStore';
import { parseItemId } from './itemId';
import type { MutableTaskContext } from './types';

export class ItemLocator {
    constructor(
        private readonly dataStore: DataStore,
        private readonly vault: VaultPort,
    ) {}

    async loadMutableTaskContext(itemId: string): Promise<MutableTaskContext> {
        const { path, lineNo } = parseItemId(itemId);
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
}
