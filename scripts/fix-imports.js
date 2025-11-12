const fs = require('fs');
const path = require('path');

/**
 * 批量修复导入路径的脚本
 */
class ImportFixer {
    constructor() {
        this.baseDir = process.cwd();
        this.srcDir = path.join(this.baseDir, 'src');
        this.fixLog = [];
        
        // 定义导入路径映射规则
        this.importMappings = [
            // 相对路径修复
            { from: /from ['"]\.\/storeRegistry['"]/, to: "from '@store/storeRegistry'" },
            { from: /from ['"]\.\/stores['"]/, to: "from '@store/stores'" },
            { from: /from ['"]\.\/types['"]/, to: "from '@core/services/types'" },
            { from: /from ['"]\.\/storage['"]/, to: "from '@core/services/StorageService'" },
            { from: /from ['"]\.\/dataStore['"]/, to: "from '@core/services/DataStore'" },
            { from: /from ['"]\.\/taskService['"]/, to: "from '@core/services/TaskService'" },
            { from: /from ['"]\.\/inputService['"]/, to: "from '@core/services/InputService'" },
            { from: /from ['"]\.\/ThemeManager['"]/, to: "from '@features/theme/services/ThemeManager'" },
            
            // 核心服务路径更新
            { from: /from ['"]@\/lib\/services\/core\/ActionService['"]/, to: "from '@core/services/ActionService'" },
            { from: /from ['"]@lib\/services\/core\/ActionService['"]/, to: "from '@core/services/ActionService'" },
            { from: /from ['"]@\/lib\/services\/core\/dataStore['"]/, to: "from '@core/services/DataStore'" },
            { from: /from ['"]@lib\/services\/core\/dataStore['"]/, to: "from '@core/services/DataStore'" },
            { from: /from ['"]@\/lib\/services\/core\/RendererService['"]/, to: "from '@core/services/RendererService'" },
            { from: /from ['"]@lib\/services\/core\/RendererService['"]/, to: "from '@core/services/RendererService'" },
            { from: /from ['"]@\/lib\/services\/core\/inputService['"]/, to: "from '@core/services/InputService'" },
            { from: /from ['"]@lib\/services\/core\/inputService['"]/, to: "from '@core/services/InputService'" },
            { from: /from ['"]@\/lib\/services\/core\/taskService['"]/, to: "from '@core/services/TaskService'" },
            { from: /from ['"]@lib\/services\/core\/taskService['"]/, to: "from '@core/services/TaskService'" },
            { from: /from ['"]@\/lib\/services\/core\/storage['"]/, to: "from '@core/services/StorageService'" },
            { from: /from ['"]@lib\/services\/core\/storage['"]/, to: "from '@core/services/StorageService'" },
            { from: /from ['"]@\/lib\/services\/core\/types['"]/, to: "from '@core/services/types'" },
            { from: /from ['"]@lib\/services\/core\/types['"]/, to: "from '@core/services/types'" },
            
            // 计时器功能模块路径更新
            { from: /from ['"]@\/lib\/services\/core\/TimerService['"]/, to: "from '@features/timer/services/TimerService'" },
            { from: /from ['"]@lib\/services\/core\/TimerService['"]/, to: "from '@features/timer/services/TimerService'" },
            { from: /from ['"]@\/lib\/services\/core\/TimerStateService['"]/, to: "from '@features/timer/services/TimerStateService'" },
            { from: /from ['"]@lib\/services\/core\/TimerStateService['"]/, to: "from '@features/timer/services/TimerStateService'" },
            
            // 主题功能模块路径更新
            { from: /from ['"]@\/lib\/services\/core\/ThemeManager['"]/, to: "from '@features/theme/services/ThemeManager'" },
            { from: /from ['"]@lib\/services\/core\/ThemeManager['"]/, to: "from '@features/theme/services/ThemeManager'" },
            { from: /from ['"]@\/lib\/types\/domain\/theme['"]/, to: "from '@features/theme/types/theme'" },
            { from: /from ['"]@lib\/types\/domain\/theme['"]/, to: "from '@features/theme/types/theme'" },
            
            // Store路径更新
            { from: /from ['"]@\/store\/AppStore['"]/, to: "from '@core/stores/AppStore'" },
            { from: /from ['"]@store\/AppStore['"]/, to: "from '@core/stores/AppStore'" },
            { from: /from ['"]@store\/stores\/TimerStore['"]/, to: "from '@features/timer/stores/TimerStore'" },
            { from: /from ['"]@store\/stores\/ThemeStore['"]/, to: "from '@features/theme/stores/ThemeStore'" },
            { from: /from ['"]@store\/stores\/SettingsStore['"]/, to: "from '@features/settings/stores/SettingsStore'" },
            { from: /from ['"]@store\/stores\/BlockStore['"]/, to: "from '@features/dashboard/stores/BlockStore'" },
            { from: /from ['"]@store\/stores\/LayoutStore['"]/, to: "from '@features/dashboard/stores/LayoutStore'" },
            { from: /from ['"]@store\/stores\/ViewInstanceStore['"]/, to: "from '@features/dashboard/stores/ViewInstanceStore'" },
            
            // 共享资源路径更新
            { from: /from ['"]@\/types\/['"]/, to: "from '@shared/types/'" },
            { from: /from ['"]@types\/['"]/, to: "from '@shared/types/'" },
            { from: /from ['"]@\/constants\/['"]/, to: "from '@shared/constants/'" },
            { from: /from ['"]@constants\/['"]/, to: "from '@shared/constants/'" },
            
            // 修复大小写问题
            { from: /from ['"]@core\/services\/inputService['"]/, to: "from '@core/services/InputService'" },
            { from: /from ['"]@core\/services\/taskService['"]/, to: "from '@core/services/TaskService'" },
            { from: /from ['"]@core\/services\/dataStore['"]/, to: "from '@core/services/DataStore'" },
        ];
    }
    
    /**
     * 获取所有TypeScript文件
     */
    getAllTsFiles(dir) {
        const files = [];
        
        function walk(currentDir) {
            const items = fs.readdirSync(currentDir);
            
            for (const item of items) {
                const fullPath = path.join(currentDir, item);
                const stat = fs.statSync(fullPath);
                
                if (stat.isDirectory()) {
                    walk(fullPath);
                } else if (item.endsWith('.ts') || item.endsWith('.tsx')) {
                    files.push(fullPath);
                }
            }
        }
        
        if (fs.existsSync(dir)) {
            walk(dir);
        }
        
        return files;
    }
    
    /**
     * 修复单个文件的导入
     */
    fixFileImports(filePath) {
        if (!fs.existsSync(filePath)) {
            return false;
        }
        
        const content = fs.readFileSync(filePath, 'utf8');
        let updatedContent = content;
        let hasChanges = false;
        
        // 应用所有导入路径映射
        for (const mapping of this.importMappings) {
            if (mapping.from.test(updatedContent)) {
                updatedContent = updatedContent.replace(mapping.from, mapping.to);
                hasChanges = true;
                
                const relativePath = path.relative(this.baseDir, filePath);
                this.fixLog.push(`✅ 修复导入: ${relativePath} - ${mapping.from} → ${mapping.to}`);
            }
        }
        
        if (hasChanges) {
            fs.writeFileSync(filePath, updatedContent, 'utf8');
            return true;
        }
        
        return false;
    }
    
    /**
     * 搜索和显示所有需要修复的导入
     */
    scanForBrokenImports() {
        console.log('🔍 扫描所有需要修复的导入...');
        
        const tsFiles = this.getAllTsFiles(this.srcDir);
        const brokenImports = [];
        
        for (const filePath of tsFiles) {
            const content = fs.readFileSync(filePath, 'utf8');
            const relativePath = path.relative(this.baseDir, filePath);
            
            // 查找所有导入语句
            const importRegex = /import\s+.*?from\s+['"]([^'"]+)['"]/g;
            let match;
            
            while ((match = importRegex.exec(content)) !== null) {
                const importPath = match[1];
                
                // 检查是否是需要修复的导入
                for (const mapping of this.importMappings) {
                    if (mapping.from.test(match[0])) {
                        brokenImports.push({
                            file: relativePath,
                            line: content.substring(0, match.index).split('\n').length,
                            current: match[0],
                            suggested: match[0].replace(mapping.from, mapping.to)
                        });
                        break;
                    }
                }
            }
        }
        
        if (brokenImports.length > 0) {
            console.log(`\n📋 找到 ${brokenImports.length} 个需要修复的导入:`);
            for (const item of brokenImports) {
                console.log(`  ${item.file}:${item.line}`);
                console.log(`    当前: ${item.current}`);
                console.log(`    建议: ${item.suggested}\n`);
            }
        } else {
            console.log('✅ 没有找到需要修复的导入');
        }
        
        return brokenImports;
    }
    
    /**
     * 执行批量修复
     */
    async fixAllImports() {
        console.log('🛠️ 开始批量修复导入路径...');
        
        const tsFiles = this.getAllTsFiles(this.srcDir);
        let fixedCount = 0;
        
        for (const filePath of tsFiles) {
            const wasFixed = this.fixFileImports(filePath);
            if (wasFixed) {
                fixedCount++;
            }
        }
        
        console.log(`\n📊 修复完成统计:`);
        console.log(`- 扫描文件数: ${tsFiles.length}`);
        console.log(`- 修复文件数: ${fixedCount}`);
        console.log(`- 修复操作数: ${this.fixLog.length}`);
        
        if (this.fixLog.length > 0) {
            console.log(`\n📝 详细修复日志:`);
            for (const log of this.fixLog) {
                console.log(log);
            }
        }
        
        return { total: tsFiles.length, fixed: fixedCount, operations: this.fixLog.length };
    }
    
    /**
     * 验证修复结果
     */
    validateFixes() {
        console.log('\n✅ 验证修复结果...');
        const remainingIssues = this.scanForBrokenImports();
        
        if (remainingIssues.length === 0) {
            console.log('🎉 所有导入路径修复完成！');
            return true;
        } else {
            console.log(`⚠️ 还有 ${remainingIssues.length} 个导入需要手动修复`);
            return false;
        }
    }
}

// 命令行参数解析
function parseArgs() {
    const args = process.argv.slice(2);
    const options = {
        scan: false,
        fix: false,
        validate: false
    };
    
    if (args.includes('--scan')) options.scan = true;
    if (args.includes('--fix')) options.fix = true;
    if (args.includes('--validate')) options.validate = true;
    
    // 如果没有指定参数，默认执行修复
    if (!options.scan && !options.fix && !options.validate) {
        options.fix = true;
    }
    
    return options;
}

// 主程序入口
async function main() {
    const options = parseArgs();
    const fixer = new ImportFixer();
    
    console.log('🔧 导入路径修复工具');
    console.log('================================');
    
    try {
        if (options.scan) {
            await fixer.scanForBrokenImports();
        }
        
        if (options.fix) {
            const result = await fixer.fixAllImports();
            console.log('\n🎯 修复完成！');
            
            // 自动验证修复结果
            fixer.validateFixes();
        }
        
        if (options.validate) {
            fixer.validateFixes();
        }
        
    } catch (error) {
        console.error('❌ 修复失败:', error);
        process.exit(1);
    }
}

// 如果直接运行此脚本
if (require.main === module) {
    main().catch(console.error);
}

module.exports = ImportFixer;
