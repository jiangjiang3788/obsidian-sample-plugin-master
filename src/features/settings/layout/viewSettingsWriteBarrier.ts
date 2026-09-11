export interface ViewSettingsWriteBarrier {
    track(operation: Promise<void>): void;
    flush(): Promise<void>;
}

/**
 * Tracks the real SettingsRepository writes triggered by a View settings editor.
 * The Save button uses flush() as a persistence barrier so an immediate app reload
 * cannot race a still-pending plugin.saveData() call.
 */
export function createViewSettingsWriteBarrier(): ViewSettingsWriteBarrier {
    let pending: Promise<void> = Promise.resolve();
    return {
        track(operation: Promise<void>): void {
            pending = Promise.all([pending, operation]).then(() => undefined);
            // Changes auto-persist even if the user never presses Save. Prevent an
            // early rejected write from becoming an unhandled promise rejection;
            // flush() still observes the same rejected pending chain.
            void pending.catch(() => undefined);
        },
        flush(): Promise<void> {
            return pending;
        },
    };
}
