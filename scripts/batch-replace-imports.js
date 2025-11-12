#!/usr/bin/env node
/**
 * 批量替换导入路径脚本
 * 将 @/lib/types/domain 替换为 @core/types/domain
 */

const fs = require('fs');
const path = require('path');

// 配置
const config = {
  // 搜索和替换模式
  replacements: [
    {
      from: /@\/lib\/types\/domain/g,
      to: '@core/types/domain',
      description: '替换域类型导入路径'
    },
    {
      from: /@\/lib\/types$/g,
      to: '@core/types',
      description: '替换类型总导入路径'
    },
    {
      from: /@\/lib\/utils\/core/g,
      to: '@core/utils',
      description: '替换核心工具导入路径'
    },
    {
      from: /@\/lib\/utils\/shared/g,
      to: '@shared/utils',
      description: '替换共享工具导入路径'
    },
    {
      from: /@\/lib\/utils\/array/g,
      to: '@shared/utils/array',
      description: '替换数组工具导入路径'
    },
    // 处理相对路径导入
    {
      from: /\.\.\/\.\.\/\.\.\/lib\/utils\/core\//g,
      to: '@core/utils/',
      description: '替换相对路径核心工具导入'
    },
    {
      from: /\.\.\/\.\.\/lib\/utils\/core\//g,
      to: '@core/utils/',
      description: '替换相对路径核心工具导入(2级)'
    },
    {
      from: /\.\.\/\.\.\/lib\/utils\/shared\//g,
      to: '@shared/utils/',
      description: '替换相对路径共享工具导入'
    },
    // 处理@lib别名导入
    {
      from: /@lib\/utils\/core/g,
      to: '@core/utils',
      description: '替换@lib别名核心工具导入'
    },
    {
      from: /@lib\/utils\/shared/g,
      to: '@shared/utils',
      description: '替换@lib别名共享工具导入'
    },
    // 处理lib/patterns和logic迁移
    {
      from: /@\/lib\/patterns/g,
      to: '@shared/patterns',
      description: '替换patterns导入路径'
    },
    {
      from: /@\/lib\/logic\/CodeblockEmbedder/g,
      to: '@features/dashboard/services/CodeblockEmbedder',
      description: '替换CodeblockEmbedder导入路径'
    },
    {
      from: /@\/lib\/logic\/VaultWatcher/g,
      to: '@core/services/VaultWatcher',
      description: '替换VaultWatcher导入路径'
    },
    {
      from: /@\/lib\/migration/g,
      to: '@core/migration',
      description: '替换migration导入路径'
    }
  ],
  
  // 要处理的文件扩展名
  fileExtensions: ['.ts', '.tsx', '.js', '.jsx'],
  
  // 要排除的目录
  excludeDirs: ['node_modules', '.git', 'dist', 'build', 'coverage'],
  
  // 项目根目录
  rootDir: path.resolve(__dirname, '../src')
};

/**
 * 检查文件是否应该被处理
 */
function shouldProcessFile(filePath) {
  const ext = path.extname(filePath);
  return config.fileExtensions.includes(ext);
}

/**
 * 检查目录是否应该被排除
 */
function shouldExcludeDir(dirName) {
  return config.excludeDirs.includes(dirName);
}

/**
 * 递归获取所有文件
 */
function getAllFiles(dirPath, files = []) {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    
    if (entry.isDirectory()) {
      if (!shouldExcludeDir(entry.name)) {
        getAllFiles(fullPath, files);
      }
    } else if (entry.isFile() && shouldProcessFile(fullPath)) {
      files.push(fullPath);
    }
  }
  
  return files;
}

/**
 * 处理单个文件
 */
function processFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let changed = false;
    let changeDetails = [];
    
    // 应用所有替换规则
    config.replacements.forEach(replacement => {
      const beforeCount = (content.match(replacement.from) || []).length;
      if (beforeCount > 0) {
        content = content.replace(replacement.from, replacement.to);
        changed = true;
        changeDetails.push({
          description: replacement.description,
          count: beforeCount
        });
      }
    });
    
    // 如果有变更，写入文件
    if (changed) {
      fs.writeFileSync(filePath, content, 'utf8');
      return {
        success: true,
        changed: true,
        file: path.relative(config.rootDir, filePath),
        changes: changeDetails
      };
    }
    
    return {
      success: true,
      changed: false,
      file: path.relative(config.rootDir, filePath)
    };
    
  } catch (error) {
    return {
      success: false,
      file: path.relative(config.rootDir, filePath),
      error: error.message
    };
  }
}

/**
 * 主执行函数
 */
function main() {
  console.log('🚀 开始批量替换导入路径...');
  console.log(`📁 扫描目录: ${config.rootDir}`);
  console.log('');
  
  // 获取所有需要处理的文件
  const allFiles = getAllFiles(config.rootDir);
  console.log(`📋 找到 ${allFiles.length} 个文件需要检查`);
  console.log('');
  
  // 处理结果统计
  const results = {
    processed: 0,
    changed: 0,
    errors: 0,
    totalChanges: 0
  };
  
  const changedFiles = [];
  const errorFiles = [];
  
  // 处理每个文件
  allFiles.forEach(filePath => {
    const result = processFile(filePath);
    results.processed++;
    
    if (result.success) {
      if (result.changed) {
        results.changed++;
        changedFiles.push(result);
        
        // 计算总变更数量
        result.changes.forEach(change => {
          results.totalChanges += change.count;
        });
        
        console.log(`✅ ${result.file}`);
        result.changes.forEach(change => {
          console.log(`   └─ ${change.description}: ${change.count} 处替换`);
        });
      }
    } else {
      results.errors++;
      errorFiles.push(result);
      console.log(`❌ ${result.file}: ${result.error}`);
    }
  });
  
  console.log('');
  console.log('📊 处理结果:');
  console.log(`   ✅ 处理文件: ${results.processed}`);
  console.log(`   🔄 修改文件: ${results.changed}`);
  console.log(`   📝 总替换数: ${results.totalChanges}`);
  console.log(`   ❌ 错误文件: ${results.errors}`);
  
  if (errorFiles.length > 0) {
    console.log('');
    console.log('⚠️  处理错误的文件:');
    errorFiles.forEach(file => {
      console.log(`   ${file.file}: ${file.error}`);
    });
  }
  
  console.log('');
  console.log('✨ 批量替换完成!');
  
  return results;
}

// 运行脚本
if (require.main === module) {
  main();
}

module.exports = { main, processFile, getAllFiles };
