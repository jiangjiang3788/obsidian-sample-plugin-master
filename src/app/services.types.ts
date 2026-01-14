// src/app/services.types.ts
/**
 * Services 类型定义（UI 可用依赖集合）
 *
 * 目标：把「需要注入到 UI」的依赖形状固定成唯一真源，避免 AppStoreContext / createServices 之间互相引用导致循环依赖。
 *
 * 约束：
 * - 这里只放 types + 轻量 runtime 校验（不引入任何 UI 组件）
 * - createServices / ServicesProvider 必须使用这里的 Services 类型
 */

import type { DataStore } from '@/core/services/DataStore';
import type { InputService } from '@/core/services/InputService';
import type { UseCases } from './usecases';
import type { AppStoreInstance } from './store/useAppStore';

/**
 * UI 运行期需要的服务集合（唯一真源）
 */
export interface Services {
  zustandStore: AppStoreInstance;
  dataStore: DataStore;
  inputService: InputService;
  useCases: UseCases;
}

/**
 * 运行时校验：防止 services 传 undefined 但运行到深处才爆
 */
export function validateServices(services: Services, source: string = 'validateServices'): void {
  if (!services) {
    throw new Error(
      `[${source}] services 对象为空。
` +
        `请检查 createServices(...) 是否返回了正确的 services。`
    );
  }

  const missing: string[] = [];
  if (!services.zustandStore) missing.push('zustandStore (STORE_TOKEN)');
  if (!services.dataStore) missing.push('dataStore (DataStore)');
  if (!services.inputService) missing.push('inputService (InputService)');
  if (!services.useCases) missing.push('useCases (USECASES_TOKEN)');

  if (missing.length > 0) {
    throw new Error(
      `[${source}] Services 校验失败: 缺少 ${missing.join(', ')}。
` +
        `请检查 ServiceManager 是否正确初始化了所有服务，以及 DI 容器是否正确注册。`
    );
  }
}
