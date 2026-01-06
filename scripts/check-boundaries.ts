#!/usr/bin/env npx ts-node
/**
 * P1 边界检查脚本
 * 检测 UI 层是否违规直接访问 appStore 的私有方法
 * 
 * 规则：
 * 1. features/settings 目录下的组件不应直接调用 appStore.batch* 方法
 * 2. 应通过 useCases.* 调用业务逻辑
 * 
 * 使用方式：
 *   npm run check:boundaries
 *   npx ts-node scripts/check-boundaries.ts
 */

import * as fs from 'fs';
import * as path from 'path';

interface Violation {
  file: string;
  line: number;
  content: string;
  pattern: string;
}

// 需要检查的目录
const UI_DIRECTORIES = [
  'src/features/settings',
  'src/features/dashboard',
  'src/features/ui',
];

// 禁止的模式 - UI 层不应直接调用这些方法
const FORBIDDEN_PATTERNS: Array<{ pattern: RegExp; description: string }> = [
  {
    pattern: /appStore\.batch\w+/g,
    description: 'UI 不应直接调用 appStore.batch* 方法，请使用 useCases.theme.*',
  },
  {
    pattern: /appStore\._\w+/g,
    description: 'UI 不应直接调用 appStore 私有方法（以 _ 开头）',
  },
  {
    pattern: /appStore\.updateSettings\(/g,
    description: 'UI 不应直接调用 appStore.updateSettings，请使用 useCases.settings.*',
  },
  {
    pattern: /appStore\.deleteTheme\(/g,
    description: 'UI 不应直接调用 appStore.deleteTheme，请使用 useCases.theme.*',
  },
  {
    pattern: /appStore\.addTheme\(/g,
    description: 'UI 不应直接调用 appStore.addTheme，请使用 useCases.theme.*',
  },
  {
    pattern: /appStore\.updateTheme\(/g,
    description: 'UI 不应直接调用 appStore.updateTheme，请使用 useCases.theme.*',
  },
  {
    pattern: /appStore\.addBlock\(/g,
    description: 'UI 不应直接调用 appStore.addBlock，请使用 useCases.blocks.*',
  },
  {
    pattern: /appStore\.updateBlock\(/g,
    description: 'UI 不应直接调用 appStore.updateBlock，请使用 useCases.blocks.*',
  },
  {
    pattern: /appStore\.deleteBlock\(/g,
    description: 'UI 不应直接调用 appStore.deleteBlock，请使用 useCases.blocks.*',
  },
];

// 白名单文件（允许直接访问 appStore 的文件）
const WHITELIST_FILES = [
  'useAppStore.ts',
  'AppStore.ts',
  'AppStoreContext.tsx',
  '.usecase.ts',      // UseCase 文件允许访问 store
  '.slice.ts',        // Slice 文件允许访问 store
  'ServiceManager.ts',
];

function isWhitelisted(filePath: string): boolean {
  return WHITELIST_FILES.some(pattern => filePath.includes(pattern));
}

function getAllFiles(dir: string, ext: string = '.tsx'): string[] {
  const files: string[] = [];
  
  if (!fs.existsSync(dir)) {
    return files;
  }
  
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    
    if (entry.isDirectory()) {
      files.push(...getAllFiles(fullPath, ext));
    } else if (entry.name.endsWith(ext) || entry.name.endsWith('.ts')) {
      files.push(fullPath);
    }
  }
  
  return files;
}

function checkFile(filePath: string): Violation[] {
  const violations: Violation[] = [];
  
  if (isWhitelisted(filePath)) {
    return violations;
  }
  
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1;
    
    for (const { pattern, description } of FORBIDDEN_PATTERNS) {
      // 重置正则表达式的 lastIndex
      pattern.lastIndex = 0;
      
      if (pattern.test(line)) {
        // 排除注释行
        const trimmedLine = line.trim();
        if (trimmedLine.startsWith('//') || trimmedLine.startsWith('*')) {
          continue;
        }
        
        violations.push({
          file: filePath,
          line: lineNum,
          content: line.trim(),
          pattern: description,
        });
      }
    }
  }
  
  return violations;
}

function main() {
  console.log('🔍 P1 边界检查：检测 UI 层违规直接访问 appStore...\n');
  
  const allViolations: Violation[] = [];
  
  for (const dir of UI_DIRECTORIES) {
    const files = getAllFiles(dir);
    
    for (const file of files) {
      const violations = checkFile(file);
      allViolations.push(...violations);
    }
  }
  
  if (allViolations.length === 0) {
    console.log('✅ 没有发现边界违规！所有 UI 层文件都正确使用 useCases。\n');
    process.exit(0);
  }
  
  console.log(`❌ 发现 ${allViolations.length} 处边界违规：\n`);
  
  // 按文件分组显示
  const byFile = new Map<string, Violation[]>();
  for (const v of allViolations) {
    const existing = byFile.get(v.file) || [];
    existing.push(v);
    byFile.set(v.file, existing);
  }
  
  for (const [file, violations] of byFile) {
    const relativePath = path.relative(process.cwd(), file);
    console.log(`📄 ${relativePath}:`);
    
    for (const v of violations) {
      console.log(`   L${v.line}: ${v.content}`);
      console.log(`   ⚠️  ${v.pattern}\n`);
    }
  }
  
  console.log('💡 修复建议：');
  console.log('   1. 将 appStore.batch* 调用改为 useCases.theme.*');
  console.log('   2. 将 appStore.addTheme/updateTheme 改为 useCases.theme.*');
  console.log('   3. 将 appStore.addBlock/updateBlock 改为 useCases.blocks.*');
  console.log('   4. 通过 useUseCases() hook 获取 useCases 实例\n');
  
  process.exit(1);
}

main();
