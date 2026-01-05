/**
 * ServicesProvider 自检测试
 * 
 * 此文件提供简单的运行时自检，用于验证：
 * 1. Services 对象完整性校验
 * 2. Context 正确配置
 * 
 * 运行方式：在 ServiceManager 初始化完成后调用 runServicesProviderSelfTest()
 */

import type { Services } from '@/app/AppStoreContext';

/**
 * 验证 Services 对象是否完整
 */
export function validateServicesObject(services: Partial<Services> | null | undefined): {
    valid: boolean;
    missing: string[];
    message: string;
} {
    const missing: string[] = [];
    
    if (!services) {
        return {
            valid: false,
            missing: ['services'],
            message: 'Services 对象为空或未定义',
        };
    }
    
    if (!services.appStore) missing.push('appStore');
    if (!services.dataStore) missing.push('dataStore');
    if (!services.inputService) missing.push('inputService');
    if (!services.useCases) missing.push('useCases');
    
    const valid = missing.length === 0;
    const message = valid 
        ? 'Services 对象完整，所有服务已正确初始化'
        : `Services 校验失败，缺少: ${missing.join(', ')}`;
    
    return { valid, missing, message };
}

/**
 * 运行 ServicesProvider 自检
 * 在开发模式下调用此函数以验证配置是否正确
 */
export function runServicesProviderSelfTest(services: Partial<Services> | null | undefined): void {
    const result = validateServicesObject(services);
    
    if (result.valid) {
        console.log('[ServicesProvider SelfTest] ✅ 通过:', result.message);
    } else {
        console.error('[ServicesProvider SelfTest] ❌ 失败:', result.message);
        console.error('[ServicesProvider SelfTest] 缺失项:', result.missing);
        console.error('[ServicesProvider SelfTest] 请检查:');
        console.error('  1. ServiceManager.initializeCore() 是否正确执行');
        console.error('  2. USECASES_TOKEN 是否正确注册到 DI 容器');
        console.error('  3. 渲染入口是否使用 ServicesProvider 而非 AppStoreProvider');
    }
}

/**
 * 创建模拟的完整 Services 对象（用于测试）
 */
export function createMockServices(): Services {
    return {
        appStore: {} as Services['appStore'],
        dataStore: {} as Services['dataStore'],
        inputService: {} as Services['inputService'],
        useCases: {} as Services['useCases'],
    };
}

// 导出测试用例
export const testCases = {
    /** 测试完整的 Services 对象 */
    testValidServices: () => {
        const services = createMockServices();
        const result = validateServicesObject(services);
        console.assert(result.valid === true, 'Valid services should pass');
        console.assert(result.missing.length === 0, 'No missing items');
        return result;
    },
    
    /** 测试缺少 useCases 的情况 */
    testMissingUseCases: () => {
        const services = createMockServices();
        (services as any).useCases = undefined;
        const result = validateServicesObject(services);
        console.assert(result.valid === false, 'Missing useCases should fail');
        console.assert(result.missing.includes('useCases'), 'Should report useCases as missing');
        return result;
    },
    
    /** 测试 null services */
    testNullServices: () => {
        const result = validateServicesObject(null);
        console.assert(result.valid === false, 'Null services should fail');
        return result;
    },
};
