const fs = require('fs');
const path = require('path');

/**
 * 功能模块化架构重构工具
 * 用于自动化迁移现有代码到新的架构结构
 */
class ArchitectureMigrator {
    constructor(options = {}) {
        this.dryRun = options.dryRun || false;
        this.verbose = options.verbose || true;
        this.migrationLog = [];
        this.baseDir = process.cwd();
        this.srcDir = path.join(this.baseDir, 'src');
        
        // 文件迁移映射配置
        this.migrationMap = {
            // 核心服务迁移
            'src/lib/services/core/ActionService.ts': 'src/core/services/ActionService.ts',
            'src/lib/services/core/dataStore.ts': 'src/core/services/DataStore.ts',
            'src/lib/services/core/RendererService.ts': 'src/core/services/RendererService.ts',
            'src/lib/services/core/inputService.ts': 'src/core/services/InputService.ts',
            'src/lib/services/core/taskService.ts': 'src/core/services/TaskService.ts',
            'src/lib/services/core/storage.ts': 'src/core/services/StorageService.ts',
            'src/store/AppStore.ts': 'src/core/stores/AppStore.ts',
            
            // 计时器功能迁移
            'src/lib/services/core/TimerService.ts': 'src/features/timer/services/TimerService.ts',
            'src/lib/services/core/TimerStateService.ts': 'src/features/timer/services/TimerStateService.ts',
            'src/store/stores/TimerStore.ts': 'src/features/timer/stores/TimerStore.ts',
            
            // 主题功能迁移
            'src/lib/services/core/ThemeManager.ts': 'src/features/theme/services/ThemeManager.ts',
            'src/lib/types/domain/theme.ts': 'src/features/theme/types/theme.ts',
            'src/store/stores/ThemeStore.ts': 'src/features/theme/stores/ThemeStore.ts',
            
            // 仪表盘功能迁移
            'src/store/stores/BlockStore.ts': 'src/features/dashboard/stores/BlockStore.ts',
            'src/store/stores/LayoutStore.ts': 'src/features/dashboard/stores/LayoutStore.ts',
            'src/store/stores/ViewInstanceStore.ts': 'src/features/dashboard/stores/ViewInstanceStore.ts',
            
            // 设置功能迁移
            'src/store/stores/SettingsStore.ts': 'src/features/settings/stores/SettingsStore.ts',
            
            // 共享资源迁移
            'src/types/common.ts': 'src/shared/types/common.ts',
            'src/constants/index.ts': 'src/shared/constants/index.ts',
        };
        
        // 导入路径更新映射
        this.importMappings = {
            // 核心服务
            '@/lib/services/core/': '@/core/services/',
            '@lib/services/core/': '@core/services/',
            '@store/AppStore': '@core/stores/AppStore',
            
            // 功能模块
            '@store/stores/TimerStore': '@features/timer/stores/TimerStore',
            '@store/stores/ThemeStore': '@features/theme/stores/ThemeStore',
            '@store/stores/SettingsStore': '@features/settings/stores/SettingsStore',
            '@store/stores/BlockStore': '@features/dashboard/stores/BlockStore',
            '@store/stores/LayoutStore': '@features/dashboard/stores/LayoutStore',
            '@store/stores/ViewInstanceStore': '@features/dashboard/stores/ViewInstanceStore',
            
            // 共享资源
            '@/types/': '@/shared/types/',
            '@constants/': '@shared/constants/',
            '@lib/types/domain/': '@shared/types/',
        };
    }
    
    log(message, level = 'info') {
        const timestamp = new Date().toLocaleTimeString();
        const logEntry = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
        this.migrationLog.push(logEntry);
        
        if (this.verbose) {
            console.log(logEntry);
        }
    }
    
    /**
     * 阶段1: 创建新的目录结构
     */
    async createDirectoryStructure() {
        this.log('🏗️ 开始创建新目录结构...');
        
        const directories = [
            // 核心目录
            'src/core/services',
            'src/core/types',
            'src/core/utils',
            'src/core/stores',
            
            // 功能模块目录
            'src/features/timer/services',
            'src/features/timer/stores',
            'src/features/timer/components',
            'src/features/timer/types',
            
            'src/features/settings/stores',
            'src/features/settings/components',
            'src/features/settings/types',
            
            'src/features/dashboard/stores',
            'src/features/dashboard/components',
            'src/features/dashboard/types',
            
            'src/features/theme/services',
            'src/features/theme/stores',
            'src/features/theme/types',
            
            // 共享资源目录
            'src/shared/components/common',
            'src/shared/components/layout',
            'src/shared/hooks',
            'src/shared/types',
            'src/shared/utils',
            'src/shared/constants',
        ];
        
        for (const dir of directories) {
            const fullPath = path.join(this.baseDir, dir);
            
            if (!this.dryRun) {
                if (!fs.existsSync(fullPath)) {
                    fs.mkdirSync(fullPath, { recursive: true });
                    this.log(`✅ 创建目录: ${dir}`);
                } else {
                    this.log(`ℹ️ 目录已存在: ${dir}`);
                }
            } else {
                this.log(`[预览] 将创建目录: ${dir}`);
            }
        }
        
        this.log('🏗️ 目录结构创建完成');
    }
    
    /**
     * 创建index.ts文件
     */
    async createIndexFiles() {
        this.log('📝 开始创建index.ts文件...');
        
        const indexFiles = [
            'src/core/services/index.ts',
            'src/core/types/index.ts',
            'src/core/utils/index.ts',
            'src/core/stores/index.ts',
            'src/core/index.ts',
            
            'src/features/timer/services/index.ts',
            'src/features/timer/stores/index.ts',
            'src/features/timer/components/index.ts',
            'src/features/timer/types/index.ts',
            'src/features/timer/index.ts',
            
            'src/features/settings/stores/index.ts',
            'src/features/settings/components/index.ts',
            'src/features/settings/types/index.ts',
            'src/features/settings/index.ts',
            
            'src/features/dashboard/stores/index.ts',
            'src/features/dashboard/components/index.ts',
            'src/features/dashboard/types/index.ts',
            'src/features/dashboard/index.ts',
            
            'src/features/theme/services/index.ts',
            'src/features/theme/stores/index.ts',
            'src/features/theme/types/index.ts',
            'src/features/theme/index.ts',
            
            'src/features/index.ts',
            
            'src/shared/components/index.ts',
            'src/shared/hooks/index.ts',
            'src/shared/types/index.ts',
            'src/shared/utils/index.ts',
            'src/shared/constants/index.ts',
            'src/shared/index.ts',
        ];
        
        for (const indexFile of indexFiles) {
            const fullPath = path.join(this.baseDir, indexFile);
            
            if (!this.dryRun) {
                if (!fs.existsSync(fullPath)) {
                    fs.writeFileSync(fullPath, '// TODO: 添加导出\n', 'utf8');
                    this.log(`✅ 创建文件: ${indexFile}`);
                } else {
                    this.log(`ℹ️ 文件已存在: ${indexFile}`);
                }
            } else {
                this.log(`[预览] 将创建文件: ${indexFile}`);
            }
        }
        
        this.log('📝 index.ts文件创建完成');
    }
    
    /**
     * 迁移单个文件
     */
    async migrateFile(sourcePath, targetPath) {
        const sourceFullPath = path.join(this.baseDir, sourcePath);
        const targetFullPath = path.join(this.baseDir, targetPath);
        
        if (!fs.existsSync(sourceFullPath)) {
            this.log(`⚠️ 源文件不存在: ${sourcePath}`, 'warn');
            return false;
        }
        
        if (!this.dryRun) {
            // 确保目标目录存在
            const targetDir = path.dirname(targetFullPath);
            if (!fs.existsSync(targetDir)) {
                fs.mkdirSync(targetDir, { recursive: true });
            }
            
            // 复制文件
            const content = fs.readFileSync(sourceFullPath, 'utf8');
            fs.writeFileSync(targetFullPath, content, 'utf8');
            
            this.log(`✅ 迁移文件: ${sourcePath} → ${targetPath}`);
        } else {
            this.log(`[预览] 将迁移文件: ${sourcePath} → ${targetPath}`);
        }
        
        return true;
    }
    
    /**
     * 批量迁移文件
     */
    async migrateFiles() {
        this.log('📁 开始批量迁移文件...');
        
        let successCount = 0;
        let failCount = 0;
        
        for (const [source, target] of Object.entries(this.migrationMap)) {
            const success = await this.migrateFile(source, target);
            if (success) {
                successCount++;
            } else {
                failCount++;
            }
        }
        
        this.log(`📁 文件迁移完成 - 成功: ${successCount}, 失败: ${failCount}`);
    }
    
    /**
     * 更新文件中的导入路径
     */
    async updateImports() {
        this.log('🔗 开始更新导入路径...');
        
        // 获取所有.ts和.tsx文件
        const tsFiles = this.getAllTsFiles(this.srcDir);
        
        for (const filePath of tsFiles) {
            await this.updateFileImports(filePath);
        }
        
        this.log('🔗 导入路径更新完成');
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
     * 更新单个文件的导入路径
     */
    async updateFileImports(filePath) {
        if (!fs.existsSync(filePath)) {
            return;
        }
        
        const content = fs.readFileSync(filePath, 'utf8');
        let updatedContent = content;
        let hasChanges = false;
        
        // 应用导入路径映射
        for (const [oldPath, newPath] of Object.entries(this.importMappings)) {
            const regex = new RegExp(oldPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
            if (updatedContent.includes(oldPath)) {
                updatedContent = updatedContent.replace(regex, newPath);
                hasChanges = true;
            }
        }
        
        if (hasChanges && !this.dryRun) {
            fs.writeFileSync(filePath, updatedContent, 'utf8');
            const relativePath = path.relative(this.baseDir, filePath);
            this.log(`✅ 更新导入: ${relativePath}`);
        } else if (hasChanges) {
            const relativePath = path.relative(this.baseDir, filePath);
            this.log(`[预览] 将更新导入: ${relativePath}`);
        }
    }
    
    /**
     * 验证构建
     */
    async validateBuild() {
        this.log('✅ 开始验证构建...');
        
        if (this.dryRun) {
            this.log('[预览模式] 跳过构建验证');
            return true;
        }
        
        const { spawn } = require('child_process');
        
        return new Promise((resolve) => {
            const build = spawn('npm', ['run', 'build'], {
                stdio: 'inherit',
                shell: true
            });
            
            build.on('close', (code) => {
                if (code === 0) {
                    this.log('✅ 构建验证成功');
                    resolve(true);
                } else {
                    this.log('❌ 构建验证失败', 'error');
                    resolve(false);
                }
            });
        });
    }
    
    /**
     * 生成迁移报告
     */
    generateReport() {
        const reportPath = path.join(this.baseDir, 'migration-report.md');
        const reportContent = `# 架构迁移报告

## 执行时间
${new Date().toLocaleString()}

## 执行模式
${this.dryRun ? '预览模式（未实际执行）' : '实际执行模式'}

## 迁移日志
\`\`\`
${this.migrationLog.join('\n')}
\`\`\`

## 迁移文件列表
${Object.entries(this.migrationMap).map(([source, target]) => `- ${source} → ${target}`).join('\n')}

## 导入路径更新
${Object.entries(this.importMappings).map(([old, newPath]) => `- \`${old}\` → \`${newPath}\``).join('\n')}
`;

        if (!this.dryRun) {
            fs.writeFileSync(reportPath, reportContent, 'utf8');
            this.log(`📊 迁移报告已生成: ${reportPath}`);
        } else {
            this.log('[预览] 将生成迁移报告: migration-report.md');
        }
    }
    
    /**
     * 执行完整迁移流程
     */
    async migrate() {
        this.log('🚀 开始架构重构迁移...');
        
        try {
            // 阶段1: 基础架构搭建
            await this.createDirectoryStructure();
            await this.createIndexFiles();
            
            // 阶段2: 文件迁移
            await this.migrateFiles();
            
            // 阶段3: 更新导入路径
            await this.updateImports();
            
            // 阶段4: 验证构建
            const buildSuccess = await this.validateBuild();
            
            // 阶段5: 生成报告
            this.generateReport();
            
            if (buildSuccess) {
                this.log('🎉 架构重构迁移完成！');
            } else {
                this.log('⚠️ 迁移完成，但构建验证失败，请检查错误', 'warn');
            }
            
        } catch (error) {
            this.log(`❌ 迁移过程中发生错误: ${error.message}`, 'error');
            throw error;
        }
    }
}

// 命令行参数解析
function parseArgs() {
    const args = process.argv.slice(2);
    const options = {
        dryRun: false,
        verbose: true,
        module: null
    };
    
    for (const arg of args) {
        if (arg === '--dry-run') {
            options.dryRun = true;
        } else if (arg === '--quiet') {
            options.verbose = false;
        } else if (arg.startsWith('--module=')) {
            options.module = arg.split('=')[1];
        }
    }
    
    return options;
}

// 主程序入口
async function main() {
    const options = parseArgs();
    
    console.log('🏗️ Obsidian插件架构重构工具');
    console.log(`执行模式: ${options.dryRun ? '预览模式' : '实际执行模式'}`);
    console.log('================================');
    
    const migrator = new ArchitectureMigrator(options);
    
    try {
        await migrator.migrate();
    } catch (error) {
        console.error('迁移失败:', error);
        process.exit(1);
    }
}

// 如果直接运行此脚本
if (require.main === module) {
    main().catch(console.error);
}

module.exports = ArchitectureMigrator;
