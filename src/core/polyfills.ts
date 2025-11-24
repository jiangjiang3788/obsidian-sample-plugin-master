import 'reflect-metadata';

/**
 * 确保 reflect-metadata 正确加载
 * 这对于 tsyringe 依赖注入容器是必需的
 */
export function ensureReflectMetadata(): void {
    if (typeof Reflect === 'undefined') {
        console.error('[ThinkPlugin] Reflect 对象未定义!');
        throw new Error('Reflect object is not available');
    }

    if (typeof Reflect.getOwnMetadata !== 'function') {
        console.error('[ThinkPlugin] Reflect.getOwnMetadata 方法不可用!');
        console.log('[ThinkPlugin] 可用的 Reflect 方法:', Object.getOwnPropertyNames(Reflect));
        throw new Error('Reflect.getOwnMetadata is not a function - reflect-metadata polyfill not properly loaded');
    }

    // 在开发环境下可以开启日志，生产环境可注释掉
    // console.log('[ThinkPlugin] reflect-metadata 已正确加载');
}
