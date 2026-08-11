import type { VaultPort } from '@core/ports/VaultPort';
import type { DataStore } from '../DataStore';
import type { MigrationBackupResult } from './types';

export class MigrationBackupService {
    constructor(
        private readonly dataStore: DataStore,
        private readonly vault: VaultPort,
    ) {}

    /**
     * 目标迁移前备份。
     * - 备份当前 settings 到 JSON
     * - 备份 DataStore 中已索引到的 Markdown 文件
     * - 不修改原始记录；用于用户侧“一键迁移前备份”
     */
    async createMigrationBackup(backupRoot: string, settings: unknown): Promise<MigrationBackupResult> {
        const root = String(backupRoot || '').replace(/^\/+|\/+$/g, '') || `ThinkOS/Backups/goal-migration-${Date.now()}`;
        const settingsPath = `${root}/data-settings.json`;
        const items = this.dataStore.queryItems();
        const markdownPaths = Array.from(new Set(items
            .map((item) => item.source?.path || item.file?.path || '')
            .filter((path): path is string => !!path)
        )).sort((left, right) => left.localeCompare(right));

        await this.vault.writeFile(settingsPath, JSON.stringify(settings, null, 2));
        await this.vault.writeFile(`${root}/markdown-paths.json`, JSON.stringify(markdownPaths, null, 2));

        const failedPaths: string[] = [];
        let markdownFileCount = 0;
        for (const path of markdownPaths) {
            try {
                const content = await this.vault.readFile(path);
                if (content == null) {
                    failedPaths.push(path);
                    continue;
                }
                await this.vault.writeFile(`${root}/markdown/${path}`, content);
                markdownFileCount += 1;
            } catch (_error) {
                failedPaths.push(path);
            }
        }

        await this.vault.writeFile(`${root}/manifest.json`, JSON.stringify({
            createdAt: new Date().toISOString(),
            settingsPath,
            markdownFileCount,
            failedPaths,
        }, null, 2));

        return { backupRoot: root, settingsPath, markdownFileCount, failedPaths };
    }
}
