import type { RecordRepository } from '@/core/records/RecordRepository';
import type { ItemMutationOptions } from './types';

export class InlineFieldMutation {
    constructor(private readonly repository: RecordRepository) {}

    /**
     * Foundation v2 write-back: field edits are Record patches addressed by stable Record ID.
     * The public method name is retained for callers, but only canonical Record fields are emitted.
     */
    async upsertItemInlineFields(
        itemId: string,
        fields: Record<string, string>,
        _mutationOptions: ItemMutationOptions = {},
    ): Promise<{ path: string; beforeLine: string; afterLine: string }> {
        const before = await this.repository.getById(itemId);
        if (!before) throw new Error(`record_not_found:${itemId}`);
        const path = before.source?.path || before.file?.path || '';
        if (!path) throw new Error(`record_location_unavailable:${itemId}`);
        const updated = await this.repository.update(itemId, fields);
        return {
            path,
            beforeLine: before.rawSource || '',
            afterLine: updated.rawSource || '',
        };
    }
}
