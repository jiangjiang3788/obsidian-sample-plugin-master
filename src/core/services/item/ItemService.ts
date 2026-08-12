import { inject, singleton } from 'tsyringe';
import { VAULT_PORT_TOKEN, type VaultPort } from '@core/ports/VaultPort';
import { DataStore } from '../DataStore';
import { GoalTemplateMigrationMutation } from './GoalTemplateMigrationMutation';
import { InlineFieldMutation } from './InlineFieldMutation';
import { MigrationBackupService } from './MigrationBackupService';
import { TaskCompletionMutation, type TaskSeriesUpdate } from './TaskCompletionMutation';
import { TaskSessionMutation } from './TaskSessionMutation';
import type { TaskSessionCreateInput } from '@/core/types/timer';
import { RecordRepository } from '@/core/records/RecordRepository';
import type {
    GoalTemplateMigrationResult,
    ItemMutationOptions,
    ItemTimeUpdates,
    MigrationBackupResult,
} from './types';

/**
 * RecordViewItem mutation facade.
 *
 * V29 后 ItemService 只保留对外 API 和 DI 组装；定位、写回、任务完成、
 * inline 字段、block metadata、迁移备份分别下沉到 item/ 子模块。
 */
@singleton()
export class ItemService {
    private readonly taskCompletion: TaskCompletionMutation;
    private readonly taskSessions: TaskSessionMutation;
    private readonly inlineFields: InlineFieldMutation;
    private readonly goalTemplateMigration: GoalTemplateMigrationMutation;
    private readonly migrationBackup: MigrationBackupService;

    constructor(
        @inject(DataStore) dataStore: DataStore,
        @inject(VAULT_PORT_TOKEN) vault: VaultPort,
    ) {
        const recordRepository = new RecordRepository(vault, dataStore);
        this.taskSessions = new TaskSessionMutation(dataStore, recordRepository);
        this.taskCompletion = new TaskCompletionMutation(dataStore, recordRepository, this.taskSessions);
        this.inlineFields = new InlineFieldMutation(recordRepository);
        this.goalTemplateMigration = new GoalTemplateMigrationMutation(recordRepository);
        this.migrationBackup = new MigrationBackupService(dataStore, vault);
    }

    completeItem(
        itemId: string,
        mutationOptions: ItemMutationOptions = {},
    ): Promise<void> {
        return this.taskCompletion.completeItem(itemId, mutationOptions);
    }

    createTaskSession(taskId: string, session: TaskSessionCreateInput) {
        return this.taskSessions.createSession(taskId, session);
    }

    linkEnergySnapshot(energyRecordId: string) {
        return this.taskSessions.linkEnergySnapshot(energyRecordId);
    }

    completeItemWithSession(
        itemId: string,
        session: TaskSessionCreateInput,
        mutationOptions: ItemMutationOptions = {},
    ): Promise<void> {
        return this.taskCompletion.completeItemWithSession(itemId, session, mutationOptions);
    }


    cancelItem(itemId: string): Promise<void> {
        return this.taskCompletion.cancelItem(itemId);
    }

    skipItem(itemId: string): Promise<void> {
        return this.taskCompletion.skipItem(itemId);
    }

    reopenItem(itemId: string): Promise<void> {
        return this.taskCompletion.reopenItem(itemId);
    }

    stopTaskSeries(seriesId: string, options: { cancelCurrent?: boolean } = {}): Promise<void> {
        return this.taskCompletion.stopSeries(seriesId, options);
    }

    repairTaskSeriesCurrentTask(seriesId: string): Promise<'already-valid' | 'repaired'> {
        return this.taskCompletion.repairSeriesCurrentTask(seriesId);
    }

    updateTaskSeries(
        seriesId: string,
        update: TaskSeriesUpdate,
        options: { includeCurrent?: boolean } = {},
    ): Promise<void> {
        return this.taskCompletion.updateSeries(seriesId, update, options);
    }

    async updateItemTime(
        itemId: string,
        updates: ItemTimeUpdates,
        _mutationOptions: ItemMutationOptions = {},
    ): Promise<void> {
        await this.taskSessions.updateSessionTime(itemId, updates);
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
