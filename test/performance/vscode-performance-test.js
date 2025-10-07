#!/usr/bin/env node

/**
 * VSCode终端性能测试脚本
 * 完全在VSCode终端中运行，不需要在Obsidian中操作
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

function measureBuildTime() {
    log('\n🔨 测试构建时间...', 'cyan');
    
    try {
        const startTime = Date.now();
        execSync('npm run build', { stdio: 'pipe', cwd: __dirname });
        const endTime = Date.now();
        
        const buildTime = endTime - startTime;
        log(`✅ 构建完成，耗时: ${buildTime}ms`, 'green');
        
        return buildTime;
    } catch (error) {
        log(`❌ 构建失败: ${error.message}`, 'red');
        return null;
    }
}

function analyzeBundleSize() {
    log('\n📦 分析打包文件大小...', 'cyan');
    
    const mainJsPath = path.join(__dirname, 'main.js');
    
    if (fs.existsSync(mainJsPath)) {
        const stats = fs.statSync(mainJsPath);
        const sizeKB = (stats.size / 1024).toFixed(2);
        
        log(`📄 main.js 大小: ${sizeKB} KB`, 'blue');
        
        // 读取文件内容分析
        const content = fs.readFileSync(mainJsPath, 'utf8');
        const lineCount = content.split('\n').length;
        const charCount = content.length;
        
        log(`📝 代码行数: ${lineCount}`, 'blue');
        log(`🔤 字符数量: ${charCount}`, 'blue');
        
        // 分析优化特征
        const hasLazyLoading = content.includes('loadRemainingServicesAsync');
        const hasServiceManager = content.includes('class ServiceManager');
        const hasMicrotask = content.includes('Promise.resolve().then');
        
        log('\n🔍 优化特征检查:', 'yellow');
        log(`懒加载机制: ${hasLazyLoading ? '✅ 已应用' : '❌ 未找到'}`, hasLazyLoading ? 'green' : 'red');
        log(`服务管理器: ${hasServiceManager ? '✅ 已应用' : '❌ 未找到'}`, hasServiceManager ? 'green' : 'red');
        log(`微任务调度: ${hasMicrotask ? '✅ 已应用' : '❌ 未找到'}`, hasMicrotask ? 'green' : 'red');
        
        return {
            sizeKB: parseFloat(sizeKB),
            lineCount,
            charCount,
            hasOptimizations: hasLazyLoading && hasServiceManager && hasMicrotask
        };
    } else {
        log('❌ main.js 文件不存在，请先构建项目', 'red');
        return null;
    }
}

function analyzeSourceCode() {
    log('\n📊 分析源代码优化情况...', 'cyan');
    
    const mainTsPath = path.join(__dirname, 'src/main.ts');
    
    if (fs.existsSync(mainTsPath)) {
        const content = fs.readFileSync(mainTsPath, 'utf8');
        
        // 分析代码结构
        const features = {
            serviceManager: content.includes('class ServiceManager'),
            lazyLoading: content.includes('loadRemainingServicesAsync'),
            microtaskScheduling: content.includes('Promise.resolve().then'),
            idleCallback: content.includes('requestIdleCallback'),
            eventBus: content.includes('eventBus'),
            dependencyInjection: content.includes('container.resolve'),
            errorHandling: content.includes('try') && content.includes('catch'),
            logging: content.includes('console.log')
        };
        
        log('\n🏗️ 代码架构分析:', 'yellow');
        Object.entries(features).forEach(([feature, exists]) => {
            const status = exists ? '✅ 已实现' : '❌ 未实现';
            const color = exists ? 'green' : 'red';
            log(`${feature}: ${status}`, color);
        });
        
        // 计算优化得分
        const score = Object.values(features).filter(Boolean).length / Object.keys(features).length * 100;
        log(`\n📈 优化完成度: ${score.toFixed(1)}%`, score > 80 ? 'green' : score > 60 ? 'yellow' : 'red');
        
        return { features, score };
    } else {
        log('❌ src/main.ts 文件不存在', 'red');
        return null;
    }
}

function runUnitTests() {
    log('\n🧪 运行单元测试...', 'cyan');
    
    try {
        const result = execSync('npm run test:unit', { 
            stdio: 'pipe', 
            cwd: __dirname,
            encoding: 'utf8'
        });
        
        log('✅ 单元测试通过', 'green');
        
        // 解析测试结果
        const output = result.toString();
        const testMatch = output.match(/(\d+)\s+passing/);
        const failMatch = output.match(/(\d+)\s+failing/);
        
        if (testMatch) {
            log(`📊 测试通过: ${testMatch[1]} 个`, 'blue');
        }
        
        if (failMatch) {
            log(`❌ 测试失败: ${failMatch[1]} 个`, 'red');
        }
        
        return {
            passed: testMatch ? parseInt(testMatch[1]) : 0,
            failed: failMatch ? parseInt(failMatch[1]) : 0,
            success: !failMatch
        };
    } catch (error) {
        log(`❌ 单元测试失败: ${error.message}`, 'red');
        return { passed: 0, failed: 1, success: false };
    }
}

function checkDependencies() {
    log('\n📦 检查依赖项...', 'cyan');
    
    try {
        const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf8'));
        const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };
        
        const criticalDeps = [
            '@types/node',
            'obsidian',
            'typescript',
            'tsyringe'
        ];
        
        const testDeps = [
            'jest',
            '@types/jest',
            'webdriverio',
            '@wdio/cli'
        ];
        
        log('\n🔧 关键依赖检查:', 'yellow');
        criticalDeps.forEach(dep => {
            const exists = dependencies[dep];
            log(`${dep}: ${exists ? `✅ ${exists}` : '❌ 缺失'}`, exists ? 'green' : 'red');
        });
        
        log('\n🧪 测试依赖检查:', 'yellow');
        testDeps.forEach(dep => {
            const exists = dependencies[dep];
            log(`${dep}: ${exists ? `✅ ${exists}` : '❌ 缺失'}`, exists ? 'green' : 'red');
        });
        
        return {
            allCriticalDeps: criticalDeps.every(dep => dependencies[dep]),
            allTestDeps: testDeps.filter(dep => dependencies[dep]).length
        };
    } catch (error) {
        log(`❌ 依赖检查失败: ${error.message}`, 'red');
        return null;
    }
}

function generateReport(results) {
    log('\n📋 生成性能测试报告...', 'cyan');
    
    const report = {
        timestamp: new Date().toISOString(),
        results: results,
        summary: {
            buildTime: results.buildTime,
            bundleSize: results.bundleAnalysis?.sizeKB,
            optimizationScore: results.sourceAnalysis?.score,
            unitTestsPassed: results.unitTests?.passed,
            unitTestsFailed: results.unitTests?.failed,
            hasOptimizations: results.bundleAnalysis?.hasOptimizations
        }
    };
    
    const reportPath = path.join(__dirname, 'performance-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    log(`📄 报告已保存到: ${reportPath}`, 'blue');
    
    return report;
}

function showSummary(results) {
    log('\n🎯 性能测试总结', 'bright');
    log('================================', 'cyan');
    
    // 构建性能
    if (results.buildTime) {
        const buildStatus = results.buildTime < 5000 ? '优秀' : results.buildTime < 10000 ? '良好' : '需优化';
        const buildColor = results.buildTime < 5000 ? 'green' : results.buildTime < 10000 ? 'yellow' : 'red';
        log(`🔨 构建时间: ${results.buildTime}ms (${buildStatus})`, buildColor);
    }
    
    // 打包大小
    if (results.bundleAnalysis) {
        const sizeStatus = results.bundleAnalysis.sizeKB < 100 ? '优秀' : results.bundleAnalysis.sizeKB < 200 ? '良好' : '较大';
        const sizeColor = results.bundleAnalysis.sizeKB < 100 ? 'green' : results.bundleAnalysis.sizeKB < 200 ? 'yellow' : 'red';
        log(`📦 打包大小: ${results.bundleAnalysis.sizeKB}KB (${sizeStatus})`, sizeColor);
    }
    
    // 优化完成度
    if (results.sourceAnalysis) {
        const scoreColor = results.sourceAnalysis.score > 80 ? 'green' : results.sourceAnalysis.score > 60 ? 'yellow' : 'red';
        log(`📈 优化完成度: ${results.sourceAnalysis.score.toFixed(1)}%`, scoreColor);
    }
    
    // 测试结果
    if (results.unitTests) {
        const testColor = results.unitTests.success ? 'green' : 'red';
        log(`🧪 单元测试: ${results.unitTests.passed} 通过, ${results.unitTests.failed} 失败`, testColor);
    }
    
    // 总体评估
    log('\n🏆 总体评估:', 'bright');
    const issues = [];
    
    if (!results.bundleAnalysis?.hasOptimizations) {
        issues.push('优化特性未完全应用');
    }
    
    if (results.unitTests && !results.unitTests.success) {
        issues.push('单元测试存在失败');
    }
    
    if (results.buildTime && results.buildTime > 10000) {
        issues.push('构建时间较长');
    }
    
    if (issues.length === 0) {
        log('🎉 优化效果良好，可以安全使用！', 'green');
    } else {
        log('⚠️  发现以下问题:', 'yellow');
        issues.forEach(issue => log(`   • ${issue}`, 'yellow'));
    }
    
    log('\n💡 下一步建议:', 'magenta');
    if (issues.length === 0) {
        log('1. 在Obsidian中测试实际使用效果', 'white');
        log('2. 监控长期性能表现', 'white');
    } else {
        log('1. 修复发现的问题', 'white');
        log('2. 重新运行测试验证', 'white');
        log('3. 确保所有指标正常后再使用', 'white');
    }
}

function main() {
    log('\n🚀 VSCode终端性能测试', 'bright');
    log('================================', 'cyan');
    log('这个测试完全在VSCode终端中运行，无需在Obsidian中操作', 'yellow');
    
    const results = {};
    
    // 1. 检查依赖
    results.dependencies = checkDependencies();
    
    // 2. 分析源代码
    results.sourceAnalysis = analyzeSourceCode();
    
    // 3. 测试构建
    results.buildTime = measureBuildTime();
    
    // 4. 分析打包结果
    results.bundleAnalysis = analyzeBundleSize();
    
    // 5. 运行单元测试
    results.unitTests = runUnitTests();
    
    // 6. 生成报告
    generateReport(results);
    
    // 7. 显示总结
    showSummary(results);
    
    log('\n📚 详细报告已保存到 performance-report.json', 'cyan');
    log('💡 如需查看手动测试清单，运行: node run-tests.js manual', 'cyan');
}

// 运行测试
if (require.main === module) {
    main();
}

module.exports = { main, analyzeSourceCode, measureBuildTime };
