const { describe, it, expect, beforeEach, afterEach } = require('@jest/globals');
const { performance } = require('perf_hooks');
const { DEFAULT_SETTINGS } = require('@core/domain/schema');

describe('启动性能测试', () => {
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
      saveData: jest.fn().mockResolvedValue(undefined),
      loadData: jest.fn().mockResolvedValue(DEFAULT_SETTINGS),
      app: mockApp,
      timerStateService: {
        saveStateToFile: jest.fn().mockResolvedValue(undefined)
      }
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('AppStore 启动性能', () => {
    it('应该在合理时间内初始化 AppStore', () => {
      const { AppStore } = require('@store/AppStore');
      
      const startTime = performance.now();
      
      const appStore = new AppStore(DEFAULT_SETTINGS);
      appStore.setPlugin(mockPlugin);
      
      const endTime = performance.now();
      const initTime = endTime - startTime;
      
      expect(initTime).toBeLessThan(10); // 应该在10ms内完成
      expect(appStore.getState()).toBeDefined();
    });

    it('应该在合理时间内加载大量设置', async () => {
      const { AppStore } = require('@store/AppStore');
      
      // 创建包含大量数据的设置
      const largeSettings = {
        ...DEFAULT_SETTINGS,
        dataSources: Array.from({ length: 100 }, (_, i) => ({
          id: `ds_${i}`,
          name: `数据源 ${i}`,
          filters: [],
          sort: [],
          parentId: null
        })),
        viewInstances: Array.from({ length: 100 }, (_, i) => ({
          id: `view_${i}`,
          title: `视图 ${i}`,
          viewType: 'BlockView',
          dataSourceId: '',
          viewConfig: {},
          collapsed: true,
          parentId: null
        }))
      };
      
      const appStore = new AppStore(largeSettings);
      appStore.setPlugin(mockPlugin);
      
      const startTime = performance.now();
      const state = appStore.getState();
      const endTime = performance.now();
      const loadTime = endTime - startTime;
      
      expect(loadTime).toBeLessThan(50); // 应该在50ms内完成
      expect(state.settings.dataSources).toHaveLength(100);
      expect(state.settings.viewInstances).toHaveLength(100);
    });

    it('应该处理大量计时器数据', async () => {
      const { AppStore } = require('@store/AppStore');
      
      const appStore = new AppStore(DEFAULT_SETTINGS);
      appStore.setPlugin(mockPlugin);
      
      const startTime = performance.now();
      
      // 添加大量计时器
      for (let i = 0; i < 100; i++) {
        await appStore.addTimer({
          taskId: `task_${i}`,
          startTime: Date.now() - (i * 1000),
          elapsedSeconds: i * 10,
          status: i % 2 === 0 ? 'running' : 'paused'
        });
      }
      
      const endTime = performance.now();
      const addTime = endTime - startTime;
      
      expect(addTime).toBeLessThan(200); // 应该在200ms内完成
      expect(appStore.getState().timers).toHaveLength(100);
    });
  });

  describe('状态更新性能', () => {
    it('应该快速处理批量更新', async () => {
      const { AppStore } = require('@store/AppStore');
      
      const appStore = new AppStore(DEFAULT_SETTINGS);
      appStore.setPlugin(mockPlugin);
      
      const startTime = performance.now();
      
      // 批量添加数据源
      const promises = [];
      for (let i = 0; i < 50; i++) {
        promises.push(appStore.addDataSource(`数据源 ${i}`));
      }
      await Promise.all(promises);
      
      const endTime = performance.now();
      const batchTime = endTime - startTime;
      
      expect(batchTime).toBeLessThan(500); // 批量操作应该在500ms内完成
      expect(appStore.getState().settings.dataSources).toHaveLength(50);
    });

    it('应该高效处理监听器通知', async () => {
      const { AppStore } = require('@store/AppStore');
      
      const appStore = new AppStore(DEFAULT_SETTINGS);
      appStore.setPlugin(mockPlugin);
      
      // 添加多个监听器
      const listeners = [];
      for (let i = 0; i < 100; i++) {
        listeners.push(jest.fn());
        appStore.subscribe(listeners[i]);
      }
      
      const startTime = performance.now();
      
      // 触发状态更新
      await appStore.addDataSource('测试数据源');
      
      const endTime = performance.now();
      const notifyTime = endTime - startTime;
      
      expect(notifyTime).toBeLessThan(50); // 通知应该在50ms内完成
      listeners.forEach(listener => {
        expect(listener).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('内存使用性能', () => {
    it('应该合理使用内存', async () => {
      const { AppStore } = require('@store/AppStore');
      
      const initialMemory = process.memoryUsage().heapUsed;
      
      // 创建包含大量数据的 AppStore
      const largeSettings = {
        ...DEFAULT_SETTINGS,
        dataSources: Array.from({ length: 1000 }, (_, i) => ({
          id: `ds_${i}`,
          name: `数据源 ${i}`,
          filters: [],
          sort: [],
          parentId: null
        }))
      };
      
      const appStore = new AppStore(largeSettings);
      appStore.setPlugin(mockPlugin);
      
      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;
      
      // 内存增长应该在合理范围内（小于50MB）
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
      expect(appStore.getState().settings.dataSources).toHaveLength(1000);
    });

    it('应该正确释放内存', () => {
      const { AppStore } = require('@store/AppStore');
      
      let appStore = new AppStore(DEFAULT_SETTINGS);
      appStore.setPlugin(mockPlugin);
      
      // 添加一些数据
      for (let i = 0; i < 100; i++) {
        appStore.addDataSource(`数据源 ${i}`);
      }
      
      const memoryWithData = process.memoryUsage().heapUsed;
      
      // 清理引用
      appStore = null;
      
      // 强制垃圾回收（如果可用）
      if (global.gc) {
        global.gc();
      }
      
      const memoryAfterCleanup = process.memoryUsage().heapUsed;
      
      // 内存使用应该保持在合理范围内
      expect(memoryAfterCleanup).toBeLessThan(memoryWithData * 1.5);
    });
  });

  describe('并发性能', () => {
    it('应该能处理并发操作', async () => {
      const { AppStore } = require('@store/AppStore');
      
      const appStore = new AppStore(DEFAULT_SETTINGS);
      appStore.setPlugin(mockPlugin);
      
      const startTime = performance.now();
      
      // 并发执行多个操作
      const promises = [
        appStore.addDataSource('数据源1'),
        appStore.addViewInstance('视图1'),
        appStore.addLayout('布局1'),
        appStore.addGroup('分组1', null, 'dataSource'),
        appStore.updateInputSettings({ taskFolder: '任务文件夹' })
      ];
      
      await Promise.all(promises);
      
      const endTime = performance.now();
      const concurrentTime = endTime - startTime;
      
      expect(concurrentTime).toBeLessThan(100); // 并发操作应该在100ms内完成
      
      const state = appStore.getState();
      expect(state.settings.dataSources).toHaveLength(1);
      expect(state.settings.viewInstances).toHaveLength(1);
      expect(state.settings.layouts).toHaveLength(1);
      expect(state.settings.groups).toHaveLength(1);
    });

    it('应该处理大量并发订阅', () => {
      const { AppStore } = require('@store/AppStore');
      
      const appStore = new AppStore(DEFAULT_SETTINGS);
      appStore.setPlugin(mockPlugin);
      
      const startTime = performance.now();
      
      // 添加大量订阅
      const unsubscribes = [];
      for (let i = 0; i < 1000; i++) {
        const unsubscribe = appStore.subscribe(() => {});
        unsubscribes.push(unsubscribe);
      }
      
      // 触发更新
      appStore.toggleTimerWidgetVisibility();
      
      // 取消所有订阅
      unsubscribes.forEach(unsubscribe => unsubscribe());
      
      const endTime = performance.now();
      const subscriptionTime = endTime - startTime;
      
      expect(subscriptionTime).toBeLessThan(100); // 应该在100ms内完成
    });
  });

  describe('性能基准测试', () => {
    it('应该建立性能基准', async () => {
      const { AppStore } = require('@store/AppStore');
      
      const appStore = new AppStore(DEFAULT_SETTINGS);
      appStore.setPlugin(mockPlugin);
      
      // 标准测试数据集
      const operations = [];
      const startTime = performance.now();
      
      // 执行标准操作集
      for (let i = 0; i < 30; i++) {
        operations.push(appStore.addDataSource(`数据源 ${i}`));
      }
      for (let i = 0; i < 20; i++) {
        operations.push(appStore.addViewInstance(`视图 ${i}`));
      }
      for (let i = 0; i < 10; i++) {
        operations.push(appStore.addLayout(`布局 ${i}`));
      }
      
      await Promise.all(operations);
      
      const endTime = performance.now();
      const benchmarkTime = endTime - startTime;
      
      // 保存基准数据
      const benchmark = {
        timestamp: new Date().toISOString(),
        totalTime: benchmarkTime,
        dataSourceCount: 30,
        viewInstanceCount: 20,
        layoutCount: 10,
        averageTimePerOperation: benchmarkTime / 60
      };
      
      // 基准时间应该在合理范围内
      expect(benchmarkTime).toBeLessThan(300);
      
      console.log('性能基准:', benchmark);
    });

    it('应该检测性能改进', async () => {
      const { AppStore } = require('@store/AppStore');
      
      // 第一次运行
      const appStore1 = new AppStore(DEFAULT_SETTINGS);
      appStore1.setPlugin(mockPlugin);
      
      const startTime1 = performance.now();
      for (let i = 0; i < 10; i++) {
        await appStore1.addDataSource(`数据源 ${i}`);
      }
      const endTime1 = performance.now();
      const time1 = endTime1 - startTime1;
      
      // 第二次运行（应该由于缓存等原因更快）
      const appStore2 = new AppStore(DEFAULT_SETTINGS);
      appStore2.setPlugin(mockPlugin);
      
      const startTime2 = performance.now();
      for (let i = 0; i < 10; i++) {
        await appStore2.addDataSource(`数据源 ${i}`);
      }
      const endTime2 = performance.now();
      const time2 = endTime2 - startTime2;
      
      // 两次运行时间应该相近（在误差范围内）
      const timeDiff = Math.abs(time1 - time2);
      expect(timeDiff).toBeLessThan(50); // 差异应该小于50ms
    });
  });
});
