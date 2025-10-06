#!/usr/bin/env node

/**
 * 测试环境验证脚本
 * 用于验证测试框架是否正确配置
 */

const fs = require('fs');
const path = require('path');

const COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${COLORS[color]}${message}${COLORS.reset}`);
}

function checkFile(filePath, description) {
  if (fs.existsSync(filePath)) {
    log(`✅ ${description}: ${filePath}`, 'green');
    return true;
  } else {
    log(`❌ ${description}: ${filePath}`, 'red');
    return false;
  }
}

function checkDirectory(dirPath, description) {
  if (fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory()) {
    const files = fs.readdirSync(dirPath);
    log(`✅ ${description}: ${dirPath} (${files.length} 个文件)`, 'green');
    return true;
  } else {
    log(`❌ ${description}: ${dirPath}`, 'red');
    return false;
  }
}

function checkPackageJson() {
  try {
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    const scripts = packageJson.scripts || {};
    
    log('\n📦 检查 package.json 脚本:', 'cyan');
    
    const requiredScripts = [
      'test',
      'test:unit',
      'test:integration',
      'test:performance',
      'test:coverage',
      'test:e2e',
      'test:all'
    ];
    
    let allScriptsExist = true;
    requiredScripts.forEach(script => {
      if (scripts[script]) {
        log(`✅ ${script}: ${scripts[script]}`, 'green');
      } else {
        log(`❌ 缺少脚本: ${script}`, 'red');
        allScriptsExist = false;
      }
    });
    
    // 检查 Jest 依赖
    const devDeps = packageJson.devDependencies || {};
    const jestDeps = ['jest', 'jest-environment-jsdom', 'ts-jest', 'babel-jest'];
    
    log('\n📦 检查 Jest 依赖:', 'cyan');
    jestDeps.forEach(dep => {
      if (devDeps[dep]) {
        log(`✅ ${dep}: ${devDeps[dep]}`, 'green');
      } else {
        log(`❌ 缺少依赖: ${dep}`, 'red');
        allScriptsExist = false;
      }
    });
    
    return allScriptsExist;
  } catch (error) {
    log(`❌ 读取 package.json 失败: ${error.message}`, 'red');
    return false;
  }
}

function main() {
  log('\n🧪 ThinkPlugin 测试环境验证', 'bright');
  log('=====================================', 'blue');
  
  let allChecksPass = true;
  
  // 检查核心配置文件
  log('\n📁 检查核心配置文件:', 'cyan');
  allChecksPass &= checkFile('test-configs/jest.config.js', 'Jest 配置');
  allChecksPass &= checkFile('babel.config.js', 'Babel 配置');
  allChecksPass &= checkFile('test-utils/setup/jest-setup.js', 'Jest 设置文件');
  
  // 检查测试工具
  log('\n🛠️ 检查测试工具:', 'cyan');
  allChecksPass &= checkFile('test-utils/mocks/obsidian-api-mock.js', 'Obsidian API Mock');
  allChecksPass &= checkFile('test-utils/factories/task-factory.js', '数据工厂');
  allChecksPass &= checkFile('test-utils/helpers/test-runner.js', '测试运行器');
  
  // 检查测试目录
  log('\n📂 检查测试目录:', 'cyan');
  allChecksPass &= checkDirectory('tests/unit', '单元测试目录');
  allChecksPass &= checkDirectory('tests/integration', '集成测试目录');
  allChecksPass &= checkDirectory('tests/performance', '性能测试目录');
  allChecksPass &= checkDirectory('test-utils', '测试工具目录');
  
  // 检查具体测试文件
  log('\n📄 检查测试文件:', 'cyan');
  allChecksPass &= checkFile('tests/unit/store/AppStore.test.js', 'AppStore 测试');
  allChecksPass &= checkFile('tests/unit/store/DataStore.test.js', 'DataStore 测试');
  allChecksPass &= checkFile('tests/integration/data-flow.test.js', '数据流集成测试');
  allChecksPass &= checkFile('tests/performance/startup-performance.test.js', '启动性能测试');
  
  // 检查 package.json
  allChecksPass &= checkPackageJson();
  
  // 检查文档
  log('\n📚 检查文档:', 'cyan');
  allChecksPass &= checkFile('tests/README.md', '测试文档');
  
  // 总结
  log('\n=====================================', 'blue');
  if (allChecksPass) {
    log('🎉 测试环境验证通过！', 'green');
    log('\n🚀 你可以开始运行测试了:', 'yellow');
    log('  npm run test              # 运行单元测试', 'blue');
    log('  npm run test:coverage     # 生成覆盖率报告', 'blue');
    log('  npm run test:all          # 运行所有测试', 'blue');
    log('  node test-utils/helpers/test-runner.js check  # 检查环境', 'blue');
  } else {
    log('❌ 测试环境验证失败，请检查上述问题', 'red');
    log('\n🔧 建议的修复步骤:', 'yellow');
    log('  1. 确保所有必需文件存在', 'blue');
    log('  2. 运行 npm install 安装依赖', 'blue');
    log('  3. 检查 package.json 配置', 'blue');
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { main };
