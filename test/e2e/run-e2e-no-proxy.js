#!/usr/bin/env node

/**
 * E2E 测试运行器 - 禁用代理
 * 
 * 问题诊断：
 * - HTTP_PROXY 和 HTTPS_PROXY 环境变量导致 WebdriverIO 无法连接到本地 chromedriver
 * - 解决方案：临时清除代理设置并添加 localhost 到 NO_PROXY
 */

const { spawn } = require('child_process');
const path = require('path');

console.log('=== E2E 测试运行器（无代理模式）===\n');

// 保存原始代理设置
const originalProxy = {
    HTTP_PROXY: process.env.HTTP_PROXY,
    HTTPS_PROXY: process.env.HTTPS_PROXY,
    NO_PROXY: process.env.NO_PROXY,
    http_proxy: process.env.http_proxy,
    https_proxy: process.env.https_proxy,
    no_proxy: process.env.no_proxy
};

console.log('1. 当前代理设置:');
console.log(`   HTTP_PROXY: ${originalProxy.HTTP_PROXY || '(未设置)'}`);
console.log(`   HTTPS_PROXY: ${originalProxy.HTTPS_PROXY || '(未设置)'}`);
console.log(`   NO_PROXY: ${originalProxy.NO_PROXY || '(未设置)'}`);

// 清除代理设置或设置 NO_PROXY
console.log('\n2. 配置测试环境...');
delete process.env.HTTP_PROXY;
delete process.env.HTTPS_PROXY;
delete process.env.http_proxy;
delete process.env.https_proxy;
process.env.NO_PROXY = 'localhost,127.0.0.1,::1';
process.env.no_proxy = 'localhost,127.0.0.1,::1';

console.log('   ✓ 已禁用 HTTP/HTTPS 代理');
console.log('   ✓ 已设置 NO_PROXY 为: localhost,127.0.0.1,::1');

// 运行测试
console.log('\n3. 运行 E2E 测试...\n');
console.log('=' .repeat(60));

const testProcess = spawn('npm', ['run', 'test:e2e'], {
    stdio: 'inherit',
    shell: true,
    env: {
        ...process.env,
        // 确保没有代理
        HTTP_PROXY: '',
        HTTPS_PROXY: '',
        http_proxy: '',
        https_proxy: '',
        NO_PROXY: 'localhost,127.0.0.1,::1',
        no_proxy: 'localhost,127.0.0.1,::1'
    }
});

testProcess.on('close', (code) => {
    console.log('=' .repeat(60));
    console.log(`\n测试完成，退出代码: ${code}`);
    
    // 恢复原始代理设置
    console.log('\n4. 恢复原始代理设置...');
    Object.keys(originalProxy).forEach(key => {
        if (originalProxy[key]) {
            process.env[key] = originalProxy[key];
        }
    });
    console.log('   ✓ 代理设置已恢复');
    
    process.exit(code);
});

testProcess.on('error', (error) => {
    console.error('运行测试时出错:', error);
    process.exit(1);
});
