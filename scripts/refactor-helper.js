const fs = require('fs-extra');
const path = require('path');
const { execSync } = require('child_process');

class RefactorHelper {
  /**
   * 批量查找和替换文件内容
   * @param {RegExp} pattern - 用于查找的正则表达式
   * @param {string} replacement - 替换的字符串
   * @param {string[]} files - 要处理的文件路径数组
   */
  static batchReplace(pattern, replacement, files) {
    console.log(`Running batch replace on ${files.length} files...`);
    let changedFiles = 0;
    files.forEach(file => {
      try {
        const content = fs.readFileSync(file, 'utf8');
        if (pattern.test(content)) {
          const newContent = content.replace(pattern, replacement);
          fs.writeFileSync(file, newContent, 'utf8');
          console.log(`  - Updated: ${file}`);
          changedFiles++;
        }
      } catch (error) {
        console.error(`  - Error processing ${file}:`, error);
      }
    });
    console.log(`Batch replace complete. ${changedFiles} files were modified.`);
  }

  /**
   * 验证 TypeScript 项目是否能成功编译
   * @returns {boolean} - 如果编译成功则返回 true
   */
  static validateTS() {
    console.log('Validating TypeScript compilation...');
    try {
      execSync('npx tsc --noEmit', { stdio: 'inherit', encoding: 'utf8' });
      console.log('TypeScript validation successful.');
      return true;
    } catch (error) {
      console.error('TypeScript validation failed.');
      return false;
    }
  }

  /**
   * 运行项目的测试套件
   */
  static runTests() {
    console.log('Running tests...');
    try {
      execSync('npm test', { stdio: 'inherit', encoding: 'utf8' });
      console.log('Tests completed.');
    } catch (error) {
      console.error('Tests failed.');
    }
  }
}

module.exports = { RefactorHelper };
