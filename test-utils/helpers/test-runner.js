#!/usr/bin/env node

/**
 * 测试运行器 - 提供便捷的测试运行接口
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const TEST_COMMANDS = {
  unit: 'npm run test:unit',
  integration: 'npm run test:integration', 
  performance: 'npm run test:performance',
  e2e: 'npm run test:e2e',
  coverage: 'npm run test:coverage',
  watch: 'npm run test:watch',
  all: 'npm run test:all'
};

const COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function colorLog(message, color = 'reset') {
  console.log(`${COLORS[color]}${message}${COLORS.reset}`);
}

function showHelp() {
  colorLog('\n🧪 ThinkPlugin 测试运行器', 'bright');
  colorLog('\n用法:', 'yellow');
  console.log('  node test-utils/helpers/test-runner.js [测试类型]');
  console.log('  node test-utils/helpers/test-runner.js --help');
  
  colorLog('\n可用的测试类型:', 'yellow');
  Object.entries(TEST_COMMANDS).forEach(([type, command]) => {
    console.log(`  ${type.padEnd(12)} - ${command}`);
  });
  
  colorLog('\n示例:', 'yellow');
  console.log('  node test-utils/helpers/test-runner.js unit');
  console.log('  node test-utils/helpers/test-runner.js coverage');
  console.log('  node test-utils/helpers/test-runner.js all');
  
  colorLog('\n快捷命令:', 'yellow');
  console.log('  npm run test          - 运行所有单元测试');
  console.log('  npm run test:unit     - 运行单元测试');
  console.log('  npm run test:integration - 运行集成测试');
  console.log('  npm run test:performance - 运行性能测试');
  console.log('  npm run test:e2e      - 运行端到端测试');
  console.log('  npm run test:coverage - 运行测试并生成覆盖率报告');
  console.log('  npm run test:watch    - 监视模式运行测试');
  console.log('  npm run test:all      - 运行所有测试');
}

function checkTestEnvironment() {
  colorLog('\n🔍 检查测试环境...', 'cyan');
  
  // 检查必要的文件
  const requiredFiles = [
    'test-configs/jest.config.js',
    'test-utils/setup/jest-setup.js',
    'package.json'
  ];
  
  let allFilesExist = true;
  requiredFiles.forEach(file => {
    if (!fs.existsSync(file)) {
      colorLog(`❌ 缺少文件: ${file}`, 'red');
      allFilesExist = false;
    }
  });
  
  if (!allFilesExist) {
    colorLog('\n❌ 测试环境不完整，请检查缺少的文件', 'red');
    process.exit(1);
  }
  
  // 检查测试目录
  const testDirs = [
    'tests/unit',
    'tests/integration', 
    'tests/performance',
    'test-utils'
  ];
  
  testDirs.forEach(dir => {
    if (fs.existsSync(dir)) {
      const fileCount = fs.readdirSync(dir).length;
      colorLog(`✅ ${dir} (${fileCount} 个文件)`, 'green');
    } else {
      colorLog(`⚠️  ${dir} (目录不存在)`, 'yellow');
    }
  });
  
  colorLog('✅ 测试环境检查完成\n', 'green');
}

function runTest(testType) {
  if (!TEST_COMMANDS[testType]) {
    colorLog(`❌ 未知的测试类型: ${testType}`, 'red');
    colorLog('可用的测试类型:', 'yellow');
    Object.keys(TEST_COMMANDS).forEach(type => console.log(`  - ${type}`));
    process.exit(1);
  }
  
  const command = TEST_COMMANDS[testType];
  
  colorLog(`🚀 运行 ${testType} 测试...`, 'bright');
  colorLog(`命令: ${command}`, 'cyan');
  console.log('');
  
  try {
    execSync(command, { 
      stdio: 'inherit',
      cwd: process.cwd()
    });
    
    colorLog(`\n✅ ${testType} 测试完成!`, 'green');
  } catch (error) {
    colorLog(`\n❌ ${testType} 测试失败!`, 'red');
    process.exit(error.status);
  }
}

function generateTestReport() {
  colorLog('\n📊 生成测试报告...', 'cyan');
  
  const reportDir = 'coverage';
  if (fs.existsSync(reportDir)) {
    colorLog(`✅ 覆盖率报告已生成: ${reportDir}/lcov-report/index.html`, 'green');
  }
  
  // 检查是否有性能基准数据
  const perfDir = 'test-data/performance-baselines';
  if (fs.existsSync(perfDir)) {
    const files = fs.readdirSync(perfDir);
    colorLog(`✅ 性能基准数据: ${files.length} 个文件`, 'green');
  }
}

// 主程序
function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    showHelp();
    return;
  }
  
  const testType = args[0];
  
  if (testType === 'check') {
    checkTestEnvironment();
    return;
  }
  
  if (testType === 'report') {
    generateTestReport();
    return;
  }
  
  // 检查环境
  checkTestEnvironment();
  
  // 运行测试
  const startTime = Date.now();
  runTest(testType);
  const endTime = Date.now();
  
  colorLog(`⏱️  总耗时: ${endTime - startTime}ms`, 'blue');
  
  // 生成报告
  if (testType === 'coverage' || testType === 'all') {
    generateTestReport();
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  main();
}

module.exports = {
  runTest,
  checkTestEnvironment,
  generateTestReport,
  TEST_COMMANDS
};
