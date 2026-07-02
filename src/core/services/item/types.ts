export interface ItemMutationOptions {
    autoRefresh?: boolean;
}

export interface ItemCompletionOptions {
    duration?: number;
    startTime?: string;
    endTime?: string;
}

export interface ItemTimeUpdates {
    time?: string;
    endTime?: string;
    duration?: number;
}

export interface MutableTaskContext {
    path: string;
    index: number;
    lines: string[];
    rawLine: string;
    item?: {
        content?: string;
        title?: string;
        duration?: number;
    };
}

export interface GoalTemplateMigrationResult {
    path: string;
    beforeText: string;
    afterText: string;
    shape: 'task-inline' | 'block-metadata';
}

export interface MigrationBackupResult {
    backupRoot: string;
    settingsPath: string;
    markdownFileCount: number;
    failedPaths: string[];
}
