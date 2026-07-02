import type { VaultPort } from '@core/ports/VaultPort';
import type { DataStore } from '../DataStore';
import type { ItemMutationOptions } from './types';

export class ItemMutationWriter {
    constructor(
        private readonly dataStore: DataStore,
        private readonly vault: VaultPort,
    ) {}

    async writeLines(path: string, lines: string[], options: ItemMutationOptions = {}): Promise<void> {
        await this.vault.writeFile(path, lines.join('\n'));
        if (options.autoRefresh !== false) {
            await this.dataStore.scanFileByPath(path);
            this.dataStore.notifyChange();
        }
    }
}
