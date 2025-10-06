#!/usr/bin/env node

/**
 * ThinkPlugin 测试运行脚本
 * 使用方法: node run-tests.js [test-type]
 * 
 * test-type 选项:
 * - unit: 运行单元测试
 * - e2e: 运行端到端测试
 * - build: 构建项目
 * - perf: 性能测试 (需要在 Obsidian 中手动运行)
 * - all: 运行所有测试
 * - quick: 快速测试 (单元测试 + 构建)
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

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

function runCommand(command, description) {
    log(`\n🔄 ${description}...`, 'cyan');
    try {
        execSync(command, { stdio: 'inherit', cwd: __dirname });
        log(`✅ ${description} 完成`, 'green');
        return true;
    } catch (error) {
        log(`❌ ${description} 失败`, 'red');
        log(`错误: ${error.message}`, 'red');
        return false;
    }
}

function checkFiles() {
    log('\n📋 检查必要文件...', 'yellow');
    
    const requiredFiles = [
        'package.json',
        'src/main.ts',
        '真实性能测试.js',
        'test/specs/test.e2e.ts',
        'wdio.conf.mts'
    ];
    
    let allExists = true;
    for (const file of requiredFiles) {
        if (fs.existsSync(path.join(__dirname, file))) {
            log(`✅ ${file}`, 'green');
        } else {
            log(`❌ ${file} 不存在`, 'red');
            allExists = false;
        }
    }
    
    return allExists;
}

function showPerfTestInstructions() {
    log('\n🚀 性能测试说明:', 'magenta');
    log('1. 打开 Obsidian', 'yellow');
    log('2. 按 Ctrl+Shift+I 打开开发者工具', 'yellow');
    log('3. 切换到 Console 标签', 'yellow');
    log('4. 复制 真实性能测试.js 的全部内容', 'yellow');
    log('5. 粘贴到控制台并按回车', 'yellow');
    log('6. 运行: thinkPluginTests.runFullTestSuite()', 'yellow');
    log('\n📊 性能测试脚本位置:', 'cyan');
    log(path.join(__dirname, '真实性能测试.js'), 'blue');
}

function showManualTestInstructions() {
    log('\n🧪 手动端到端测试清单:', 'magenta');
    log('1. 启动测试:', 'yellow');
    log('   ✅ 重启 Obsidian');
    log('   ✅ 检查插件是否启用');
    log('   ✅ 观察启动速度');
    log('   ✅ 查看控制台错误');
    
    log('\n2. 基础功能测试:', 'yellow');
    log('   ✅ 创建新笔记');
    log('   ✅ 插入 think 代码块');
    log('   ✅ 验证渲染效果');
    log('   ✅ 测试不同布局');
    
    log('\n3. 高级功能测试:', 'yellow');
    log('   ✅ 打开设置面板');
    log('   ✅ 修改配置选项');
    log('   ✅ 保存并重启');
    log('   ✅ 验证配置生效');
    
    log('\n4. 性能回归测试:', 'yellow');
    log('   ✅ 运行性能测试脚本');
    log('   ✅ 对比优化前后数据');
    log('   ✅ 检查内存泄漏');
    log('   ✅ 验证响应速度');
}

function main() {
    const testType = process.argv[2] || 'help';
    
    log('\n🎯 ThinkPlugin 测试运行器', 'bright');
    log('================================', 'cyan');
    
    // 检查文件
    if (!checkFiles()) {
        log('\n❌ 缺少必要文件，请检查项目结构', 'red');
        process.exit(1);
    }
    
    switch (testType) {
        case 'unit':
            log('\n🧪 运行单元测试...', 'bright');
            runCommand('npm run test:unit', '单元测试');
            break;
            
        case 'e2e':
            log('\n🌐 运行端到端测试...', 'bright');
            runCommand('npm run test:e2e', '端到端测试');
            break;
            
        case 'build':
            log('\n🔨 构建项目...', 'bright');
            runCommand('npm run build', '项目构建');
            break;
            
        case 'perf':
            showPerfTestInstructions();
            break;
            
        case 'manual':
            showManualTestInstructions();
            break;
            
        case 'quick':
            log('\n⚡ 快速测试...', 'bright');
            const unitSuccess = runCommand('npm run test:unit', '单元测试');
            if (unitSuccess) {
                runCommand('npm run build', '项目构建');
                log('\n🎉 快速测试完成！', 'green');
                log('💡 建议运行: node run-tests.js manual', 'cyan');
            }
            break;
            
        case 'all':
            log('\n🎯 运行完整测试套件...', 'bright');
            const steps = [
                { cmd: 'npm run clean', desc: '清理项目' },
                { cmd: 'npm run test:unit', desc: '单元测试' },
                { cmd: 'npm run build', desc: '项目构建' },
                { cmd: 'npm run test:e2e', desc: '端到端测试' }
            ];
            
            let allSuccess = true;
            for (const step of steps) {
                if (!runCommand(step.cmd, step.desc)) {
                    allSuccess = false;
                    break;
                }
            }
            
            if (allSuccess) {
                log('\n🎉 所有自动化测试通过！', 'green');
                showPerfTestInstructions();
                showManualTestInstructions();
            }
            break;
            
        case 'vscode':
            log('\n💻 VSCode终端性能测试...', 'bright');
            runCommand('node vscode-performance-test.js', 'VSCode性能测试');
            break;
            
        case 'help':
        default:
            log('\n📖 使用说明:', 'bright');
            log('node run-tests.js <test-type>', 'cyan');
            log('\n可用选项:', 'yellow');
            log('  unit   - 运行单元测试', 'white');
            log('  e2e    - 运行端到端测试', 'white');
            log('  build  - 构建项目', 'white');
            log('  perf   - 显示性能测试说明', 'white');
            log('  manual - 显示手动测试清单', 'white');
            log('  vscode - VSCode终端性能测试 (推荐)', 'white');
            log('  quick  - 快速测试 (单元测试 + 构建)', 'white');
            log('  all    - 运行所有测试', 'white');
            log('  help   - 显示此帮助', 'white');
            
            log('\n🚀 推荐流程:', 'magenta');
            log('1. node run-tests.js vscode   # VSCode性能测试 (推荐)', 'yellow');
            log('2. node run-tests.js quick    # 快速验证', 'yellow');
            log('3. node run-tests.js manual   # 手动测试', 'yellow');
            log('4. node run-tests.js all      # 完整测试 (发布前)', 'yellow');
            break;
    }
    
    log('\n📚 更多信息请查看: 测试运行指南.md', 'cyan');
}

// 运行主函数
if (require.main === module) {
    main();
}

module.exports = { runCommand, checkFiles };
