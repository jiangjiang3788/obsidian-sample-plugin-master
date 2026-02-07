import { container } from 'tsyringe';
import type ThinkPlugin from '@main';

import {
    SETTINGS_PERSISTENCE_TOKEN,
    SETTINGS_TOKEN,
    SettingsRepository,
    TimerStateService,
    devError,
    devLog,
} from '@core/public';

import type { ThinkSettings } from '@core/public';
import { safeAsync } from '@shared/utils/errorHandler';
import { startMeasure } from '@shared/utils/performance';

import { createAppStore, STORE_TOKEN } from '@/app/store/useAppStore';
import { createUseCases, USECASES_TOKEN } from '@/app/usecases';
import { FloatingTimerWidget } from '@features/timer/FloatingTimerWidget';
import type { ServiceManagerServices } from '@/app/ServiceManager.services';
import type { Disposables } from '@/app/runtime/disposables';

export async function initializeCore(opts: {
    plugin: ThinkPlugin;
    services: ServiceManagerServices;
    disposables?: Disposables;
}): Promise<void> {
    const { plugin, services, disposables } = opts;
    const stopMeasure = startMeasure('ServiceManager.initializeCore');

    await (
        safeAsync(
            async () => {
                // 1. 解析核心服务
                // DI DEBUG: guard before any resolve
                if (!container.isRegistered(SETTINGS_PERSISTENCE_TOKEN)) {
                    devError(
                        '[DI DEBUG] SettingsPersistence NOT registered in container used for resolve()',
                        container
                    );
                    throw new Error('[DI DEBUG] SettingsPersistence token missing before resolve()');
                } else {
                    devLog('[DI DEBUG] SettingsPersistence is registered before resolve()');
                }

                services.settingsRepository = container.resolve(SettingsRepository);

                // DI DEBUG: 初始化 SettingsRepository 的设置（因 setupCore.ts 不再调用 resolve）
                const diInitialSettings = container.resolve<ThinkSettings>(SETTINGS_TOKEN);
                services.settingsRepository.setInitialSettings(diInitialSettings);
                devLog('[DI DEBUG] SettingsRepository.setInitialSettings() called');

                services.timerStateService = container.resolve(TimerStateService);

                // 2. 创建 Zustand Store 并注册到 DI
                const settingsRepository = services.settingsRepository;
                const zustandStore = createAppStore(settingsRepository);

                // P0-3: 注册 STORE_TOKEN 到 DI 容器（替代全局单例）
                container.register(STORE_TOKEN, { useValue: zustandStore });
                devLog('[ThinkPlugin] Zustand Store 已注册到 DI 容器');

                // 使用 SettingsRepository 加载的 settings 初始化 Zustand store
                const zustandInitialSettings = settingsRepository.getSettings();
                zustandStore.getState().initialize(zustandInitialSettings);
                devLog('[ThinkPlugin] Zustand Store 初始化完成');

                // 订阅 SettingsRepository 的变更，仅同步到 Zustand Store
                const unsubscribeSettingsRepo = settingsRepository.subscribe((settings) => {
                    zustandStore.setState({ settings });
                });
                disposables?.add('SettingsRepository.subscribe()', unsubscribeSettingsRepo);
                devLog('[ThinkPlugin] SettingsRepository 订阅已建立（纯同步 settings）');

                // TimerWidget 生命周期管理：通过监听 store 中 settings.floatingTimerEnabled 变化
                const unsubscribeFloatingTimer = zustandStore.subscribe(
                    (state) => state.settings.floatingTimerEnabled,
                    (floatingTimerEnabled, prevFloatingTimerEnabled) => {
                        // 从禁用到启用：创建并加载 TimerWidget
                        if (floatingTimerEnabled && !prevFloatingTimerEnabled) {
                            if (!services.timerWidget) {
                                services.timerWidget = new FloatingTimerWidget(plugin);
                                services.timerWidget.load();
                                zustandStore.setState((s) => ({
                                    ui: { ...s.ui, isTimerWidgetVisible: true },
                                }));
                                devLog('[计时器浮窗] 已启用 -> 创建并显示浮窗');
                            }
                        }

                        // 从启用到禁用：卸载 TimerWidget
                        if (!floatingTimerEnabled && prevFloatingTimerEnabled) {
                            zustandStore.setState((s) => ({
                                ui: { ...s.ui, isTimerWidgetVisible: false },
                            }));
                            if (services.timerWidget) {
                                services.timerWidget.unload();
                                services.timerWidget = undefined;
                                devLog('[计时器浮窗] 已禁用 -> 卸载浮窗');
                            }
                        }
                    }
                );
                disposables?.add('AppStore.subscribe(floatingTimerEnabled)', unsubscribeFloatingTimer);
                devLog('[ThinkPlugin] TimerWidget 生命周期监听已建立');

                // 3. 创建 UseCases 并注册到 DI 容器（传入 store）
                services.useCases = createUseCases(zustandStore, {
                    timerStateService: services.timerStateService!,
                });
                container.register(USECASES_TOKEN, { useValue: services.useCases });
                devLog('[ThinkPlugin] UseCases 创建完成');

                const duration = stopMeasure();
                devLog(`[ThinkPlugin] 核心服务初始化完成 (${duration.toFixed(2)}ms)`);
            },
            'ServiceManager.initializeCore',
            { showNotice: false }
        )
    );
}
