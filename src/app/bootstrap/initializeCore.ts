import { container } from 'tsyringe';
import type ThinkPlugin from '@main';

import { SETTINGS_PERSISTENCE_TOKEN, devError, devLog, updateCategoryColorMap, DataStore, InputService, ItemService } from '@core/public';

import { diDebug, diWarn } from '@/app/diagnostics/diDiagnostics';

import type { ThinkSettings } from '@core/public';
import { safeAsync } from '@shared/public';
import { startMeasure } from '@shared/public';

import { createAppStore, STORE_TOKEN } from '@/app/store/useAppStore';
import { createUseCases, USECASES_TOKEN } from '@/app/usecases';
import { FloatingTimerWidget } from '@features/timer/FloatingTimerWidget';
import type { ServiceManagerServices } from '@/app/ServiceManager.services';
import type { Disposables } from '@/app/runtime/disposables';
import type { BootstrapResolved } from '@/app/bootstrap/buildRuntime';
import { setDevConsoleStackEnabled } from '@shared/public';

export async function initializeCore(opts: {
    plugin: ThinkPlugin;
    services: ServiceManagerServices;
    disposables?: Disposables;
    bootstrap: Pick<BootstrapResolved, 'settingsRepository' | 'timerStateService' | 'initialSettings'>;
}): Promise<void> {
    const { plugin, services, disposables, bootstrap } = opts;
    const stopMeasure = startMeasure('ServiceManager.initializeCore');

    await (
        safeAsync(
            async () => {
                // 1. 解析核心服务
                // DI diagnostics: guard before any resolve (dev only, opt-in)
                if (!container.isRegistered(SETTINGS_PERSISTENCE_TOKEN)) {
                    diWarn('SettingsPersistence NOT registered in container used for resolve()');
                    throw new Error('SettingsPersistence token missing before resolve()');
                } else {
                    diDebug('SettingsPersistence is registered before resolve()');
                }

                // 1. 使用上层传入的依赖（避免在此处散落 resolve）
                services.settingsRepository = bootstrap.settingsRepository;

                // 初始化 SettingsRepository 的设置（由上层 resolve 并下发）
                const diInitialSettings: ThinkSettings = bootstrap.initialSettings;
                services.settingsRepository.setInitialSettings(diInitialSettings);
                diDebug('SettingsRepository.setInitialSettings() called');

                services.timerStateService = bootstrap.timerStateService;

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

                // 开发模式：初始化 console.error stack 开关
                setDevConsoleStackEnabled(!!zustandStore.getState().settings.devConsoleStackEnabled);

                // 初始化全局分类颜色映射（从用户设置覆盖硬编码默认值）
                const savedCategoryColors = zustandStore.getState().settings.categoryColors;
                if (savedCategoryColors) {
                    updateCategoryColorMap(savedCategoryColors);
                }


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
// 开发模式：监听设置变更，决定是否输出 console.error stack
const unsubscribeDevConsole = zustandStore.subscribe(
    (state) => !!state.settings.devConsoleStackEnabled,
    (enabled) => {
        setDevConsoleStackEnabled(enabled);
    }
);
disposables?.add('AppStore.subscribe(devConsoleStackEnabled)', unsubscribeDevConsole);
devLog('[ThinkPlugin] DevConsoleStackEnabled 监听已建立');

// 分类颜色：监听设置变更，同步运行时颜色映射
const unsubscribeCategoryColors = zustandStore.subscribe(
    (state) => state.settings.categoryColors,
    (colors) => {
        updateCategoryColorMap(colors ?? {});
    }
);
disposables?.add('AppStore.subscribe(categoryColors)', unsubscribeCategoryColors);
devLog('[ThinkPlugin] CategoryColors 监听已建立');


                // 3. 创建 UseCases 并注册到 DI 容器（传入 store）
                const inputService = container.resolve(InputService);
                const itemService = container.resolve(ItemService);
                const dataStore = container.resolve(DataStore);

                services.useCases = createUseCases(zustandStore, {
                    timerStateService: services.timerStateService!,
                    inputService,
                    itemService,
                    dataStore,
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
