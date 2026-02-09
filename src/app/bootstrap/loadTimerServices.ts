import { container } from 'tsyringe';
import type ThinkPlugin from '@main';

import { safeAsync } from '@shared/public';
import { startMeasure } from '@shared/public';

import { devLog } from '@core/public';

import type { AppStoreInstance } from '@/app/store/useAppStore';
import { STORE_TOKEN } from '@/app/store/useAppStore';
import { RendererService } from '@/features/settings/RendererService';
import { TimerService } from '@features/timer/TimerService';
import { FloatingTimerWidget } from '@features/timer/FloatingTimerWidget';
import type { ServiceManagerServices } from '@/app/ServiceManager.services';

export async function loadTimerServices(opts: {
    plugin: ThinkPlugin;
    services: ServiceManagerServices;
}): Promise<void> {
    const { plugin, services } = opts;

    // [Debug] 验证依赖服务是否就绪
    devLog('[ServiceManager] loadTimerServices: action/data ready', {
        actionService: !!services.actionService,
        dataStore: !!services.dataStore,
    });

    if (services.timerService) return;

    const stopMeasure = startMeasure('ServiceManager.loadTimerServices');

    await safeAsync(
        async () => {
            // [DI Gate] features 层禁止 tsyringe：TimerService 改为手工创建
            services.timerService = new TimerService(
                services.useCases!,
                services.dataStore!,
                services.itemService!,
                services.inputService!,
                plugin.app
            );

            // Phase1: Capabilities 可注入体系 - 让 TimerCapability 能在运行时 resolve 到 TimerService。
            // 注意：TimerService 仍然由 app 层负责创建，features 层不允许直接触达容器。
            container.register(TimerService, { useValue: services.timerService });
            devLog('[ThinkPlugin] TimerService 已注册到 DI 容器（供 capabilities/usecases 使用）');

            // RendererService 依赖 TimerService，因此在 TimerService 就绪后再创建
            if (!services.rendererService) {
                const store = container.resolve<AppStoreInstance>(STORE_TOKEN);
                services.rendererService = new RendererService(
                    plugin.app,
                    services.dataStore!,
                    services.actionService!,
                    services.itemService!,
                    services.inputService!,
                    services.timerService,
                    services.useCases!,
                    store
                );
            }

            // 注册命令（P0: 使用 UseCases 替代直接调用 appStore）
            plugin.addCommand({
                id: 'toggle-think-floating-timer',
                name: '切换悬浮计时器显隐',
                callback: () => {
                    // P0: 通过 UseCases 调用，而非直接调用 appStore
                    services.useCases!.settings.toggleTimerWidgetVisibility();
                },
            });

            // [PR1] 初始化 Zustand Timer Slice
            await services.useCases!.timer.setInitialTimersFromDisk();
            devLog('[ThinkPlugin] Zustand Timers Loaded:', services.useCases!.timer.getTimers());

            // 加载 Widget
            const settings = services.settingsRepository!.getSettings();
            if (settings.floatingTimerEnabled) {
                services.timerWidget = new FloatingTimerWidget(plugin);
                services.timerWidget.load();
            }

            const duration = stopMeasure();
            devLog(`[ThinkPlugin] 计时器服务加载完成 (${duration.toFixed(2)}ms)`);
        },
        'ServiceManager.loadTimerServices',
        { showNotice: true }
    );
}
