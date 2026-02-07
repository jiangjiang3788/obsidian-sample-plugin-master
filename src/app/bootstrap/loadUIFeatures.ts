import type ThinkPlugin from '@main';
import { devError } from '@core/public';

import { FeatureLoader } from '@/app/FeatureLoader';
import type { ServiceManagerServices } from '@/app/ServiceManager.services';

export async function loadUIFeatures(opts: {
    plugin: ThinkPlugin;
    services: ServiceManagerServices;
    scanDataPromise: Promise<void> | null;
    getFeatureLoader: () => FeatureLoader | null;
    setFeatureLoader: (loader: FeatureLoader | null) => void;
}): Promise<void> {
    const { plugin, services, scanDataPromise, getFeatureLoader, setFeatureLoader } = opts;

    // 确保依赖已就绪
    if (!services.dataStore || !services.rendererService || !services.actionService) {
        devError('[ThinkPlugin] UI特性加载失败: 依赖服务未就绪');
        return;
    }

    // FeatureLoader 需要在 unload 时 cleanup（取消 background 定时任务），因此必须由 ServiceManager 管理。
    const existing = getFeatureLoader();
    existing?.cleanup();

    const loader = new FeatureLoader(
        plugin,
        services.dataStore,
        services.rendererService,
        services.actionService
    );
    setFeatureLoader(loader);

    await loader.loadFeatures(scanDataPromise);
}
