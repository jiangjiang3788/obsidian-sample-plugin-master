#!/usr/bin/env node

// scripts/validate-architecture.js
// 项目架构依赖关系验证脚本

const fs = require('fs');
const path = require('path');

console.log('🏗️  开始架构依赖关系验证...\n');

// 验证配置
const VALIDATION_RULES = {
  // 合法依赖关系
  validDependencies: {
    'features': ['core', 'shared'],
    'core': ['shared'],
    'shared': []
  },
  
  // 禁止的业务词汇（在 core 层）
  forbiddenBusinessTerms: [
    'task', 'timer', 'view', 'settings', 'controlbar', 
    'dashboard', 'quickinput', 'TaskService', 'ViewService'
  ],
  
  // 禁止的组件名（在 shared 层）
  forbiddenSharedComponents: [
    'TaskCheckbox', 'TaskSendToTimerButton', 'Timeline', 
    'ViewEditor', 'ThemeImportButton'
  ]
};

let violationCount = 0;

// 检查文件内容的函数
function checkFileContent(filePath, content) {
  const violations = [];
  
  // 检查 features 间的相互依赖
  if (filePath.includes('/features/')) {
    const currentFeature = filePath.match(/\/features\/([^\/]+)\//)?.[1];
    const featureImports = content.match(/import.*from.*[@'\"].*\/features\/([^\/'"]+)/g);
    
    if (featureImports) {
      featureImports.forEach(importLine => {
        const targetFeature = importLine.match(/\/features\/([^\/'"]+)/)?.[1];
        if (targetFeature && targetFeature !== currentFeature) {
          violations.push(`❌ Features间违规依赖: ${currentFeature} → ${targetFeature}`);
        }
      });
    }
  }
  
  // 检查 core 层业务词汇
  if (filePath.includes('/core/')) {
    VALIDATION_RULES.forbiddenBusinessTerms.forEach(term => {
      if (content.includes(term) || filePath.includes(term)) {
        violations.push(`❌ Core层包含业务词汇: ${term}`);
      }
    });
  }
  
  // 检查 shared 层业务组件
  if (filePath.includes('/shared/')) {
    VALIDATION_RULES.forbiddenSharedComponents.forEach(component => {
      if (content.includes(component) || filePath.includes(component)) {
        violations.push(`❌ Shared层包含业务组件: ${component}`);
      }
    });
    
    // 检查 shared 对 core/features 的依赖
    const coreDeps = content.match(/import.*from.*[@'\"].*\/(core|features)\//g);
    if (coreDeps) {
      coreDeps.forEach(dep => {
        violations.push(`❌ Shared层违规依赖: ${dep.trim()}`);
      });
    }
  }
  
  return violations;
}

// 递归扫描目录
function scanDirectory(dir) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      scanDirectory(fullPath);
    } else if (file.match(/\.(ts|tsx)$/)) {
      try {
        const content = fs.readFileSync(fullPath, 'utf8');
        const violations = checkFileContent(fullPath, content);
        
        if (violations.length > 0) {
          console.log(`📁 ${fullPath}:`);
          violations.forEach(violation => {
            console.log(`  ${violation}`);
            violationCount++;
          });
          console.log();
        }
      } catch (err) {
        console.log(`⚠️  无法读取文件: ${fullPath}`);
      }
    }
  });
}

// 开始扫描
const srcDir = path.join(process.cwd(), 'src');
if (fs.existsSync(srcDir)) {
  scanDirectory(srcDir);
} else {
  console.log('❌ 找不到 src 目录');
  process.exit(1);
}

// 输出结果
console.log(`\n📊 验证完成！`);
if (violationCount === 0) {
  console.log('✅ 恭喜！没有发现架构依赖约束违规');
  console.log('🎉 项目架构符合标准化规范');
} else {
  console.log(`❌ 发现 ${violationCount} 个依赖约束违规`);
  console.log('🔧 请根据上述提示修复违规项');
  process.exit(1);
}
