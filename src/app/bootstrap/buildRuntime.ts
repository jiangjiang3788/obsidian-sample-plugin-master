import { container as defaultContainer, type DependencyContainer } from 'tsyringe';
import { devError, UI_PORT_TOKEN, MODAL_PORT_TOKEN, MESSAGE_RENDER_PORT_TOKEN } from '@core/public';
import { validateServices, type Services } from '@/app/services.types';
import { STORE_TOKEN, type AppStoreInstance } from '@/app/store/useAppStore';
import { USECASES_TOKEN, type UseCases } from '@/app/usecases';
import { DataStore, InputService } from '@core/public';

/**
 * buildRuntime - 一次性 resolve & 缓存 UI 运行期所需 Services
 *
 * 目的：
 * - 替代 scattered resolve：把 container.resolve 收敛到少数入口
 * - 避免每次打开 modal/widget 都重复 resolve（减少噪音与潜在副作用）
 *
 * 注意：
 * - 这里只做「读取 DI 容器」+「运行时校验」，不做初始化行为（初始化由 ServiceManager 负责）
 */
const runtimeCache = new Map<DependencyContainer, Services>();

export function buildRuntime(container: DependencyContainer = defaultContainer): Services {
  const cached = runtimeCache.get(container);
  if (cached) return cached;

  try {
    const services: Services = {
      zustandStore: container.resolve<AppStoreInstance>(STORE_TOKEN),
      dataStore: container.resolve(DataStore),
      inputService: container.resolve(InputService),
      useCases: container.resolve<UseCases>(USECASES_TOKEN),
      uiPort: container.resolve(UI_PORT_TOKEN),
      modalPort: container.resolve(MODAL_PORT_TOKEN),
      messageRenderPort: container.resolve(MESSAGE_RENDER_PORT_TOKEN),
    };

    validateServices(services, 'buildRuntime');
    runtimeCache.set(container, services);
    return services;
  } catch (error) {
    devError('[buildRuntime] 创建 Services 失败:', error);
    throw new Error(
      `[buildRuntime] 无法从 DI 容器创建 Services。\n` +
        `请确保 ServiceManager 已完成初始化。\n` +
        `原始错误: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

export function resetRuntimeCache() {
  runtimeCache.clear();
}
