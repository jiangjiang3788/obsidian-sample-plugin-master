const { describe, it, expect, beforeEach, afterEach } = require('@jest/globals');

// 创建简化的集成测试，专注于验证核心功能
describe('数据流集成测试', () => {
  let mockPlugin, mockApp;

  beforeEach(() => {
    // 创建基本的 mock 对象
    mockApp = {
      vault: {
        getMarkdownFiles: jest.fn(() => []),
        read: jest.fn(),
        modify: jest.fn(),
        create: jest.fn(),
        delete: jest.fn()
      },
      metadataCache: {
        getFileCache: jest.fn(() => ({}))
      }
    };

    mockPlugin = {
      saveData: jest.fn(),
      loadData: jest.fn().mockResolvedValue({}),
      app: mockApp
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('基本集成测试', () => {
    it('应该能够加载和初始化 AppStore', async () => {
      // 动态导入 AppStore
      const { AppStore } = require('@state/store/AppStore');
      
      const appStore = new AppStore(mockPlugin);
      expect(appStore).toBeDefined();
      
      // 测试基本状态
      const state = appStore.getState();
      expect(state).toBeDefined();
      expect(state.settings).toBeDefined();
      expect(state.timers).toEqual([]);
      expect(state.viewInstances).toEqual([]);
    });

    it('应该能够更新设置', async () => {
      const { AppStore } = require('@state/store/AppStore');
      
      const appStore = new AppStore(mockPlugin);
      
      const newSettings = {
        defaultLayout: '测试布局',
        enableTimeTracking: true
      };

      await appStore.updateSettings(newSettings);
      
      const state = appStore.getState();
      expect(state.settings.defaultLayout).toBe('测试布局');
      expect(state.settings.enableTimeTracking).toBe(true);
      expect(mockPlugin.saveData).toHaveBeenCalled();
    });

    it('应该能够管理计时器', async () => {
      const { AppStore } = require('../../src/state/store/AppStore');
      
      const appStore = new AppStore(mockPlugin);
      
      // 添加计时器
      const timer = {
        id: 'test-timer-1',
        taskId: 'test-task-1',
        startTime: Date.now(),
        isActive: true
      };
      
      appStore.addTimer(timer);
      
      let state = appStore.getState();
      expect(state.timers).toHaveLength(1);
      expect(state.timers[0]).toEqual(timer);
      
      // 移除计时器
      appStore.removeTimer(timer.id);
      
      state = appStore.getState();
      expect(state.timers).toHaveLength(0);
    });

    it('应该能够注册和管理视图实例', () => {
      const { AppStore } = require('../../src/state/store/AppStore');
      
      const appStore = new AppStore(mockPlugin);
      
      const viewInstance = {
        id: 'test-view-1',
        type: 'task'
      };
      
      appStore.registerViewInstance(viewInstance);
      
      let state = appStore.getState();
      expect(state.viewInstances).toHaveLength(1);
      expect(state.viewInstances[0]).toEqual(viewInstance);
      
      // 注销视图
      appStore.unregisterViewInstance(viewInstance.id);
      
      state = appStore.getState();
      expect(state.viewInstances).toHaveLength(0);
    });

    it('应该能够设置数据源', () => {
      const { AppStore } = require('../../src/state/store/AppStore');
      
      const appStore = new AppStore(mockPlugin);
      
      const dataSource = {
        tasks: [
          { id: 'task-1', content: '测试任务1', completed: false },
          { id: 'task-2', content: '测试任务2', completed: true }
        ],
        blocks: [
          { id: 'block-1', content: '测试块1' }
        ]
      };
      
      appStore.setDataSource(dataSource);
      
      const state = appStore.getState();
      expect(state.dataSource).toEqual(dataSource);
      expect(state.dataSource.tasks).toHaveLength(2);
      expect(state.dataSource.blocks).toHaveLength(1);
    });

    it('应该能够处理订阅通知', () => {
      const { AppStore } = require('../../src/state/store/AppStore');
      
      const appStore = new AppStore(mockPlugin);
      
      const listener = jest.fn();
      appStore.subscribe(listener);
      
      // 触发状态更新
      appStore.setDataSource({ tasks: [], blocks: [] });
      
      expect(listener).toHaveBeenCalled();
      
      // 取消订阅
      appStore.unsubscribe(listener);
      
      // 再次触发更新
      appStore.setDataSource({ tasks: [{ id: 'new' }], blocks: [] });
      
      // 监听器应该只被调用了一次
      expect(listener).toHaveBeenCalledTimes(1);
    });
  });

  describe('错误处理集成测试', () => {
    it('应该能够处理保存设置失败', async () => {
      const { AppStore } = require('../../src/state/store/AppStore');
      
      // Mock 保存失败
      mockPlugin.saveData.mockRejectedValue(new Error('保存失败'));
      
      const appStore = new AppStore(mockPlugin);
      
      // 应该不抛出错误
      await expect(appStore.updateSettings({ test: true }))
        .resolves.not.toThrow();
      
      // 设置应该仍然更新到内存中
      const state = appStore.getState();
      expect(state.settings.test).toBe(true);
    });

    it('应该能够处理加载设置失败', async () => {
      const { AppStore } = require('../../src/state/store/AppStore');
      
      // Mock 加载失败
      mockPlugin.loadData.mockRejectedValue(new Error('加载失败'));
      
      // 应该不抛出错误
      await expect(new AppStore(mockPlugin))
        .resolves.not.toThrow();
    });
  });

  describe('性能集成测试', () => {
    it('应该在合理时间内处理大量数据', () => {
      const { AppStore } = require('../../src/state/store/AppStore');
      
      const appStore = new AppStore(mockPlugin);
      
      // 创建大量测试数据
      const largeDataSource = {
        tasks: Array.from({ length: 1000 }, (_, i) => ({
          id: `task-${i}`,
          content: `任务 ${i}`,
          completed: i % 2 === 0
        })),
        blocks: Array.from({ length: 500 }, (_, i) => ({
          id: `block-${i}`,
          content: `块 ${i}`
        }))
      };
      
      const startTime = performance.now();
      
      appStore.setDataSource(largeDataSource);
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // 应该在合理时间内完成
      expect(duration).toBeLessThan(100);
      
      const state = appStore.getState();
      expect(state.dataSource.tasks).toHaveLength(1000);
      expect(state.dataSource.blocks).toHaveLength(500);
    });

    it('应该能够处理频繁的状态更新', () => {
      const { AppStore } = require('../../src/state/store/AppStore');
      
      const appStore = new AppStore(mockPlugin);
      
      const startTime = performance.now();
      
      // 执行多次状态更新
      for (let i = 0; i < 100; i++) {
        appStore.setDataSource({
          tasks: [{ id: `task-${i}`, content: `任务 ${i}` }],
          blocks: []
        });
      }
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // 应该在合理时间内完成
      expect(duration).toBeLessThan(50);
      
      const state = appStore.getState();
      expect(state.dataSource.tasks).toHaveLength(1);
      expect(state.dataSource.tasks[0].id).toBe('task-99');
    });
  });
});
