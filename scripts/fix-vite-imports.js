const fs = require('fs');
const path = require('path');

// 需要处理的文件扩展名
const extensions = ['.ts', '.tsx'];

// 路径映射：别名 -> 实际路径
const aliasMap = {
  '@lib': 'src/lib',
  '@store': 'src/store',
  '@ui': 'src/ui',
  '@views': 'src/views',
  '@hooks': 'src/hooks',
  '@config': 'src/config',
  '@platform': 'src/platform'
};

/**
 * 计算从 fromFile 到 toPath 的相对路径
 */
function getRelativePath(fromFile, toPath) {
  const fromDir = path.dirname(fromFile);
  let relativePath = path.relative(fromDir, toPath);
  
  // Windows 路径分隔符转换
  relativePath = relativePath.replace(/\\/g, '/');
  
  // 确保以 ./ 或 ../ 开头
  if (!relativePath.startsWith('.')) {
    relativePath = './' + relativePath;
  }
  
  return relativePath;
}

/**
 * 转换单个导入语句
 */
function convertImport(importPath, currentFile) {
  // 处理 @shared/xxx 特殊情况
  if (importPath.startsWith('@shared/')) {
    const pathAfterShared = importPath.substring('@shared/'.length);
    // 根据实际情况映射 @shared
    if (pathAfterShared.startsWith('hooks')) {
      const fullPath = path.join('src/hooks/shared', pathAfterShared.substring('hooks'.length));
      return getRelativePath(currentFile, fullPath);
    }
    return null;
  }
  
  // 检查是否是别名导入
  for (const [alias, realPath] of Object.entries(aliasMap)) {
    if (importPath.startsWith(alias + '/') || importPath === alias) {
      // 移除别名，获取相对于 src 的路径
      const pathAfterAlias = importPath.substring(alias.length + 1) || '';
      const fullPath = path.join(realPath, pathAfterAlias);
      
      // 计算相对路径
      const relativePath = getRelativePath(currentFile, fullPath);
      return relativePath;
    }
  }
  
  return null; // 不是别名导入
}

/**
 * 处理单个文件
 */
function processFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  
  // 匹配所有 import 语句
  const importRegex = /from\s+['"](@[^'"]+)['"]/g;
  let match;
  const replacements = [];
  
  while ((match = importRegex.exec(content)) !== null) {
    const originalImport = match[1];
    const newImport = convertImport(originalImport, filePath);
    
    if (newImport) {
      replacements.push({
        from: match[0],
        to: match[0].replace(originalImport, newImport)
      });
    }
  }
  
  if (replacements.length > 0) {
    let newContent = content;
    for (const { from, to } of replacements) {
      newContent = newContent.replace(from, to);
    }
    
    fs.writeFileSync(filePath, newContent, 'utf8');
    console.log(`✓ 已更新: ${filePath} (${replacements.length} 个导入)`);
    return replacements.length;
  }
  
  return 0;
}

/**
 * 递归遍历目录
 */
function walkDirectory(dir, callback) {
  const files = fs.readdirSync(dir);
  
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      if (file !== 'node_modules' && file !== 'dist' && file !== '.git') {
        walkDirectory(filePath, callback);
      }
    } else if (extensions.some(ext => file.endsWith(ext))) {
      callback(filePath);
    }
  }
}

// 主程序
console.log('开始转换别名导入为相对路径导入...\n');

let totalFiles = 0;
let totalImports = 0;

walkDirectory('src', (filePath) => {
  const count = processFile(filePath);
  if (count > 0) {
    totalFiles++;
    totalImports += count;
  }
});

console.log(`\n完成！`);
console.log(`- 处理文件数: ${totalFiles}`);
console.log(`- 转换导入数: ${totalImports}`);
