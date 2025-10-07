// test/unit/dataStore-theme.test.ts
import 'reflect-metadata';
import { container } from 'tsyringe';
import { DataStore } from '@core/services/dataStore';
import { FileService } from '@core/services/fileService';
import type { FileServiceInterface } from '@core/interfaces/fileService.interface';
import type { Item } from '@core/domain/schema';

// Mock FileService
class MockFileService implements FileServiceInterface {
    private mockFiles: Map<string, string> = new Map();

    setMockFile(path: string, content: string) {
        this.mockFiles.set(path, content);
    }

    async readFile(path: string): Promise<string> {
        return this.mockFiles.get(path) || '';
    }

    async writeFile(path: string, content: string): Promise<void> {
        this.mockFiles.set(path, content);
    }

    async exists(path: string): Promise<boolean> {
        return this.mockFiles.has(path);
    }

    async createFolderIfNotExists(path: string): Promise<void> {
        // Mock implementation
    }

    async getAllMarkdownFiles(): Promise<string[]> {
        return Array.from(this.mockFiles.keys()).filter(path => path.endsWith('.md'));
    }

    async deleteFile(path: string): Promise<void> {
        this.mockFiles.delete(path);
    }

    listFiles(path: string): string[] {
        return Array.from(this.mockFiles.keys()).filter(p => p.startsWith(path));
    }

    getBaseName(path: string): string {
        return path.split('/').pop() || '';
    }
}

describe('DataStore 主题处理', () => {
    let dataStore: DataStore;
    let mockFileService: MockFileService;

    beforeEach(() => {
        // 清理容器
        container.clearInstances();
        
        // 注册 mock 服务
        mockFileService = new MockFileService();
        container.registerInstance('FileService', mockFileService as any);
        
        // 创建 DataStore 实例
        dataStore = container.resolve(DataStore);
    });

    describe('任务主题从章节标题(header)提取', () => {
        test('应将章节标题设置为任务的主题', async () => {
            const content = `
# 工作计划

## 本周任务
- [ ] 完成代码审查
- [ ] 更新文档

## 会议安排
- [ ] 周一晨会
- [ ] 项目讨论会
`;
            mockFileService.setMockFile('work.md', content);
            
            await dataStore.scanFile('work.md');
            const items = dataStore.getAllItemsCached();
            
            // 验证任务主题
            const codeReview = items.find(item => item.title === '完成代码审查');
            expect(codeReview).toBeDefined();
            expect(codeReview?.header).toBe('本周任务');
            expect(codeReview?.theme).toBe('本周任务');
            
            const updateDoc = items.find(item => item.title === '更新文档');
            expect(updateDoc).toBeDefined();
            expect(updateDoc?.header).toBe('本周任务');
            expect(updateDoc?.theme).toBe('本周任务');
            
            const mondayMeeting = items.find(item => item.title === '周一晨会');
            expect(mondayMeeting).toBeDefined();
            expect(mondayMeeting?.header).toBe('会议安排');
            expect(mondayMeeting?.theme).toBe('会议安排');
        });

        test('没有章节标题的任务theme应为undefined', async () => {
            const content = `
- [ ] 独立任务1
- [ ] 独立任务2
`;
            mockFileService.setMockFile('tasks.md', content);
            
            await dataStore.scanFile('tasks.md');
            const items = dataStore.getAllItemsCached();
            
            const task1 = items.find(item => item.title === '独立任务1');
            expect(task1).toBeDefined();
            expect(task1?.header).toBeUndefined();
            expect(task1?.theme).toBeUndefined();
        });

        test('应正确处理多级标题', async () => {
            const content = `
# 项目管理

## 前端开发

### React组件
- [ ] 开发Button组件
- [ ] 开发Modal组件

### 测试任务
- [ ] 编写单元测试
- [ ] 集成测试

## 后端开发
- [ ] API设计
`;
            mockFileService.setMockFile('project.md', content);
            
            await dataStore.scanFile('project.md');
            const items = dataStore.getAllItemsCached();
            
            // React组件任务
            const buttonTask = items.find(item => item.title === '开发Button组件');
            expect(buttonTask?.header).toBe('React组件');
            expect(buttonTask?.theme).toBe('React组件');
            
            // 测试任务
            const unitTest = items.find(item => item.title === '编写单元测试');
            expect(unitTest?.header).toBe('测试任务');
            expect(unitTest?.theme).toBe('测试任务');
            
            // 后端任务
            const apiDesign = items.find(item => item.title === 'API设计');
            expect(apiDesign?.header).toBe('后端开发');
            expect(apiDesign?.theme).toBe('后端开发');
        });

        test('已完成的任务也应设置主题', async () => {
            const content = `
## 已完成工作
- [x] 修复Bug ✅ 2025-01-06
- [x] 发布版本 ✅ 2025-01-07
`;
            mockFileService.setMockFile('done.md', content);
            
            await dataStore.scanFile('done.md');
            const items = dataStore.getAllItemsCached();
            
            const bugFix = items.find(item => item.title === '修复Bug');
            expect(bugFix).toBeDefined();
            expect(bugFix?.header).toBe('已完成工作');
            expect(bugFix?.theme).toBe('已完成工作');
            expect(bugFix?.categoryKey).toBe('任务/done');
        });

        test('取消的任务也应设置主题', async () => {
            const content = `
## 已取消任务
- [-] 旧版本功能 ❌ 2025-01-05
`;
            mockFileService.setMockFile('cancelled.md', content);
            
            await dataStore.scanFile('cancelled.md');
            const items = dataStore.getAllItemsCached();
            
            const cancelledTask = items.find(item => item.title === '旧版本功能');
            expect(cancelledTask).toBeDefined();
            expect(cancelledTask?.header).toBe('已取消任务');
            expect(cancelledTask?.theme).toBe('已取消任务');
            expect(cancelledTask?.categoryKey).toBe('任务/cancelled');
        });
    });

    describe('块主题保持原有逻辑', () => {
        test('块的主题从主题字段提取', async () => {
            const content = `
## 学习笔记

<!-- start -->
主题:: 技术/前端
内容:: React Hooks 学习笔记
<!-- end -->

<!-- start -->
主题:: 生活/健康
内容:: 今天跑步5公里
<!-- end -->
`;
            mockFileService.setMockFile('notes.md', content);
            
            await dataStore.scanFile('notes.md');
            const items = dataStore.getAllItemsCached();
            
            const reactNote = items.find(item => 
                item.type === 'block' && item.content?.includes('React Hooks')
            );
            expect(reactNote).toBeDefined();
            expect(reactNote?.theme).toBe('技术/前端');
            
            const runNote = items.find(item => 
                item.type === 'block' && item.content?.includes('跑步5公里')
            );
            expect(runNote).toBeDefined();
            expect(runNote?.theme).toBe('生活/健康');
        });

        test('块没有主题字段时theme为undefined', async () => {
            const content = `
<!-- start -->
分类:: 随笔
内容:: 没有主题的内容
<!-- end -->
`;
            mockFileService.setMockFile('block.md', content);
            
            await dataStore.scanFile('block.md');
            const items = dataStore.getAllItemsCached();
            
            const block = items.find(item => 
                item.type === 'block' && item.content?.includes('没有主题的内容')
            );
            expect(block).toBeDefined();
            expect(block?.theme).toBeUndefined();
        });
    });

    describe('混合内容处理', () => {
        test('同一文件中任务和块的主题应独立处理', async () => {
            const content = `
# 今日安排

## 工作任务
- [ ] 写代码
- [ ] 开会

<!-- start -->
主题:: 个人/日记
内容:: 今天心情不错
<!-- end -->

## 生活任务
- [ ] 买菜
- [ ] 做饭

<!-- start -->
主题:: 学习/阅读
内容:: 读完了一本书
<!-- end -->
`;
            mockFileService.setMockFile('daily.md', content);
            
            await dataStore.scanFile('daily.md');
            const items = dataStore.getAllItemsCached();
            
            // 验证任务主题
            const codeTask = items.find(item => item.title === '写代码');
            expect(codeTask?.theme).toBe('工作任务');
            
            const shopTask = items.find(item => item.title === '买菜');
            expect(shopTask?.theme).toBe('生活任务');
            
            // 验证块主题
            const diaryBlock = items.find(item => 
                item.type === 'block' && item.content?.includes('心情不错')
            );
            expect(diaryBlock?.theme).toBe('个人/日记');
            
            const readBlock = items.find(item => 
                item.type === 'block' && item.content?.includes('读完了一本书')
            );
            expect(readBlock?.theme).toBe('学习/阅读');
        });
    });

    describe('性能测试', () => {
        test('处理大量任务时主题设置性能', async () => {
            let content = '# 大量任务测试\n\n';
            
            // 创建多个章节，每个章节有多个任务
            for (let i = 1; i <= 10; i++) {
                content += `## 章节${i}\n`;
                for (let j = 1; j <= 10; j++) {
                    content += `- [ ] 任务${i}-${j}\n`;
                }
                content += '\n';
            }
            
            mockFileService.setMockFile('large.md', content);
            
            const startTime = Date.now();
            await dataStore.scanFile('large.md');
            const endTime = Date.now();
            
            const items = dataStore.getAllItemsCached();
            
            // 验证任务数量
            expect(items.length).toBe(100);
            
            // 验证主题设置正确
            const task55 = items.find(item => item.title === '任务5-5');
            expect(task55?.theme).toBe('章节5');
            
            // 性能检查：处理100个任务应该在100ms内完成
            expect(endTime - startTime).toBeLessThan(100);
        });
    });

    describe('特殊字符处理', () => {
        test('章节标题包含特殊字符时的主题处理', async () => {
            const content = `
## 2025/01/07 - 今日任务
- [ ] 任务1

## [重要] 紧急事项
- [ ] 任务2

## 项目#1: 新功能
- [ ] 任务3
`;
            mockFileService.setMockFile('special.md', content);
            
            await dataStore.scanFile('special.md');
            const items = dataStore.getAllItemsCached();
            
            const task1 = items.find(item => item.title === '任务1');
            expect(task1?.theme).toBe('2025/01/07 - 今日任务');
            
            const task2 = items.find(item => item.title === '任务2');
            expect(task2?.theme).toBe('[重要] 紧急事项');
            
            const task3 = items.find(item => item.title === '任务3');
            expect(task3?.theme).toBe('项目#1: 新功能');
        });

        test('章节标题包含emoji时的主题处理', async () => {
            const content = `
## 🎯 目标管理
- [ ] 设定目标

## 📚 学习计划
- [ ] 阅读书籍

## 💼 工作安排
- [ ] 项目开发
`;
            mockFileService.setMockFile('emoji.md', content);
            
            await dataStore.scanFile('emoji.md');
            const items = dataStore.getAllItemsCached();
            
            const goalTask = items.find(item => item.title === '设定目标');
            expect(goalTask?.theme).toBe('🎯 目标管理');
            
            const studyTask = items.find(item => item.title === '阅读书籍');
            expect(studyTask?.theme).toBe('📚 学习计划');
            
            const workTask = items.find(item => item.title === '项目开发');
            expect(workTask?.theme).toBe('💼 工作安排');
        });
    });
});
