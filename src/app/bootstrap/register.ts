import { container } from 'tsyringe';

import {
    SETTINGS_PERSISTENCE_TOKEN,
    VaultSettingsPersistence,
} from '@core/services/public';

import { diDebug } from '@/app/diagnostics/diDiagnostics';

/**
 * Step 0: register the concrete settings persistence adapter.
 *
 * The adapter writes through IPluginStorage, so app/bootstrap no longer knows
 * about either Obsidian Plugin.loadData/saveData or the physical settings path.
 */
export function registerSettingsPersistence(): void {
    container.register(SETTINGS_PERSISTENCE_TOKEN, {
        useClass: VaultSettingsPersistence,
    });

    // DI diagnostics (dev only, opt-in)
    diDebug('after register SettingsPersistence, isRegistered =', container.isRegistered(SETTINGS_PERSISTENCE_TOKEN));
}
