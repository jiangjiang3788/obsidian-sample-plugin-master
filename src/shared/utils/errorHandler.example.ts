/**
 * ErrorHandler 使用示例
 * 
 * 这个文件展示了如何在项目中使用错误处理工具
 */

import {
    errorHandler,
    handleError,
    safeAsync,
    safe,
    NetworkError,
    ValidationError,
    FileSystemError,
    ServiceError,
    PluginError
} from './errorHandler';

// ============================================
// 示例 1: 基本错误处理
// ============================================

export function example1_BasicErrorHandling() {
    try {
        // 某些可能抛出错误的代码
        throw new Error('Something went wrong');
    } catch (error) {
        // 使用错误处理器处理错误
        handleError(error, 'Example1');
    }
}

// ============================================
// 示例 2: 自定义错误类型
// ============================================

export function example2_CustomErrorTypes() {
    try {
        // 抛出特定类型的错误
        throw new NetworkError('Failed to fetch data from API');
    } catch (error) {
        handleError(error, 'API Request');
    }

    try {
        throw new ValidationError('Invalid email format');
    } catch (error) {
        handleError(error, 'Form Validation');
    }

    try {
        throw new FileSystemError('File not found: config.json');
    } catch (error) {
        handleError(error, 'File Loading');
    }
}

// ============================================
// 示例 3: 自定义选项
// ============================================

export function example3_CustomOptions() {
    try {
        throw new Error('Critical error occurred');
    } catch (error) {
        // 自定义错误处理行为
        handleError(error, 'Critical Operation', {
            showNotice: true,           // 显示用户通知
            logToConsole: true,         // 记录到控制台
            noticeTimeout: 10000,       // 通知显示10秒
            context: 'User action: Save file'  // 额外上下文
        });
    }
}

// ============================================
// 示例 4: 安全执行异步函数
// ============================================

export async function example4_SafeAsync() {
    // 方式 1: 传统 try-catch
    async function fetchData() {
        try {
            const response = await fetch('https://api.example.com/data');
            return await response.json();
        } catch (error) {
            handleError(error, 'fetchData');
            return null;
        }
    }

    // 方式 2: 使用 safeAsync（更简洁）
    const data = await safeAsync(
        async () => {
            const response = await fetch('https://api.example.com/data');
            return await response.json();
        },
        'fetchData',
        {
            showNotice: true,
            noticeTimeout: 3000
        }
    );

    if (data) {
        console.log('Data fetched successfully:', data);
    } else {
        console.log('Failed to fetch data');
    }
}

// ============================================
// 示例 5: 安全执行同步函数
// ============================================

export function example5_SafeSync() {
    // 使用 safe 执行可能失败的同步操作
    const result = safe(
        () => {
            // 某些可能抛出错误的代码
            const config = JSON.parse('{ invalid json }');
            return config;
        },
        'Parse Config',
        {
            showNotice: false,  // 不显示通知
            logToConsole: true  // 只记录到控制台
        }
    );

    if (result) {
        console.log('Config parsed:', result);
    } else {
        console.log('Using default config');
    }
}

// ============================================
// 示例 6: 服务类中使用
// ============================================

export class ExampleService {
    async loadData(): Promise<any[]> {
        return await safeAsync(
            async () => {
                // 模拟数据加载
                const data = await this.fetchFromAPI();
                return this.processData(data);
            },
            'ExampleService.loadData'
        ) || [];
    }

    private async fetchFromAPI(): Promise<any> {
        // 模拟 API 调用
        throw new NetworkError('API endpoint not available');
    }

    private processData(data: any): any[] {
        // 数据处理逻辑
        return data;
    }

    saveSettings(settings: any): boolean {
        return safe(
            () => {
                // 验证设置
                if (!this.validateSettings(settings)) {
                    throw new ValidationError('Invalid settings format');
                }
                
                // 保存设置
                localStorage.setItem('settings', JSON.stringify(settings));
                return true;
            },
            'ExampleService.saveSettings',
            {
                showNotice: true,
                noticeTimeout: 2000
            }
        ) || false;
    }

    private validateSettings(settings: any): boolean {
        // 验证逻辑
        return settings && typeof settings === 'object';
    }
}

// ============================================
// 示例 7: 获取错误日志和统计
// ============================================

export function example7_ErrorLogsAndStats() {
    // 获取最近的10条错误日志
    const recentErrors = errorHandler.getErrorLogs(10);
    console.log('Recent errors:', recentErrors);

    // 获取错误统计
    const stats = errorHandler.getErrorStats();
    console.log('Error statistics:', stats);
    console.log(`Network errors: ${stats.NETWORK}`);
    console.log(`Validation errors: ${stats.VALIDATION}`);
    console.log(`Total errors: ${Object.values(stats).reduce((a, b) => a + b, 0)}`);

    // 清除错误日志（如果需要）
    // errorHandler.clearLogs();
}

// ============================================
// 示例 8: React/Preact 组件中使用
// ============================================

export function ExampleComponent() {
    const handleClick = async () => {
        const result = await safeAsync(
            async () => {
                // 执行某些异步操作
                const response = await fetch('/api/action');
                return await response.json();
            },
            'ExampleComponent.handleClick',
            {
                showNotice: true,
                context: 'User clicked action button'
            }
        );

        if (result) {
            console.log('Action successful:', result);
        }
    };

    // ... 组件其余部分
}

// ============================================
// 示例 9: 在插件生命周期中使用
// ============================================

export class ExamplePlugin {
    async onload() {
        await safeAsync(
            async () => {
                // 加载插件配置
                await this.loadSettings();
                
                // 初始化服务
                await this.initializeServices();
                
                // 注册事件处理器
                this.registerEventHandlers();
            },
            'ExamplePlugin.onload',
            {
                showNotice: true,
                context: 'Plugin initialization'
            }
        );
    }

    async loadSettings() {
        // 加载设置逻辑
        throw new FileSystemError('Settings file not found');
    }

    async initializeServices() {
        // 初始化服务逻辑
    }

    registerEventHandlers() {
        // 注册事件处理器
    }
}

// ============================================
// 示例 10: 错误边界（ErrorBoundary）模式
// ============================================

export class ErrorBoundary {
    static wrap<T>(fn: () => T, context: string): T | null {
        return safe(fn, context, {
            showNotice: true,
            logToConsole: true
        });
    }

    static wrapAsync<T>(fn: () => Promise<T>, context: string): Promise<T | null> {
        return safeAsync(fn, context, {
            showNotice: true,
            logToConsole: true
        });
    }
}

// 使用 ErrorBoundary
export function example10_ErrorBoundary() {
    // 同步操作
    const result = ErrorBoundary.wrap(
        () => {
            // 某些操作
            return { success: true };
        },
        'Some Operation'
    );

    // 异步操作
    ErrorBoundary.wrapAsync(
        async () => {
            // 某些异步操作
            return { success: true };
        },
        'Async Operation'
    );
}
