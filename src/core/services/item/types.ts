export interface ItemMutationOptions {
    autoRefresh?: boolean;
}

export interface GoalTemplateMigrationResult {
    path: string;
    beforeText: string;
    afterText: string;
    shape: 'block-metadata';
}

export interface MigrationBackupResult {
    backupRoot: string;
    settingsPath: string;
    markdownFileCount: number;
    failedPaths: string[];
}
