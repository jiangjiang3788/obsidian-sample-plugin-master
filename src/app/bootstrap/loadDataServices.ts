import { container } from 'tsyringe';

import { DataStore, ActionService, InputService, ItemService, devError, devLog, devTime, devTimeEnd } from '@core/public';
import { startMeasure } from '@shared/utils/performance';

import type { ServiceManagerServices } from '@/app/ServiceManager.services';

export async function loadDataServices(opts: {
    services: ServiceManagerServices;
    getScanDataPromise: () => Promise<void> | null;
    setScanDataPromise: (p: Promise<void>) => void;
}): Promise<void> {
    const { services, getScanDataPromise, setScanDataPromise } = opts;

    if (services.dataStore) return;

    const stopMeasure = startMeasure('ServiceManager.loadDataServices');

    services.dataStore = container.resolve(DataStore);
    services.actionService = container.resolve(ActionService);
    services.inputService = container.resolve(InputService);
    services.itemService = container.resolve(ItemService);

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
