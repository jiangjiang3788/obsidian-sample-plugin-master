/**
 * createServices - Services 工厂函数
 *
 * 角色：统一服务注入的唯一真源 (Single Source of Truth)
 * 职责：
 * 1. 从 DI 容器统一 resolve 所有 Services 字段
 * 2. 运行时校验，确保 Services 结构完整
 * 3. 替代所有入口处手工拼装 services 的重复代码
 *
 * 优势：
 * - 保证 Services 结构统一
 * - 缺字段立刻报错（运行时）
 * - 最小改动，行为不变
 *
 * @example
 * // 在渲染入口
 * const services = createServices();
 * root.render(<ServicesProvider services={services}>...</ServicesProvider>);
 */

import { container as defaultContainer, type DependencyContainer } from 'tsyringe';
import { validateServices, type Services } from './services.types';
import { STORE_TOKEN, type AppStoreInstance } from './store/useAppStore';
import { USECASES_TOKEN, type UseCases } from './usecases';
import {DataStore, devError} from '@core/public';
import { InputService } from '@core/public';

/**
 * createServices
 *
 * Phase 4.3: 组合根禁止下沉
 * - features/shared 不允许直接 import tsyringe container
 * - 统一由 app 内部负责拿到全局 container，并在这里构造 UI 所需 Services
 *
 * @param container （可选）DI 容器实例。默认使用 tsyringe 的全局 container。
 * @returns 完整的 Services 对象
 * @throws 如果任何必需服务 resolve 失败则抛出错误
 */
export function createServices(container: DependencyContainer = defaultContainer): Services {
    try {
        // 统一 resolve 所有 Services 字段
        const services: Services = {
            zustandStore: container.resolve<AppStoreInstance>(STORE_TOKEN),
            dataStore: container.resolve(DataStore),
            inputService: container.resolve(InputService),
            useCases: container.resolve<UseCases>(USECASES_TOKEN),
        };

        // 运行时校验：确保所有字段都已正确 resolve
        validateServices(services, 'createServices');

        return services;
    } catch (error) {
        devError('[createServices] 创建 Services 失败:', error);
        throw new Error(
            `[createServices] 无法从 DI 容器创建 Services。\n` +
            `请确保 ServiceManager 已完成初始化。\n` +
            `原始错误: ${error instanceof Error ? error.message : String(error)}`
        );
    }
}

// 兼容性：保留旧的导入路径（如果有外部代码仍从 createServices.ts 引入 validateServices）
// 但真正的唯一真源在 src/app/services.types.ts
export { validateServices } from './services.types';
