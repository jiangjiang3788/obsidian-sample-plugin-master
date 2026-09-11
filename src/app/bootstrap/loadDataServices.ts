import { devError, devLog, devTime, devTimeEnd } from '@core/utils/public';
import { startMeasure } from '@shared/utils/public';

import type { PluginHost } from '@core/ports/public';
import type { WhiteboardStore } from '@core/whiteboard/public';

import type { ServiceManagerServices } from '@/app/ServiceManager.services';
import type { Services } from '@/app/services.types';
import type { BootstrapResolved } from '@/app/bootstrap/buildRuntime';


export function scheduleWhiteboardRestore(opts: {
    plugin: PluginHost;
    store: WhiteboardStore;
    onError?: (error: unknown) => void;
}): void {
    const { plugin, store, onError } = opts;
    const startRestore = () => {
        void store.initialize().catch((error) => {
            if (store.getStatus().state === 'disposed') return;
            onError?.(error);
        });
    };

    const workspace = plugin.app?.workspace as { onLayoutReady?: (callback: () => void) => void } | undefined;
    if (typeof workspace?.onLayoutReady === 'function') {
        workspace.onLayoutReady(startRestore);
        return;
    }

    // 非 Obsidian 测试宿主没有 workspace lifecycle 时，保持可测试的降级路径。
    startRestore();
}

export async function loadDataServices(opts: {
    services: ServiceManagerServices;
    runtime: Pick<Services, 'dataStore' | 'inputService'>;
    bootstrap: Pick<BootstrapResolved, 'actionService' | 'itemService' | 'chatSessionStore' | 'whiteboardStore'>;
    getScanDataPromise: () => Promise<void> | null;
    setScanDataPromise: (p: Promise<void>) => void;
}): Promise<void> {
    const { services, runtime, bootstrap, getScanDataPromise, setScanDataPromise } = opts;

    if (services.dataStore) return;

    const stopMeasure = startMeasure('ServiceManager.loadDataServices');

    // 从 buildRuntime/resolveBootstrap 下发（避免散落 resolve）
    services.dataStore = runtime.dataStore;
    services.inputService = runtime.inputService;
    services.actionService = bootstrap.actionService;
    services.itemService = bootstrap.itemService;
    services.chatSessionStore = bootstrap.chatSessionStore;
    services.whiteboardStore = bootstrap.whiteboardStore;
    // Whiteboard durable state is restored after Obsidian workspace/Vault layout is ready.
    // Do not perform Vault-cache-sensitive reads in the same turn as plugin bootstrap.

    // 触发后台扫描
    scanDataInBackground({ services, getScanDataPromise, setScanDataPromise });

    const duration = stopMeasure();
    devLog(`[ThinkPlugin] 数据服务加载完成 (${duration.toFixed(2)}ms)`);
}

function scheduleBackgroundScan(task: () => void): void {
    const g = globalThis as typeof globalThis & {
        requestIdleCallback?: (callback: () => void, options?: { timeout?: number }) => number;
    };

    if (typeof g.requestIdleCallback === 'function') {
        g.requestIdleCallback(task, { timeout: 1200 });
        return;
    }

    // Obsidian desktop/mobile may not expose requestIdleCallback consistently.
    // setTimeout keeps ServiceManager bootstrap from doing vault IO on the same turn.
    setTimeout(task, 0);
}

function scanDataInBackground(opts: {
    services: ServiceManagerServices;
    getScanDataPromise: () => Promise<void> | null;
    setScanDataPromise: (p: Promise<void>) => void;
}): Promise<void> {
    const { services, getScanDataPromise, setScanDataPromise } = opts;

    const existing = getScanDataPromise();
    if (existing) return existing;

    const promise = new Promise<void>((resolve) => {
        scheduleBackgroundScan(() => {
            devTime('[ThinkPlugin] 数据扫描');
            services
                .dataStore!.initialScan()
                .then(() => {
                    devTimeEnd('[ThinkPlugin] 数据扫描');
                    services.dataStore!.notifyChange();
                    resolve();
                })
                .catch((error) => {
                    devError('[ThinkPlugin] 数据扫描失败:', error);
                    resolve();
                });
        });
    });

    setScanDataPromise(promise);
    return promise;
}
