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
 * - 缺字段立刻报错（编译时 + 运行时）
 * - 最小改动，行为不变
 * 
 * @example
 * // 在渲染入口
 * const services = createServices(container);
 * root.render(<ServicesProvider services={services}>...</ServicesProvider>);
 */

import type { DependencyContainer } from 'tsyringe';
import type { Services } from './AppStoreContext';
import { STORE_TOKEN, type AppStoreInstance } from './store/useAppStore';
import { USECASES_TOKEN, type UseCases } from './usecases';
import { DataStore } from '@/core/services/DataStore';
import { InputService } from '@/core/services/InputService';

/**
 * 从 DI 容器创建完整的 Services 对象
 * 
 * @param container DI 容器实例
 * @returns 完整的 Services 对象
 * @throws 如果任何必需服务 resolve 失败则抛出错误
 */
export function createServices(container: DependencyContainer): Services {
    try {
        // 统一 resolve 所有 Services 字段
        const services: Services = {
            zustandStore: container.resolve<AppStoreInstance>(STORE_TOKEN),
            dataStore: container.resolve(DataStore),
            inputService: container.resolve(InputService),
            useCases: container.resolve<UseCases>(USECASES_TOKEN),
        };

        // 运行时校验：确保所有字段都已正确 resolve
        validateServices(services);

        return services;
    } catch (error) {
        console.error('[createServices] 创建 Services 失败:', error);
        throw new Error(
            `[createServices] 无法从 DI 容器创建 Services。\n` +
            `请确保 ServiceManager 已完成初始化。\n` +
            `原始错误: ${error instanceof Error ? error.message : String(error)}`
        );
    }
}

/**
 * 校验 Services 对象完整性（唯一真源）
 * @param services Services 对象
 * @param source 调用来源（可选，用于错误消息）
 * @throws 如果任何必需字段缺失则抛出错误
 */
export function validateServices(services: Services, source?: string): void {
    const missing: string[] = [];
    
    if (!services) {
        throw new Error(
            `[${source || 'validateServices'}] services 对象为空。\n` +
            `请检查渲染入口是否正确传递了 services 参数。`
        );
    }
    
    if (!services.zustandStore) missing.push('zustandStore (STORE_TOKEN)');
    if (!services.dataStore) missing.push('dataStore (DataStore)');
    if (!services.inputService) missing.push('inputService (InputService)');
    if (!services.useCases) missing.push('useCases (USECASES_TOKEN)');
    
    if (missing.length > 0) {
        throw new Error(
            `[${source || 'validateServices'}] Services 校验失败: 缺少 ${missing.join(', ')}。\n` +
            `请检查 DI 容器是否正确注册了所有服务。`
        );
    }
}
