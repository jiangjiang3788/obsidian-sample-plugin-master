import { devError, devLog, devTime, devTimeEnd } from '@core/public';
import { startMeasure } from '@shared/public';

import type { ServiceManagerServices } from '@/app/ServiceManager.services';
import type { Services } from '@/app/services.types';
import type { BootstrapResolved } from '@/app/bootstrap/buildRuntime';

export async function loadDataServices(opts: {
    services: ServiceManagerServices;
    runtime: Pick<Services, 'dataStore' | 'inputService'>;
    bootstrap: Pick<BootstrapResolved, 'actionService' | 'itemService' | 'chatSessionStore'>;
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

    // 触发后台扫描
    scanDataInBackground({ services, getScanDataPromise, setScanDataPromise });

    const duration = stopMeasure();
    devLog(`[ThinkPlugin] 数据服务加载完成 (${duration.toFixed(2)}ms)`);
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
        devTime('[ThinkPlugin] 数据扫描');
        services
            .dataStore!.initialScan()
            .then(() => {
                devTimeEnd('[ThinkPlugin] 数据扫描');
                services.dataStore!.notifyChange();
                services.dataStore!.writePerformanceReport('initialScan');
                resolve();
            })
            .catch((error) => {
                devError('[ThinkPlugin] 数据扫描失败:', error);
                resolve();
            });
    });

    setScanDataPromise(promise);
    return promise;
}
