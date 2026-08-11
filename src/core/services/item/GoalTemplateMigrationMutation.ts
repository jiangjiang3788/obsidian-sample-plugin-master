import type { RecordRepository } from '@/core/records/RecordRepository';
import type { GoalTemplateMigrationResult, ItemMutationOptions } from './types';

export class GoalTemplateMigrationMutation {
    constructor(private readonly repository: RecordRepository) {}

    /** Goal/Template migration now patches the Record Block by stable Record ID. */
    async upsertItemGoalTemplateMigrationFields(
        itemId: string,
        fields: Record<string, string>,
        _mutationOptions: ItemMutationOptions = {},
    ): Promise<GoalTemplateMigrationResult> {
        const before = await this.repository.getById(itemId);
        if (!before) throw new Error(`record_not_found:${itemId}`);
        const path = before.source?.path || before.file?.path || '';
        if (!path) throw new Error(`record_location_unavailable:${itemId}`);
        const updated = await this.repository.update(itemId, fields);
        return {
            path,
            beforeText: before.rawSource || '',
            afterText: updated.rawSource || '',
            shape: 'block-metadata',
        };
    }
}
