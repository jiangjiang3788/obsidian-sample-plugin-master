#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// 原有的替换规则（保留现有功能）
const ORIGINAL_REPLACEMENT_RULES = [
    // Store 相关
    {
        pattern: /import.*from\s+['"](\.\.\/)+store\/AppStore['"]/g,
        replacement: (match, p1) => match.replace(p1, '@store/AppStore')
    },
    {
        pattern: /import.*from\s+['"](\.\.\/)+store\/storeRegistry['"]/g,
        replacement: (match, p1) => match.replace(p1, '@store/storeRegistry')
    },
    
    // 类型定义相关
    {
        pattern: /import.*from\s+['"](\.\.\/)+lib\/types\/domain\/schema['"]/g,
        replacement: (match, p1) => match.replace(p1, '@/lib/types/domain/schema')
    },
    {
        pattern: /import.*from\s+['"](\.\.\/)+lib\/types\/domain\/constants['"]/g,
        replacement: (match, p1) => match.replace(p1, '@/lib/types/domain/constants')
    },
    {
        pattern: /import.*from\s+['"](\.\.\/)+lib\/types\/domain\/fields['"]/g,
        replacement: (match, p1) => match.replace(p1, '@/lib/types/domain/fields')
    },
    {
        pattern: /import.*from\s+['"](\.\.\/)+lib\/types\/domain\/definitions['"]/g,
        replacement: (match, p1) => match.replace(p1, '@/lib/types/domain/definitions')
    },
    {
        pattern: /import.*from\s+['"](\.\.\/)+lib\/types\/common['"]/g,
        replacement: (match, p1) => match.replace(p1, '@/types/common')
    },
    {
        pattern: /import.*from\s+['"](\.\.\/)+types\/common['"]/g,
        replacement: (match, p1) => match.replace(p1, '@/types/common')
    },
    
    // UI 组件相关
    {
        pattern: /import.*from\s+['"](\.\.\/)+ui\/composites['"]/g,
        replacement: (match, p1) => match.replace(p1, '@/ui/composites')
    },
    {
        pattern: /import.*from\s+['"](\.\.\/)+ui\/styles['"]/g,
        replacement: (match, p1) => match.replace(p1, '@/ui/styles')
    },
    
    // 工具函数相关
    {
        pattern: /import.*from\s+['"](\.\.\/)+lib\/utils\/core['"]/g,
        replacement: (match, p1) => match.replace(p1, '@/lib/utils/core')
    },
    {
        pattern: /import.*from\s+['"](\.\.\/)+utils\/core['"]/g,
        replacement: (match, p1) => match.replace(p1, '@/lib/utils/core')
    },
    {
        pattern: /import.*from\s+['"](\.\.\/)+utils\/path['"]/g,
        replacement: (match, p1) => match.replace(p1, '@/utils/path')
    },
    {
        pattern: /import.*from\s+['"](\.\.\/)+utils\/array['"]/g,
        replacement: (match, p1) => match.replace(p1, '@/utils/array')
    },
    
    // 服务相关
    {
        pattern: /import.*from\s+['"](\.\.\/)+lib\/services\/core['"]/g,
        replacement: (match, p1) => match.replace(p1, '@lib/services/core')
    },
    
    // 平台相关
    {
        pattern: /import.*from\s+['"](\.\.\/)+platform\/obsidian['"]/g,
        replacement: (match, p1) => match.replace(p1, '@platform/obsidian')
    },
    
    // Hooks 相关
    {
        pattern: /import.*from\s+['"](\.\.\/)+hooks\/shared['"]/g,
        replacement: (match, p1) => match.replace(p1, '@/hooks/shared')
    },
    
    // 常量相关
    {
        pattern: /import.*from\s+['"](\.\.\/)+constants['"]/g,
        replacement: (match, p1) => match.replace(p1, '@constants')
    },
    
    // 主入口
    {
        pattern: /import.*from\s+['"](\.\.\/)+main['"]/g,
        replacement: (match, p1) => match.replace(p1, '@main')
    }
];

// 新增：重复路径清理规则
const DUPLICATE_PATH_CLEANUP_RULES = [
    // 清理已有别名后的重复路径
    {
        pattern: /@store\/AppStore[^'"]*\.\.\/[^'"]*store\/AppStore/g,
        replacement: '@store/AppStore',
        description: 'Clean duplicate AppStore path'
    },
    {
        pattern: /@store\/AppStore[^'"]*\.\.\/[^'"]*AppStore/g,
        replacement: '@store/AppStore',
        description: 'Clean duplicate AppStore path (short)'
    },
    {
        pattern: /@\/lib\/types\/domain\/schema[^'"]*\.\.\/[^'"]*types\/domain\/schema/g,
        replacement: '@/lib/types/domain/schema',
        description: 'Clean duplicate schema path'
    },
    {
        pattern: /@\/lib\/types\/domain\/schema[^'"]*\.\.\/[^'"]*schema/g,
        replacement: '@/lib/types/domain/schema',
        description: 'Clean duplicate schema path (short)'
    },
    {
        pattern: /@\/lib\/types\/domain\/constants[^'"]*\.\.\/[^'"]*types\/domain\/constants/g,
        replacement: '@/lib/types/domain/constants',
        description: 'Clean duplicate constants path'
    },
    {
        pattern: /@\/lib\/types\/domain\/constants[^'"]*\.\.\/[^'"]*constants/g,
        replacement: '@/lib/types/domain/constants',
        description: 'Clean duplicate constants path (short)'
    },
    {
        pattern: /@constants[^'"]*\.\.\/[^'"]*constants/g,
        replacement: '@constants',
        description: 'Clean duplicate @constants path'
    },
    {
        pattern: /@\/utils\/path[^'"]*\.\.\/[^'"]*utils\/path/g,
        replacement: '@/utils/path',
        description: 'Clean duplicate utils/path'
    },
    {
        pattern: /@\/utils\/path[^'"]*\.\.\/[^'"]*path/g,
        replacement: '@/utils/path',
        description: 'Clean duplicate utils/path (short)'
    },
    {
        pattern: /@\/types\/common[^'"]*\.\.\/[^'"]*types\/common/g,
        replacement: '@/types/common',
        description: 'Clean duplicate types/common'
    },
    {
        pattern: /@\/types\/common[^'"]*\.\.\/[^'"]*common/g,
        replacement: '@/types/common',
        description: 'Clean duplicate types/common (short)'
    },
    {
        pattern: /@\/lib\/services[^'"]*\.\.\/[^'"]*lib\/services/g,
        replacement: '@/lib/services',
        description: 'Clean duplicate lib/services'
    },
    {
        pattern: /@\/lib\/services[^'"]*\.\.\/[^'"]*services/g,
        replacement: '@/lib/services',
        description: 'Clean duplicate lib/services (short)'
    }
];

// 通用重复路径清理规则（暂时禁用复杂模式）
const GENERIC_CLEANUP_RULES = [
    // 注意：JavaScript正则表达式不支持复杂的反向引用，这里暂时禁用
    // 如果需要更复杂的清理，可以在后续迭代中添加具体的模式
];

// 统计信息
let stats = {
    totalFiles: 0,
    processedFiles: 0,
    skippedFiles: 0,
    totalReplacements: 0,
    duplicatePathFixes: 0,
    errors: [],
    fixedPaths: []
};

// 备份文件
function backupFile(filePath) {
    const backupPath = filePath + '.backup.' + Date.now();
    fs.copyFileSync(filePath, backupPath);
    return backupPath;
}

// 清理重复路径
function cleanDuplicatePaths(content) {
    let cleanedContent = content;
    let duplicateReplacements = 0;
    const fixedInThisFile = [];

    // 应用重复路径清理规则
    DUPLICATE_PATH_CLEANUP_RULES.forEach(rule => {
        const matches = cleanedContent.match(rule.pattern);
        if (matches) {
            cleanedContent = cleanedContent.replace(rule.pattern, rule.replacement);
            duplicateReplacements += matches.length;
            fixedInThisFile.push({
                rule: rule.description,
                matches: matches.length,
                pattern: rule.pattern.toString()
            });
        }
    });

    return {
        content: cleanedContent,
        replacements: duplicateReplacements,
        fixes: fixedInThisFile
    };
}

// 处理单个文件
function processFile(filePath) {
    try {
        const originalContent = fs.readFileSync(filePath, 'utf8');
        let modifiedContent = originalContent;
        let fileReplacements = 0;

        // 1. 先应用原有的替换规则（相对路径转别名）
        ORIGINAL_REPLACEMENT_RULES.forEach(rule => {
            const matches = modifiedContent.match(rule.pattern);
            if (matches) {
                modifiedContent = modifiedContent.replace(rule.pattern, rule.replacement);
                fileReplacements += matches.length;
            }
        });

        // 2. 清理重复路径
        const cleanupResult = cleanDuplicatePaths(modifiedContent);
        modifiedContent = cleanupResult.content;
        fileReplacements += cleanupResult.replacements;
        stats.duplicatePathFixes += cleanupResult.replacements;

        // 记录修复的路径
        if (cleanupResult.fixes.length > 0) {
            stats.fixedPaths.push({
                file: filePath,
                fixes: cleanupResult.fixes
            });
        }

        // 如果有修改，写入文件
        if (modifiedContent !== originalContent) {
            backupFile(filePath);
            fs.writeFileSync(filePath, modifiedContent, 'utf8');
            stats.totalReplacements += fileReplacements;
            console.log(`✅ ${filePath} - ${fileReplacements} replacements (${cleanupResult.replacements} duplicate path fixes)`);
            stats.processedFiles++;
        } else {
            console.log(`⏭️  ${filePath} - no changes needed`);
            stats.skippedFiles++;
        }
    } catch (error) {
        console.error(`❌ Error processing ${filePath}:`, error.message);
        stats.errors.push({ file: filePath, error: error.message });
    }
}

// 查找需要处理的文件
function findFiles() {
    const patterns = [
        'src/**/*.ts',
        'src/**/*.tsx',
        'src/**/*.js',
        'src/**/*.jsx'
    ];
    
    const files = [];
    patterns.forEach(pattern => {
        const matched = glob.sync(pattern);
        files.push(...matched);
    });
    
    return [...new Set(files)]; // 去重
}

// 生成详细报告
function generateReport() {
    console.log('\n📋 Detailed Fix Report:');
    if (stats.fixedPaths.length > 0) {
        stats.fixedPaths.forEach(fileInfo => {
            console.log(`\n📄 ${fileInfo.file}:`);
            fileInfo.fixes.forEach(fix => {
                console.log(`  ✓ ${fix.rule}: ${fix.matches} fixes`);
            });
        });
    } else {
        console.log('  No duplicate path fixes were needed.');
    }
}

// 主函数
function main() {
    console.log('🚀 Starting enhanced batch path replacement...\n');
    console.log('🔧 This script will:');
    console.log('  1. Convert relative paths to aliases');
    console.log('  2. Clean up duplicate path segments');
    console.log('  3. Fix malformed alias imports\n');
    
    const files = findFiles();
    stats.totalFiles = files.length;
    
    console.log(`📁 Found ${files.length} files to process\n`);
    
    files.forEach(file => {
        processFile(file);
    });
    
    // 输出统计信息
    console.log('\n📊 Processing complete!');
    console.log(`Total files: ${stats.totalFiles}`);
    console.log(`Processed files: ${stats.processedFiles}`);
    console.log(`Skipped files: ${stats.skippedFiles}`);
    console.log(`Total replacements: ${stats.totalReplacements}`);
    console.log(`Duplicate path fixes: ${stats.duplicatePathFixes}`);
    
    if (stats.errors.length > 0) {
        console.log('\n❌ Errors encountered:');
        stats.errors.forEach(error => {
            console.log(`  ${error.file}: ${error.error}`);
        });
    }

    generateReport();
    
    console.log('\n✨ Done! Backup files created with .backup.* extension');
    console.log('💡 Next steps:');
    console.log('  1. Run "npm run build" to verify fixes');
    console.log('  2. Test the application');
    console.log('  3. Commit changes if everything works');
}

// 检查是否安装了 glob
try {
    require('glob');
} catch (error) {
    console.error('❌ Missing required dependency: glob');
    console.log('Please install it with: npm install glob');
    process.exit(1);
}

// 运行脚本
if (require.main === module) {
    main();
}

module.exports = { processFile, cleanDuplicatePaths, DUPLICATE_PATH_CLEANUP_RULES };
