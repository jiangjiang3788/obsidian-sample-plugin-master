/**
 * 真实环境性能测试脚本
 * 在Obsidian开发者工具控制台中运行
 */

// 1. 测试启动性能
function testStartupPerformance() {
    console.log('🚀 开始测试ThinkPlugin启动性能...');
    
    // 监控控制台时间戳
    const originalLog = console.log;
    const timestamps = {};
    
    console.log = function(...args) {
        if (args[0] && args[0].includes('[ThinkPlugin]')) {
            const message = args[0];
            const timestamp = performance.now();
            
            if (message.includes('核心服务初始化')) {
                timestamps.coreStart = timestamp;
            } else if (message.includes('核心功能已加载完成')) {
                timestamps.coreComplete = timestamp;
            } else if (message.includes('所有功能已完全加载')) {
                timestamps.fullComplete = timestamp;
            }
        }
        originalLog.apply(console, args);
    };
    
    // 5秒后恢复原始console.log并显示结果
    setTimeout(() => {
        console.log = originalLog;
        
        if (timestamps.coreStart && timestamps.coreComplete) {
            const coreTime = timestamps.coreComplete - timestamps.coreStart;
            console.log(`📊 核心功能加载时间: ${coreTime.toFixed(2)}ms`);
        }
        
        if (timestamps.coreStart && timestamps.fullComplete) {
            const fullTime = timestamps.fullComplete - timestamps.coreStart;
            console.log(`📊 完整加载时间: ${fullTime.toFixed(2)}ms`);
        }
        
        if (timestamps.coreComplete && timestamps.fullComplete) {
            const backgroundTime = timestamps.fullComplete - timestamps.coreComplete;
            console.log(`📊 后台加载时间: ${backgroundTime.toFixed(2)}ms`);
        }
    }, 5000);
}

// 2. 测试功能可用性
function testFunctionalityAvailability() {
    console.log('🔍 测试功能可用性...');
    
    // 检查插件是否已加载
    const plugin = app.plugins.plugins['obsidian-sample-plugin-master'];
    if (!plugin) {
        console.error('❌ ThinkPlugin未找到');
        return;
    }
    
    // 测试核心功能
    const tests = [
        {
            name: 'AppStore可用性',
            test: () => plugin.appStore !== undefined
        },
        {
            name: '计时器切换命令',
            test: () => app.commands.commands['toggle-think-floating-timer'] !== undefined
        },
        {
            name: '设置命令',
            test: () => app.commands.commands['think-open-settings'] !== undefined
        }
    ];
    
    let passed = 0;
    tests.forEach(test => {
        try {
            const result = test.test();
            console.log(`${result ? '✅' : '❌'} ${test.name}: ${result}`);
            if (result) passed++;
        } catch (error) {
            console.log(`❌ ${test.name}: 错误 - ${error.message}`);
        }
    });
    
    console.log(`📈 功能测试通过率: ${passed}/${tests.length} (${(passed/tests.length*100).toFixed(1)}%)`);
}

// 3. 内存使用测试
function testMemoryUsage() {
    if (performance.memory) {
        const memory = performance.memory;
        console.log('💾 内存使用情况:');
        console.log(`  已使用: ${(memory.usedJSHeapSize / 1024 / 1024).toFixed(2)} MB`);
        console.log(`  总分配: ${(memory.totalJSHeapSize / 1024 / 1024).toFixed(2)} MB`);
        console.log(`  限制: ${(memory.jsHeapSizeLimit / 1024 / 1024).toFixed(2)} MB`);
    } else {
        console.log('⚠️ 浏览器不支持内存监控');
    }
}

// 4. 错误监控
function setupErrorMonitoring() {
    const originalError = console.error;
    const errors = [];
    
    console.error = function(...args) {
        if (args[0] && args[0].includes && args[0].includes('[Think Plugin]')) {
            errors.push({
                timestamp: new Date().toISOString(),
                message: args.join(' ')
            });
        }
        originalError.apply(console, args);
    };
    
    // 返回检查错误的函数
    return function checkErrors() {
        if (errors.length > 0) {
            console.log(`🚨 检测到 ${errors.length} 个错误:`);
            errors.forEach(error => {
                console.log(`  [${error.timestamp}] ${error.message}`);
            });
        } else {
            console.log('✅ 未检测到错误');
        }
        return errors;
    };
}

// 5. 运行完整测试套件
async function runFullTestSuite() {
    console.log('🧪 开始完整性能测试套件...\n');
    
    // 设置错误监控
    const checkErrors = setupErrorMonitoring();
    
    // 测试启动性能
    testStartupPerformance();
    
    // 等待插件完全加载
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // 测试功能可用性
    testFunctionalityAvailability();
    
    // 测试内存使用
    testMemoryUsage();
    
    // 检查错误
    setTimeout(() => {
        checkErrors();
        console.log('\n🎉 测试完成！请查看上方结果。');
    }, 1000);
}

// 导出测试函数
window.thinkPluginTests = {
    testStartupPerformance,
    testFunctionalityAvailability,
    testMemoryUsage,
    runFullTestSuite
};

console.log('📋 ThinkPlugin性能测试工具已加载');
console.log('使用方法:');
console.log('  thinkPluginTests.runFullTestSuite() - 运行完整测试');
console.log('  thinkPluginTests.testStartupPerformance() - 测试启动性能');
console.log('  thinkPluginTests.testFunctionalityAvailability() - 测试功能');
console.log('  thinkPluginTests.testMemoryUsage() - 测试内存使用');
