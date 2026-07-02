import { inject, singleton } from 'tsyringe';
import { VAULT_PORT_TOKEN, type VaultPort } from '@core/ports/VaultPort';
import { DataStore } from '../DataStore';
import { GoalTemplateMigrationMutation } from './GoalTemplateMigrationMutation';
import { InlineFieldMutation } from './InlineFieldMutation';
import { ItemLocator } from './ItemLocator';
import { ItemMutationWriter } from './ItemMutationWriter';
import { MigrationBackupService } from './MigrationBackupService';
import { TaskCompletionMutation } from './TaskCompletionMutation';
import type {
    GoalTemplateMigrationResult,
    ItemCompletionOptions,
    ItemMutationOptions,
    ItemTimeUpdates,
    MigrationBackupResult,
} from './types';

/**
 * Item mutation facade.
 *
 * V29 后 ItemService 只保留对外 API 和 DI 组装；定位、写回、任务完成、
 * inline 字段、block metadata、迁移备份分别下沉到 item/ 子模块。
 */
@singleton()
export class ItemService {
    private readonly taskCompletion: TaskCompletionMutation;
    private readonly inlineFields: InlineFieldMutation;
    private readonly goalTemplateMigration: GoalTemplateMigrationMutation;
    private readonly migrationBackup: MigrationBackupService;

    constructor(
        @inject(DataStore) dataStore: DataStore,
        @inject(VAULT_PORT_TOKEN) vault: VaultPort,
    ) {
        const locator = new ItemLocator(dataStore, vault);
        const writer = new ItemMutationWriter(dataStore, vault);
        this.taskCompletion = new TaskCompletionMutation(locator, writer);
        this.inlineFields = new InlineFieldMutation(locator, writer);
        this.goalTemplateMigration = new GoalTemplateMigrationMutation(dataStore, vault, locator, writer);
        this.migrationBackup = new MigrationBackupService(dataStore, vault);
    }

    getItemLine(itemId: string): Promise<string> {
        return this.taskCompletion.getItemLine(itemId);
    }

    completeItem(
        itemId: string,
        options?: ItemCompletionOptions,
        mutationOptions: ItemMutationOptions = {},
    ): Promise<void> {
        return this.taskCompletion.completeItem(itemId, options, mutationOptions);
    }

    appendCompletionRecord(
        itemId: string,
        options?: ItemCompletionOptions,
        mutationOptions: ItemMutationOptions = {},
    ): Promise<void> {
        return this.taskCompletion.appendCompletionRecord(itemId, options, mutationOptions);
    }

    updateItemTime(
        itemId: string,
        updates: ItemTimeUpdates,
        mutationOptions: ItemMutationOptions = {},
    ): Promise<void> {
        return this.taskCompletion.updateItemTime(itemId, updates, mutationOptions);
    }

    upsertItemInlineFields(
        itemId: string,
        fields: Record<string, string>,
        mutationOptions: ItemMutationOptions = {},
    ): Promise<{ path: string; beforeLine: string; afterLine: string }> {
        return this.inlineFields.upsertItemInlineFields(itemId, fields, mutationOptions);
    }

    upsertItemGoalTemplateMigrationFields(
        itemId: string,
        fields: Record<string, string>,
        mutationOptions: ItemMutationOptions = {},
    ): Promise<GoalTemplateMigrationResult> {
        return this.goalTemplateMigration.upsertItemGoalTemplateMigrationFields(itemId, fields, mutationOptions);
    }

    createMigrationBackup(backupRoot: string, settings: unknown): Promise<MigrationBackupResult> {
        return this.migrationBackup.createMigrationBackup(backupRoot, settings);
    }
}
