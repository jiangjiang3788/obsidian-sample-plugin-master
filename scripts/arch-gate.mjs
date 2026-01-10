#!/usr/bin/env node
/**
 * P1-1 CI 防回流固化脚本
 * 
 * 架构约束门禁检查：
 * A) AppStore 永不回流 - 确保 AppStore 仅在 app 层使用
 * B) features 禁止 import app/store/slices - 必须通过 useCases
 * C) core 禁止 import features - 保持依赖方向正确
 * 
 * 使用方式：
 *   npm run arch:gate
 *   node scripts/arch-gate.mjs
 */

import { execFileSync } from 'child_process';
import { existsSync } from 'fs';

const RESET = '\x1b[0m';
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const BLUE = '\x1b[34m';

class ArchGateError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ArchGateError';
  }
}

function log(message, color = RESET) {
  console.log(`${color}${message}${RESET}`);
}

function execRipgrep(pattern, path, extraArgs = []) {
  try {
    const args = [
      '-n',                    // 显示行号
      '--color=never',         // 禁用颜色
      '--no-heading',          // 不显示文件名标题
      ...extraArgs,
      pattern,
      path
    ];
    
    const result = execFileSync('rg', args, {
      encoding: 'utf-8',
      stdio: 'pipe'
    });
    
    return result.trim();
  } catch (error) {
    // rg 返回 exit code 1 表示没有找到匹配
    if (error.status === 1) {
      return '';
    }
    // 其他错误（如 rg 不存在）
    throw error;
  }
}

function checkRipgrepExists() {
  try {
    execFileSync('rg', ['--version'], { stdio: 'ignore' });
  } catch (error) {
    throw new ArchGateError(
      '❌ ripgrep (rg) 未安装。\n' +
      '   请安装 ripgrep: https://github.com/BurntSushi/ripgrep#installation\n' +
      '   - Windows: scoop install ripgrep 或 choco install ripgrep\n' +
      '   - macOS: brew install ripgrep\n' +
      '   - Linux: apt install ripgrep 或 dnf install ripgrep'
    );
  }
}

/**
 * A) AppStore 永不回流检查
 * 规则：AppStore 仅应在 app 层使用，features/core 层不应直接使用
 */
function checkAppStoreNoBackflow() {
  log('\n🔍 [A] 检查 AppStore 回流...', BLUE);
  
  if (!existsSync('src')) {
    log('⚠️  src 目录不存在，跳过检查', YELLOW);
    return true;
  }
  
  // 排除允许使用 AppStore 的文件
  const excludeGlobs = [
    '--glob', '!src/app/**',                    // app 层允许
    '--glob', '!**/__tests__/**',               // 测试文件允许
    '--glob', '!**/*.test.ts',                  // 测试文件允许
    '--glob', '!**/*.test.tsx',                 // 测试文件允许
    '--glob', '!**/ARCH_CONSTRAINTS.md',        // 文档允许
    '--glob', '!**/README.md',                  // 文档允许
    '--glob', '!scripts/**',                    // 脚本允许
    '--glob', '!docs/**',                       // 文档允许
  ];
  
  const violations = execRipgrep('\\bAppStore\\b', 'src', excludeGlobs);
  
  if (violations) {
    log('❌ 发现 AppStore 回流违规：', RED);
    log('\n违规文件：', YELLOW);
    log(violations);
    log('\n💡 修复建议：', YELLOW);
    log('   - features 层应使用 useUseCases() hook，而不是直接访问 AppStore');
    log('   - core 层不应依赖 app 层，考虑重构依赖关系');
    log('   - 如果是测试文件，确保放在 __tests__ 目录或以 .test.ts(x) 结尾\n');
    return false;
  }
  
  log('✅ 通过 - 未发现 AppStore 回流', GREEN);
  return true;
}

/**
 * B) features 禁止 import app/store/slices
 * 规则：features 层必须通过 useCases 访问数据，不可直接 import slices
 * 注意：允许 import type（类型导入不会造成运行时依赖）
 */
function checkFeaturesNoSlices() {
  log('\n🔍 [B] 检查 features 是否违规 import slices...', BLUE);
  
  if (!existsSync('src/features')) {
    log('⚠️  src/features 目录不存在，跳过检查', YELLOW);
    return true;
  }
  
  // 先搜索所有包含 from slices 的行，然后在 JS 中过滤掉 import type
  const patterns = [
    'from [\'"]@/app/store/slices',
    'from [\'"]app/store/slices',  
    'from [\'"]\\.\\./\\.\\./app/store/slices',
    'from [\'"]\\.\\./app/store/slices',
  ];
  
  const excludeGlobs = [
    '--glob', '!**/__tests__/**',
    '--glob', '!**/*.test.ts',
    '--glob', '!**/*.test.tsx',
    '--glob', '!**/ARCH_CONSTRAINTS.md',
  ];
  
  let hasViolations = false;
  let allViolations = '';
  
  for (const pattern of patterns) {
    const violations = execRipgrep(pattern, 'src/features', excludeGlobs);
    if (violations) {
      // 过滤：排除 import type 行（类型导入允许）
      const lines = violations.split('\n').filter(line => {
        // 跳过空行
        if (!line.trim()) return false;
        // 跳过 import type
        if (line.match(/import\s+type\s+/)) return false;
        return true;
      });
      
      if (lines.length > 0) {
        hasViolations = true;
        allViolations += lines.join('\n') + '\n';
      }
    }
  }
  
  if (hasViolations) {
    log('❌ 发现 features 层违规 import slices：', RED);
    log('\n违规文件：', YELLOW);
    log(allViolations);
    log('💡 修复建议：', YELLOW);
    log('   - 移除 features 中对 slices 的直接 import（import type 允许）');
    log('   - 使用 useUseCases() hook 访问业务逻辑');
    log('   - 例如：const useCases = useUseCases(); useCases.theme.addTheme(...)\n');
    return false;
  }
  
  log('✅ 通过 - features 层未违规 import slices（import type 允许）', GREEN);
  return true;
}

/**
 * C) core 禁止 import features
 * 规则：core 层是底层模块，不应依赖 features 层
 */
function checkCoreNoFeatures() {
  log('\n🔍 [C] 检查 core 是否违规 import features...', BLUE);
  
  if (!existsSync('src/core')) {
    log('⚠️  src/core 目录不存在，跳过检查', YELLOW);
    return true;
  }
  
  // 检查多种可能的 import 模式
  const patterns = [
    'from [\'"]@/features',
    'from [\'"]features/',
    'from [\'"]\\.\\./\\.\\./features',
    'from [\'"]\\.\\./features',
    'from [\'"]~/features',
    'import.*from [\'"]@/features',
    'import.*from [\'"]features/',
  ];
  
  const excludeGlobs = [
    '--glob', '!**/__tests__/**',
    '--glob', '!**/*.test.ts',
    '--glob', '!**/*.test.tsx',
  ];
  
  let hasViolations = false;
  let allViolations = '';
  
  for (const pattern of patterns) {
    const violations = execRipgrep(pattern, 'src/core', excludeGlobs);
    if (violations) {
      hasViolations = true;
      allViolations += violations + '\n';
    }
  }
  
  if (hasViolations) {
    log('❌ 发现 core 层违规 import features：', RED);
    log('\n违规文件：', YELLOW);
    log(allViolations);
    log('💡 修复建议：', YELLOW);
    log('   - core 层不应依赖 features 层');
    log('   - 考虑将共享逻辑移至 core 层');
    log('   - 或通过依赖注入的方式解耦\n');
    return false;
  }
  
  log('✅ 通过 - core 层未违规 import features', GREEN);
  return true;
}

function main() {
  log('╔════════════════════════════════════════════════════════╗', BLUE);
  log('║         P1-1 CI 架构门禁检查 (Architecture Gate)      ║', BLUE);
  log('╚════════════════════════════════════════════════════════╝', BLUE);
  
  try {
    // 检查 ripgrep 是否安装
    checkRipgrepExists();
    
    // 执行三项检查
    const checkA = checkAppStoreNoBackflow();
    const checkB = checkFeaturesNoSlices();
    const checkC = checkCoreNoFeatures();
    
    // 汇总结果
    log('\n' + '═'.repeat(60), BLUE);
    log('检查结果汇总：', BLUE);
    log(`  [A] AppStore 回流检查:        ${checkA ? '✅ 通过' : '❌ 失败'}`, checkA ? GREEN : RED);
    log(`  [B] features→slices 检查:     ${checkB ? '✅ 通过' : '❌ 失败'}`, checkB ? GREEN : RED);
    log(`  [C] core→features 检查:       ${checkC ? '✅ 通过' : '❌ 失败'}`, checkC ? GREEN : RED);
    log('═'.repeat(60) + '\n', BLUE);
    
    if (checkA && checkB && checkC) {
      log('🎉 所有架构约束检查通过！', GREEN);
      log('   代码库符合 P1-1 架构边界要求\n', GREEN);
      process.exit(0);
    } else {
      log('💥 架构约束检查失败！', RED);
      log('   请根据上述建议修复违规代码\n', RED);
      process.exit(1);
    }
  } catch (error) {
    if (error instanceof ArchGateError) {
      log(error.message, RED);
    } else {
      log('❌ 执行检查时发生错误：', RED);
      log(error.message, RED);
      if (error.stack) {
        log('\n堆栈跟踪：', YELLOW);
        log(error.stack, YELLOW);
      }
    }
    process.exit(1);
  }
}

main();
