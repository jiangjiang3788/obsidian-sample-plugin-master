/**
 * 测试覆盖声明（测试体系审计使用，不代表执行已通过）
 * @covers F001/integration
 */
import 'reflect-metadata';
import { container } from 'tsyringe';

// initializeCore 只需要验证核心组合关系。浮动计时器的 DOM/Services 运行时由独立测试覆盖；
// 在这里隔离它，避免核心组合测试被 UI 模块初始化副作用阻断在 describe 注册之前。
jest.mock('@features/timer/FloatingTimerWidget', () => ({
  FloatingTimerWidget: class FloatingTimerWidgetMock {
    load() {}
    unload() {}
  },
}));


import { initializeCore } from '@/app/bootstrap/initializeCore';
import { STORE_TOKEN } from '@/app/store/useAppStore';
import { USECASES_TOKEN } from '@/app/usecases';
import { Disposables } from '@/app/runtime/disposables';
import { DEFAULT_SETTINGS, type ThinkSettings } from '@/core/settings/ThinkSettings';
import {
  SettingsRepository,
  SETTINGS_PERSISTENCE_TOKEN,
  type ISettingsPersistence,
} from '@/core/services/SettingsRepository';

function cloneSettings(): ThinkSettings {
  return JSON.parse(JSON.stringify({ ...DEFAULT_SETTINGS, floatingTimerEnabled: false }));
}

describe('P0 initializeCore 核心服务组合', () => {
  afterEach(() => {
    container.reset();
  });

  it('把 Repository / Store / UseCases 组合到同一个运行时，并由 Disposables 解除设置同步', async () => {
    const saved: ThinkSettings[] = [];
    const persistence: ISettingsPersistence = {
      loadData: jest.fn(async () => cloneSettings()),
      saveData: jest.fn(async (settings) => { saved.push(JSON.parse(JSON.stringify(settings))); }),
    };
    container.register(SETTINGS_PERSISTENCE_TOKEN, { useValue: persistence });

    const settingsRepository = new SettingsRepository(persistence);
    const initialSettings = cloneSettings();
    const services: any = {};
    const disposables = new Disposables();
    const timerStateService = {} as any;
    const dataStore = {} as any;
    const inputService = {} as any;
    const itemService = {} as any;

    await initializeCore({
      plugin: { app: {} } as any,
      services,
      disposables,
      bootstrap: {
        settingsRepository,
        timerStateService,
        initialSettings,
        inputService,
        itemService,
        dataStore,
      },
    });

    const store: any = container.resolve(STORE_TOKEN);
    const useCases: any = container.resolve(USECASES_TOKEN);

    expect(services.settingsRepository).toBe(settingsRepository);
    expect(services.timerStateService).toBe(timerStateService);
    expect(services.useCases).toBe(useCases);
    expect(store.getState().isInitialized).toBe(true);
    expect(store.getState().settings.floatingTimerEnabled).toBe(false);
    expect(useCases.recordInput).toBeTruthy();
    expect(useCases.goal).toBeTruthy();
    expect(useCases.timer).toBeTruthy();

    await settingsRepository.update((draft) => {
      draft.devConsoleStackEnabled = true;
    });
    expect(saved).toHaveLength(1);
    expect(store.getState().settings.devConsoleStackEnabled).toBe(true);

    disposables.dispose();
    await settingsRepository.update((draft) => {
      draft.devConsoleStackEnabled = false;
    });

    // Repository 仍能写盘，但核心卸载后不再继续同步已释放的 Store 订阅。
    expect(saved).toHaveLength(2);
    expect(store.getState().settings.devConsoleStackEnabled).toBe(true);
  });

  it('缺少 SettingsPersistence 组合根注册时明确失败，而不是得到半初始化运行时', async () => {
    container.reset();
    const persistence: ISettingsPersistence = {
      loadData: jest.fn(async () => cloneSettings()),
      saveData: jest.fn(async () => undefined),
    };
    const settingsRepository = new SettingsRepository(persistence);

    await initializeCore({
      plugin: { app: {} } as any,
      services: {},
      bootstrap: {
        settingsRepository,
        timerStateService: {} as any,
        initialSettings: cloneSettings(),
        inputService: {} as any,
        itemService: {} as any,
        dataStore: {} as any,
      },
    });

    expect(container.isRegistered(STORE_TOKEN)).toBe(false);
    expect(container.isRegistered(USECASES_TOKEN)).toBe(false);
  });
});
