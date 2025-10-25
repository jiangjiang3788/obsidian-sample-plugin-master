/**
 * 更新所有导入路径到新的扁平化结构
 * 使用正确的 UTF-8 编码处理所有文件
 */

const fs = require('fs');
const path = require('path');

// 路径映射规则
const pathMappings = [
  // 核心路径
  { from: /@core\/domain\//g, to: '@lib/types/domain/' },
  { from: /@core\/services\//g, to: '@lib/services/core/' },
  { from: /@core\/utils\//g, to: '@lib/utils/core/' },
  { from: /@core\/migration\//g, to: '@lib/migration/' },
  { from: /@core\//g, to: '@lib/' },
  
  // 状态管理
  { from: /@state\//g, to: '@store/' },
  
  // UI 组件
  { from: /@shared\/components\/form\//g, to: '@ui/composites/form/' },
  { from: /@shared\/components\/dialogs\//g, to: '@ui/composites/dialogs/' },
  { from: /@shared\/components\//g, to: '@ui/' },
  { from: /@shared\/ui\//g, to: '@ui/composites/' },
  
  // Hooks
  { from: /@shared\/hooks\//g, to: '@hooks/shared/' },
  
  // 工具函数
  { from: /@shared\/utils\//g, to: '@lib/utils/shared/' },
  
  // 样式
  { from: /@shared\/styles\//g, to: '@ui/styles/' },
  
  // Features -> Views
  { from: /@features\/dashboard\//g, to: '@views/Dashboard/' },
  { from: /@features\/settings\//g, to: '@views/Settings/' },
  { from: /@features\/timer\//g, to: '@views/Timer/' },
  { from: /@features\/quick-input\//g, to: '@views/QuickInput/' },
  { from: /@features\/logic\//g, to: '@lib/logic/' },
  { from: /@features\//g, to: '@views/' }
];

/**
 * 递归获取所有 TypeScript 文件
 */
function getAllTsFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      // 跳过 node_modules 等目录
      if (!['node_modules', '.git', 'dist', 'build'].includes(file)) {
        getAllTsFiles(filePath, fileList);
      }
    } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
      fileList.push(filePath);
    }
  });
  
  return fileList;
}

/**
 * 更新文件中的导入路径
 */
function updateImportsInFile(filePath) {
  try {
    // 使用 UTF-8 编码读取文件
    const content = fs.readFileSync(filePath, 'utf8');
    let updatedContent = content;
    let hasChanges = false;
    
    // 应用所有路径映射
    pathMappings.forEach(({ from, to }) => {
      const newContent = updatedContent.replace(from, to);
      if (newContent !== updatedContent) {
        hasChanges = true;
        updatedContent = newContent;
      }
    });
    
    // 如果有更改，使用 UTF-8 编码写回文件
    if (hasChanges) {
      fs.writeFileSync(filePath, updatedContent, 'utf8');
      console.log(`✓ 已更新: ${filePath}`);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error(`✗ 处理文件失败 ${filePath}:`, error.message);
    return false;
  }
}

/**
 * 主函数
 */
function main() {
  console.log('开始更新导入路径...\n');
  
  const srcDir = path.join(__dirname, '..', 'src');
  const files = getAllTsFiles(srcDir);
  
  console.log(`找到 ${files.length} 个 TypeScript 文件\n`);
  
  let updatedCount = 0;
  
  files.forEach(file => {
    if (updateImportsInFile(file)) {
      updatedCount++;
    }
  });
  
  console.log(`\n完成！共更新 ${updatedCount} 个文件`);
}

// 执行脚本
main();
