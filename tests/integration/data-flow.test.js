import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { AppStore } from '../../src/store/AppStore.js';
import { DataStore } from '../../src/store/DataStore.js';
import { TaskService } from '../../src/services/TaskService.js';
import { TimerService } from '../../src/services/TimerService.js';
import { FileFactory, TaskFactory, TimerFactory } from '../../test-utils/factories/task-factory.js';
import { createMockObsidianAPI } from '../../test-utils/mocks/obsidian-api-mock.js';

describe('数据流集成测试', () => {
  let mockApp, mockVault, mockPlugin;
  let appStore, dataStore, taskService, timerService;

  beforeEach(() => {
    const mockAPI = createMockObsidianAPI();
    mockApp = mockAPI.app;
    mockVault = mockApp.vault;
    
    mockPlugin = {
      saveData: jest.fn(),
      loadData: jest.fn().mockResolvedValue({}),
      app: mockApp
    };

    // 初始化服务
    appStore = new AppStore(mockPlugin);
    dataStore = new DataStore(mockApp);
    taskService = new TaskService(mockApp, dataStore);
    timerService = new TimerService(appStore, taskService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('完整的数据流测试', () => {
    it('应该完成从文件扫描到视图显示的完整流程', async () => {
      // 1. 创建测试文件
      const testFile = FileFactory.createComplexFile('test/workflow.md');
      mockVault.addFile('test/workflow.md', testFile.content);

      // 2. 扫描文件
      const scanResult = await dataStore.scanAllFiles();
      expect(scanResult.tasks.length).toBeGreaterThan(0);
      expect(scanResult.blocks.length).toBeGreaterThan(0);

      // 3. 更新 AppStore 数据源
      appStore.setDataSource(scanResult);

      // 4. 验证数据传递
      const appState = appStore.getState();
      expect(appState.dataSource.tasks).toEqual(scanResult.tasks);
      expect(appState.dataSource.blocks).toEqual(scanResult.blocks);

      // 5. 模拟视图注册
      const viewInstance = { id: 'task-view-1', type: 'task' };
      appStore.registerViewInstance(viewInstance);

      // 6. 验证视图可以获取数据
      const taskViewData = appStore.getState().dataSource.tasks;
      expect(taskViewData.length).toBeGreaterThan(0);
    });

    it('应该处理任务更新和数据同步', async () => {
      // 1. 初始化数据
      const file = FileFactory.createTaskFile('test/sync.md', 3);
      mockVault.addFile('test/sync.md', file.content);
      
      await dataStore.scanAllFiles();
      appStore.setDataSource(dataStore.getData());

      const initialTaskCount = appStore.getState().dataSource.tasks.length;

      // 2. 更新任务
      const task = appStore.getState().dataSource.tasks[0];
      const updatedTask = { ...task, completed: true };

      await taskService.updateTask(task.id, updatedTask);

      // 3. 验证数据同步
      const updatedData = dataStore.getData();
      const updatedTaskInStore = updatedData.tasks.find(t => t.id === task.id);
      expect(updatedTaskInStore.completed).toBe(true);

      // 4. 验证 AppStore 也得到更新
      appStore.setDataSource(updatedData);
      const appStoreTask = appStore.getState().dataSource.tasks.find(t => t.id === task.id);
      expect(appStoreTask.completed).toBe(true);
    });

    it('应该处理计时器与任务的集成', async () => {
      // 1. 创建任务
      const task = TaskFactory.createTask();
      const file = FileFactory.createMarkdownFile('test/timer.md', 
        `- [ ] ${task.content}`
      );
      mockVault.addFile('test/timer.md', file.content);
      
      await dataStore.scanAllFiles();
      appStore.setDataSource(dataStore.getData());

      // 2. 启动计时器
      const timer = TimerFactory.createActiveTimer(task.id);
      appStore.addTimer(timer);

      // 3. 停止计时器并应用时间
      await timerService.stopAndApply(timer.id);

      // 4. 验证任务时间被更新
      const updatedTask = dataStore.getData().tasks.find(t => t.id === task.id);
      expect(updatedTask.duration).toBeGreaterThan(0);
      expect(updatedTask.time).toBeDefined();

      // 5. 验证计时器被移除
      const activeTimer = appStore.getState().timers.find(t => t.id === timer.id);
      expect(activeTimer.isActive).toBe(false);
    });
  });

  describe('状态管理集成', () => {
    it('应该正确处理设置变更的级联更新', async () => {
      // 1. 设置初始状态
      await dataStore.scanAllFiles();
      appStore.setDataSource(dataStore.getData());

      // 2. 更新设置
      const newSettings = {
        defaultLayout: '新布局',
        viewSettings: {
          taskView: {
            groupBy: 'priority',
            sortBy: 'createdAt'
          }
        }
      };

      await appStore.updateSettings(newSettings);

      // 3. 验证设置持久化
      expect(mockPlugin.saveData).toHaveBeenCalledWith(
        expect.objectContaining(newSettings)
      );

      // 4. 验证视图可以响应设置变更
      const viewInstance = { 
        id: 'responsive-view', 
        type: 'task',
        onSettingsChange: jest.fn()
      };
      appStore.registerViewInstance(viewInstance);

      // 5. 再次更新设置
      await appStore.updateSettings({ defaultLayout: '另一个布局' });

      // 6. 验证视图得到通知（如果实现了）
      expect(appStore.getState().settings.defaultLayout).toBe('另一个布局');
    });

    it('应该处理数据源变更的通知', async () => {
      // 1. 初始化数据
      await dataStore.scanAllFiles();
      appStore.setDataSource(dataStore.getData());

      // 2. 注册监听器
      const listener = jest.fn();
      appStore.subscribe(listener);

      // 3. 更新数据源
      const newData = {
        tasks: [TaskFactory.createTask({ content: '新任务' })],
        blocks: []
      };
      appStore.setDataSource(newData);

      // 4. 验证监听器被调用
      expect(listener).toHaveBeenCalled();

      // 5. 验证状态更新
      expect(appStore.getState().dataSource).toBe(newData);
    });
  });

  describe('错误处理集成', () => {
    it('应该优雅处理文件系统错误', async () => {
      // 1. Mock 文件读取错误
      mockVault.read = jest.fn().mockRejectedValue(new Error('文件读取失败'));

      // 2. 尝试扫描文件
      const result = await dataStore.scanAllFiles();

      // 3. 验证错误被处理
      expect(result.tasks).toEqual([]);
      expect(result.blocks).toEqual([]);

      // 4. 验证 AppStore 仍然可以工作
      appStore.setDataSource(result);
      expect(appStore.getState().dataSource).toEqual(result);
    });

    it('应该处理任务更新失败', async () => {
      // 1. 创建任务
      const task = TaskFactory.createTask();
      const file = FileFactory.createMarkdownFile('test/error.md', 
        `- [ ] ${task.content}`
      );
      mockVault.addFile('test/error.md', file.content);
      
      await dataStore.scanAllFiles();
      appStore.setDataSource(dataStore.getData());

      // 2. Mock 文件写入失败
      mockVault.modify = jest.fn().mockRejectedValue(new Error('文件写入失败'));

      // 3. 尝试更新任务
      const updatedTask = { ...task, completed: true };
      
      // 4. 验证错误不抛出
      await expect(taskService.updateTask(task.id, updatedTask))
        .resolves.not.toThrow();
    });

    it('应该处理计时器服务错误', async () => {
      // 1. 创建无效的计时器
      const invalidTimer = TimerFactory.createTimer({ taskId: 'non-existent-task' });
      appStore.addTimer(invalidTimer);

      // 2. 尝试停止计时器
      await expect(timerService.stopAndApply(invalidTimer.id))
        .resolves.not.toThrow();

      // 3. 验证计时器被清理
      const timer = appStore.getState().timers.find(t => t.id === invalidTimer.id);
      expect(timer.isActive).toBe(false);
    });
  });

  describe('性能集成测试', () => {
    it('应该在合理时间内完成完整工作流', async () => {
      // 1. 创建大量测试数据
      for (let i = 0; i < 50; i++) {
        const file = FileFactory.createTaskFile(`test/perf${i}.md`, 10);
        mockVault.addFile(`test/perf${i}.md`, file.content);
      }

      const startTime = performance.now();

      // 2. 执行完整工作流
      await dataStore.scanAllFiles();
      appStore.setDataSource(dataStore.getData());

      // 3. 注册多个视图
      for (let i = 0; i < 5; i++) {
        appStore.registerViewInstance({ 
          id: `view-${i}`, 
          type: i % 2 === 0 ? 'task' : 'block' 
        });
      }

      // 4. 启动多个计时器
      const tasks = appStore.getState().dataSource.tasks.slice(0, 3);
      tasks.forEach(task => {
        const timer = TimerFactory.createActiveTimer(task.id);
        appStore.addTimer(timer);
      });

      const endTime = performance.now();
      const duration = endTime - startTime;

      // 5. 验证性能
      expect(duration).toBeLessThan(1000); // 应该在1秒内完成
      expect(appStore.getState().dataSource.tasks.length).toBe(500);
      expect(appStore.getState().viewInstances.length).toBe(5);
      expect(appStore.getState().timers.length).toBe(3);
    });

    it('应该高效处理增量更新', async () => {
      // 1. 初始化基础数据
      for (let i = 0; i < 20; i++) {
        const file = FileFactory.createTaskFile(`test/base${i}.md`, 5);
        mockVault.addFile(`test/base${i}.md`, file.content);
      }

      await dataStore.scanAllFiles();
      appStore.setDataSource(dataStore.getData());

      const initialTaskCount = appStore.getState().dataSource.tasks.length;

      // 2. 执行增量更新
      const startTime = performance.now();

      // 添加新文件
      for (let i = 0; i < 5; i++) {
        const file = FileFactory.createTaskFile(`test/new${i}.md`, 3);
        mockVault.addFile(`test/new${i}.md`, file.content);
      }

      const changes = await dataStore.detectChanges();
      await dataStore.updateFiles(changes.added);
      appStore.setDataSource(dataStore.getData());

      const endTime = performance.now();
      const duration = endTime - startTime;

      // 3. 验证增量更新性能
      expect(duration).toBeLessThan(200); // 增量更新应该在200ms内完成
      expect(appStore.getState().dataSource.tasks.length).toBe(initialTaskCount + 15);
    });
  });

  describe('并发集成测试', () => {
    it('应该处理并发的数据操作', async () => {
      // 1. 创建测试数据
      for (let i = 0; i < 10; i++) {
        const file = FileFactory.createTaskFile(`test/concurrent${i}.md`, 5);
        mockVault.addFile(`test/concurrent${i}.md`, file.content);
      }

      // 2. 并发执行操作
      const promises = [
        dataStore.scanAllFiles(),
        appStore.load(),
        taskService.getAllTasks(),
        timerService.getActiveTimers()
      ];

      const results = await Promise.all(promises);

      // 3. 验证结果
      expect(results[0].tasks.length).toBeGreaterThan(0);
      expect(results[1]).toBeDefined();
      expect(Array.isArray(results[2])).toBe(true);
      expect(Array.isArray(results[3])).toBe(true);
    });

    it('应该处理并发的状态更新', async () => {
      // 1. 初始化数据
      await dataStore.scanAllFiles();
      appStore.setDataSource(dataStore.getData());

      // 2. 并发更新状态
      const updatePromises = [
        appStore.updateSettings({ defaultLayout: '布局1' }),
        appStore.updateSettings({ enableTimeTracking: false }),
        appStore.updateSettings({ autoSave: false })
      ];

      await Promise.all(updatePromises);

      // 3. 验证最终状态一致性
      const finalState = appStore.getState();
      expect(finalState.settings.defaultLayout).toBe('布局1');
      expect(finalState.settings.enableTimeTracking).toBe(false);
      expect(finalState.settings.autoSave).toBe(false);
    });
  });
});
