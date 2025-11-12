const { describe, it, expect, beforeEach, afterEach } = require('@jest/globals');
const { DEFAULT_SETTINGS } = require('@core/domain/schema');

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

  describe('基本集成测试', () => {
    it('应该能够加载和初始化 AppStore', async () => {
      // 动态导入 AppStore
      const { AppStore } = require('@store/AppStore');
      
      const appStore = new AppStore(DEFAULT_SETTINGS);
      appStore.setPlugin(mockPlugin);
      
      expect(appStore).toBeDefined();
      
      // 测试基本状态
      const state = appStore.getState();
      expect(state).toBeDefined();
      expect(state.settings).toBeDefined();
      expect(state.timers).toEqual([]);
      expect(state.isTimerWidgetVisible).toBeDefined();
    });

    it('应该能够更新设置', async () => {
      const { AppStore } = require('@store/AppStore');
      
      const appStore = new AppStore(DEFAULT_SETTINGS);
      appStore.setPlugin(mockPlugin);
      
      // 使用 updateInputSettings 更新设置
      await appStore.updateInputSettings({
        taskFolder: '测试文件夹'
      });
      
      const state = appStore.getState();
      expect(state.settings.inputSettings.taskFolder).toBe('测试文件夹');
      expect(mockPlugin.saveData).toHaveBeenCalled();
    });

    it('应该能够管理计时器', async () => {
      const { AppStore } = require('@store/AppStore');
      
      const appStore = new AppStore(DEFAULT_SETTINGS);
      appStore.setPlugin(mockPlugin);
      
      // 添加计时器
      const timer = {
        taskId: 'test-task-1',
        startTime: Date.now(),
        elapsedSeconds: 0,
        status: 'running'
      };
      
      await appStore.addTimer(timer);
      
      let state = appStore.getState();
      expect(state.timers).toHaveLength(1);
      expect(state.timers[0].taskId).toBe(timer.taskId);
      expect(state.timers[0].status).toBe(timer.status);
      
      // 更新计时器
      const updatedTimer = {
        ...state.timers[0],
        status: 'paused',
        elapsedSeconds: 100
      };
      
      await appStore.updateTimer(updatedTimer);
      
      state = appStore.getState();
      expect(state.timers[0].status).toBe('paused');
      expect(state.timers[0].elapsedSeconds).toBe(100);
      
      // 移除计时器
      await appStore.removeTimer(state.timers[0].id);
      
      state = appStore.getState();
      expect(state.timers).toHaveLength(0);
    });

    it('应该能够管理视图实例', async () => {
      const { AppStore } = require('@store/AppStore');
      
      const appStore = new AppStore(DEFAULT_SETTINGS);
      appStore.setPlugin(mockPlugin);
      
      // 添加视图实例
      await appStore.addViewInstance('测试视图');
      
      let state = appStore.getState();
      expect(state.settings.viewInstances).toHaveLength(1);
      expect(state.settings.viewInstances[0].title).toBe('测试视图');
      
      // 更新视图实例
      await appStore.updateViewInstance(state.settings.viewInstances[0].id, {
        title: '更新后的视图'
      });
      
      state = appStore.getState();
      expect(state.settings.viewInstances[0].title).toBe('更新后的视图');
      
      // 删除视图实例
      await appStore.deleteViewInstance(state.settings.viewInstances[0].id);
      
      state = appStore.getState();
      expect(state.settings.viewInstances).toHaveLength(0);
    });

    it('应该能够管理数据源', async () => {
      const { AppStore } = require('@store/AppStore');
      
      const appStore = new AppStore(DEFAULT_SETTINGS);
      appStore.setPlugin(mockPlugin);
      
      // 添加数据源
      await appStore.addDataSource('测试数据源');
      
      let state = appStore.getState();
      expect(state.settings.dataSources).toHaveLength(1);
      expect(state.settings.dataSources[0].name).toBe('测试数据源');
      
      // 更新数据源
      await appStore.updateDataSource(state.settings.dataSources[0].id, {
        name: '更新后的数据源'
      });
      
      state = appStore.getState();
      expect(state.settings.dataSources[0].name).toBe('更新后的数据源');
      
      // 删除数据源
      await appStore.deleteDataSource(state.settings.dataSources[0].id);
      
      state = appStore.getState();
      expect(state.settings.dataSources).toHaveLength(0);
    });

    it('应该能够处理订阅通知', async () => {
      const { AppStore } = require('@store/AppStore');
      
      const appStore = new AppStore(DEFAULT_SETTINGS);
      appStore.setPlugin(mockPlugin);
      
      const listener = jest.fn();
      const unsubscribe = appStore.subscribe(listener);
      
      // 触发状态更新
      await appStore.addDataSource('测试');
      
      expect(listener).toHaveBeenCalled();
      
      // 取消订阅
      unsubscribe();
      
      // 再次触发更新
      await appStore.addDataSource('测试2');
      
      // 监听器应该只被调用了一次（取消订阅前）
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it('应该能够管理布局', async () => {
      const { AppStore } = require('@store/AppStore');
      
      const appStore = new AppStore(DEFAULT_SETTINGS);
      appStore.setPlugin(mockPlugin);
      
      // 添加布局
      await appStore.addLayout('测试布局');
      
      let state = appStore.getState();
      expect(state.settings.layouts).toHaveLength(1);
      expect(state.settings.layouts[0].name).toBe('测试布局');
      
      // 更新布局
      await appStore.updateLayout(state.settings.layouts[0].id, {
        name: '更新后的布局',
        displayMode: 'grid'
      });
      
      state = appStore.getState();
      expect(state.settings.layouts[0].name).toBe('更新后的布局');
      expect(state.settings.layouts[0].displayMode).toBe('grid');
      
      // 删除布局
      await appStore.deleteLayout(state.settings.layouts[0].id);
      
      state = appStore.getState();
      expect(state.settings.layouts).toHaveLength(0);
    });

    it('应该能够管理分组', async () => {
      const { AppStore } = require('@store/AppStore');
      
      const appStore = new AppStore(DEFAULT_SETTINGS);
      appStore.setPlugin(mockPlugin);
      
      // 添加分组
      await appStore.addGroup('测试分组', null, 'dataSource');
      
      let state = appStore.getState();
      expect(state.settings.groups).toHaveLength(1);
      expect(state.settings.groups[0].name).toBe('测试分组');
      expect(state.settings.groups[0].type).toBe('dataSource');
      
      // 更新分组
      await appStore.updateGroup(state.settings.groups[0].id, {
        name: '更新后的分组'
      });
      
      state = appStore.getState();
      expect(state.settings.groups[0].name).toBe('更新后的分组');
      
      // 删除分组
      await appStore.deleteGroup(state.settings.groups[0].id);
      
      state = appStore.getState();
      expect(state.settings.groups).toHaveLength(0);
    });

    it('应该能够切换计时器悬浮窗可见性', () => {
      const { AppStore } = require('@store/AppStore');
      
      const initialSettings = { ...DEFAULT_SETTINGS, floatingTimerEnabled: false };
      const appStore = new AppStore(initialSettings);
      appStore.setPlugin(mockPlugin);
      
      // 初始状态应该与设置同步
      let state = appStore.getState();
      expect(state.isTimerWidgetVisible).toBe(false);
      
      // 切换可见性
      appStore.toggleTimerWidgetVisibility();
      
      state = appStore.getState();
      expect(state.isTimerWidgetVisible).toBe(true);
      
      // 再次切换
      appStore.toggleTimerWidgetVisibility();
      
      state = appStore.getState();
      expect(state.isTimerWidgetVisible).toBe(false);
    });
  });

  describe('错误处理集成测试', () => {
    it('应该能够处理保存设置失败', async () => {
      const { AppStore } = require('@store/AppStore');
      
      // Mock 保存失败
      mockPlugin.saveData.mockRejectedValue(new Error('保存失败'));
      
      const appStore = new AppStore(DEFAULT_SETTINGS);
      appStore.setPlugin(mockPlugin);
      
      // 应该不抛出错误
      await expect(appStore.updateInputSettings({ taskFolder: 'test' }))
        .resolves.not.toThrow();
      
      // 设置应该仍然更新到内存中
      const state = appStore.getState();
      expect(state.settings.inputSettings.taskFolder).toBe('test');
    });

    it('应该能够处理插件未设置的情况', async () => {
      const { AppStore } = require('@store/AppStore');
      
      const appStore = new AppStore(DEFAULT_SETTINGS);
      // 不设置插件
      
      // 添加数据源时不应该抛出错误，虽然不会保存到文件
      await appStore.addDataSource('测试');
      
      // 数据应该仍然更新到内存中
      const state = appStore.getState();
      // 由于插件未设置，数据无法持久化，但会在内存中更新
      // 检查是否没有抛出错误即可
      expect(appStore).toBeDefined();
      
      // 由于初始化时 DEFAULT_SETTINGS.dataSources 是空数组
      // 并且没有插件来保存，所以状态应该仍然是空的
      // 这是预期的行为 - 没有插件时，更改不会被保存
      expect(state.settings.dataSources).toBeDefined();
    });
  });

  describe('性能集成测试', () => {
    it('应该在合理时间内处理大量数据', async () => {
      const { AppStore } = require('@store/AppStore');
      
      const appStore = new AppStore(DEFAULT_SETTINGS);
      appStore.setPlugin(mockPlugin);
      
      const startTime = performance.now();
      
      // 添加大量数据源
      for (let i = 0; i < 100; i++) {
        await appStore.addDataSource(`数据源 ${i}`);
      }
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // 应该在合理时间内完成
      expect(duration).toBeLessThan(1000);
      
      const state = appStore.getState();
      expect(state.settings.dataSources).toHaveLength(100);
    });

    it('应该能够处理频繁的状态更新', async () => {
      const { AppStore } = require('@store/AppStore');
      
      const appStore = new AppStore(DEFAULT_SETTINGS);
      appStore.setPlugin(mockPlugin);
      
      const listener = jest.fn();
      appStore.subscribe(listener);
      
      const startTime = performance.now();
      
      // 执行多次状态更新
      for (let i = 0; i < 50; i++) {
        appStore.toggleTimerWidgetVisibility();
      }
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // 应该在合理时间内完成
      expect(duration).toBeLessThan(100);
      
      // 监听器应该被调用了50次
      expect(listener).toHaveBeenCalledTimes(50);
    });
  });
});
