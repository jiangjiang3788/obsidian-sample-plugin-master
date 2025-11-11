#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// 路径映射规则
const PATH_MAPPINGS = {
    // Store 相关
    'store/AppStore': '@store/AppStore',
    'store/storeRegistry': '@store/storeRegistry',
    
    // 类型定义相关
    'lib/types/domain/schema': '@/lib/types/domain/schema',
    'lib/types/domain/constants': '@/lib/types/domain/constants',
    'lib/types/domain/fields': '@/lib/types/domain/fields',
    'lib/types/domain/definitions': '@/lib/types/domain/definitions',
    'lib/types/common': '@/types/common',
    'types/common': '@/types/common',
    'types/domain/schema': '@/lib/types/domain/schema',
    'types/domain/constants': '@/lib/types/domain/constants',
    'types/domain/fields': '@/lib/types/domain/fields',
    'types/domain/definitions': '@/lib/types/domain/definitions',
    
    // UI 组件相关
    'ui/composites': '@/ui/composites',
    'ui/styles': '@/ui/styles',
    'ui/primitives': '@/ui/primitives',
    'ui/feedback': '@/ui/feedback',
    
    // 工具函数相关
    'lib/utils/core': '@/lib/utils/core',
    'utils/core': '@/lib/utils/core',
    'utils/path': '@/utils/path',
    'utils/array': '@/utils/array',
    'utils/shared': '@/utils/shared',
    
    // 服务相关
    'lib/services': '@/lib/services',
    'lib/services/core': '@lib/services/core',
    'services/core': '@lib/services/core',
    
    // 平台相关
    'platform/obsidian': '@platform/obsidian',
    
    // Hooks 相关
    'hooks/shared': '@/hooks/shared',
    
    // 常量相关
    'constants': '@constants',
    
    // 主入口
    'main.ts': '@main',
    'main': '@main',
    
    // 逻辑相关
    'lib/logic': '@/lib/logic',
    
    // 迁移相关
    'lib/migration': '@/lib/migration',
    
    // 模式相关
    'lib/patterns': '@/lib/patterns'
};

// 替换规则 - 从相对路径到别名的映射
const REPLACEMENT_RULES = [
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
    {
        pattern: /import.*from\s+['"](\.\.\/)+types\/domain\/schema['"]/g,
        replacement: (match, p1) => match.replace(p1, '@/lib/types/domain/schema')
    },
    {
        pattern: /import.*from\s+['"](\.\.\/)+types\/domain\/constants['"]/g,
        replacement: (match, p1) => match.replace(p1, '@/lib/types/domain/constants')
    },
    {
        pattern: /import.*from\s+['"](\.\.\/)+types\/domain\/fields['"]/g,
        replacement: (match, p1) => match.replace(p1, '@/lib/types/domain/fields')
    },
    {
        pattern: /import.*from\s+['"](\.\.\/)+types\/domain\/definitions['"]/g,
        replacement: (match, p1) => match.replace(p1, '@/lib/types/domain/definitions')
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
    {
        pattern: /import.*from\s+['"](\.\.\/)+ui\/primitives['"]/g,
        replacement: (match, p1) => match.replace(p1, '@/ui/primitives')
    },
    {
        pattern: /import.*from\s+['"](\.\.\/)+ui\/feedback['"]/g,
        replacement: (match, p1) => match.replace(p1, '@/ui/feedback')
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
    {
        pattern: /import.*from\s+['"](\.\.\/)+utils\/shared['"]/g,
        replacement: (match, p1) => match.replace(p1, '@/utils/shared')
    },
    
    // 服务相关
    {
        pattern: /import.*from\s+['"](\.\.\/)+lib\/services['"]/g,
        replacement: (match, p1) => match.replace(p1, '@/lib/services')
    },
    {
        pattern: /import.*from\s+['"](\.\.\/)+lib\/services\/core['"]/g,
        replacement: (match, p1) => match.replace(p1, '@lib/services/core')
    },
    {
        pattern: /import.*from\s+['"](\.\.\/)+services\/core['"]/g,
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
    },
    {
        pattern: /import.*from\s+['"](\.\.\/)+main\.ts['"]/g,
        replacement: (match, p1) => match.replace(p1, '@main')
    },
    
    // 逻辑相关
    {
        pattern: /import.*from\s+['"](\.\.\/)+lib\/logic['"]/g,
        replacement: (match, p1) => match.replace(p1, '@/lib/logic')
    },
    
    // 迁移相关
    {
        pattern: /import.*from\s+['"](\.\.\/)+lib\/migration['"]/g,
        replacement: (match, p1) => match.replace(p1, '@/lib/migration')
    },
    
    // 模式相关
    {
        pattern: /import.*from\s+['"](\.\.\/)+lib\/patterns['"]/g,
        replacement: (match, p1) => match.replace(p1, '@/lib/patterns')
    }
];

// 统计信息
let stats = {
    totalFiles: 0,
    processedFiles: 0,
    skippedFiles: 0,
    totalReplacements: 0,
    errors: []
};

// 备份文件
function backupFile(filePath) {
    const backupPath = filePath + '.backup.' + Date.now();
    fs.copyFileSync(filePath, backupPath);
    return backupPath;
}

// 处理单个文件
function processFile(filePath) {
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        let modifiedContent = content;
        let fileReplacements = 0;

        // 应用所有替换规则
        REPLACEMENT_RULES.forEach(rule => {
            const matches = content.match(rule.pattern);
            if (matches) {
                modifiedContent = modifiedContent.replace(rule.pattern, rule.replacement);
                fileReplacements += matches.length;
            }
        });

        // 如果有修改，写入文件
        if (modifiedContent !== content) {
            backupFile(filePath);
            fs.writeFileSync(filePath, modifiedContent, 'utf8');
            stats.totalReplacements += fileReplacements;
            console.log(`✅ ${filePath} - ${fileReplacements} replacements`);
        } else {
            console.log(`⏭️  ${filePath} - no changes needed`);
            stats.skippedFiles++;
        }

        stats.processedFiles++;
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

// 主函数
function main() {
    console.log('🚀 Starting batch path replacement...\n');
    
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
    
    if (stats.errors.length > 0) {
        console.log('\n❌ Errors encountered:');
        stats.errors.forEach(error => {
            console.log(`  ${error.file}: ${error.error}`);
        });
    }
    
    console.log('\n✨ Done! Backup files created with .backup.* extension');
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

module.exports = { processFile, REPLACEMENT_RULES };
