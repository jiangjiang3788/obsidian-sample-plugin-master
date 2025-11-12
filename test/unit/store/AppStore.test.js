const { describe, it, expect, beforeEach, afterEach } = require('@jest/globals');
const { AppStore } = require('@store/AppStore.ts');
const { DEFAULT_SETTINGS } = require('@core/domain/schema.ts');

describe('AppStore', () => {
  let appStore;
  let mockPlugin;
  let mockSettings;

  beforeEach(() => {
    // 创建默认设置
    mockSettings = {
      floatingTimerEnabled: true,
      dataSources: [],
      viewInstances: [],
      layouts: [],
      groups: [],
      inputSettings: {
        blocks: [],
        themes: [],
        overrides: []
      }
    };

    // 创建 Mock 插件对象
    mockPlugin = {
      saveData: jest.fn().mockResolvedValue(undefined),
      timerStateService: {
        saveStateToFile: jest.fn().mockResolvedValue(undefined)
      }
    };

    // 创建 AppStore 实例
    appStore = new AppStore(mockSettings);
    appStore.setPlugin(mockPlugin);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('初始化', () => {
    it('应该正确初始化默认状态', () => {
      const state = appStore.getState();
      
      expect(state).toHaveProperty('settings');
      expect(state).toHaveProperty('timers');
      expect(state).toHaveProperty('isTimerWidgetVisible');
      expect(Array.isArray(state.timers)).toBe(true);
      expect(typeof state.isTimerWidgetVisible).toBe('boolean');
    });

    it('应该根据设置初始化悬浮计时器可见性', () => {
      // 测试启用状态
      const storeEnabled = new AppStore({ ...mockSettings, floatingTimerEnabled: true });
      expect(storeEnabled.getState().isTimerWidgetVisible).toBe(true);

      // 测试禁用状态
      const storeDisabled = new AppStore({ ...mockSettings, floatingTimerEnabled: false });
      expect(storeDisabled.getState().isTimerWidgetVisible).toBe(false);
    });
  });

  describe('设置管理', () => {
    it('应该正确获取设置', () => {
      const settings = appStore.getSettings();
      expect(settings).toBe(mockSettings);
    });

    it('应该支持订阅状态变化', () => {
      const listener = jest.fn();
      
      const unsubscribe = appStore.subscribe(listener);
      
      // 触发状态变化
      appStore.toggleTimerWidgetVisibility();
      
      expect(listener).toHaveBeenCalled();
      
      unsubscribe();
      
      // 再次触发状态变化
      appStore.toggleTimerWidgetVisibility();
      
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it('应该支持多个监听器', () => {
      const listener1 = jest.fn();
      const listener2 = jest.fn();
      
      appStore.subscribe(listener1);
      appStore.subscribe(listener2);
      
      appStore.toggleTimerWidgetVisibility();
      
      expect(listener1).toHaveBeenCalled();
      expect(listener2).toHaveBeenCalled();
    });
  });

  describe('计时器管理', () => {
    it('应该添加新计时器', async () => {
      const timerData = {
        taskId: 'task-1',
        startTime: Date.now(),
        elapsedSeconds: 0,
        status: 'running'
      };
      
      await appStore.addTimer(timerData);
      
      const state = appStore.getState();
      expect(state.timers).toHaveLength(1);
      expect(state.timers[0]).toMatchObject(timerData);
      expect(state.timers[0].id).toBeDefined();
      expect(mockPlugin.timerStateService.saveStateToFile).toHaveBeenCalled();
    });

    it('应该更新计时器', async () => {
      // 先添加一个计时器
      const timerData = {
        taskId: 'task-1',
        startTime: Date.now(),
        elapsedSeconds: 0,
        status: 'running'
      };
      
      await appStore.addTimer(timerData);
      
      const state = appStore.getState();
      const timerId = state.timers[0].id;
      
      // 更新计时器
      const updatedTimer = {
        ...state.timers[0],
        elapsedSeconds: 30,
        status: 'paused'
      };
      
      await appStore.updateTimer(updatedTimer);
      
      const finalState = appStore.getState();
      expect(finalState.timers[0].elapsedSeconds).toBe(30);
      expect(finalState.timers[0].status).toBe('paused');
    });

    it('应该移除计时器', async () => {
      const timerData = {
        taskId: 'task-1',
        startTime: Date.now(),
        elapsedSeconds: 0,
        status: 'running'
      };
      
      await appStore.addTimer(timerData);
      
      const state = appStore.getState();
      const timerId = state.timers[0].id;
      
      await appStore.removeTimer(timerId);
      
      const finalState = appStore.getState();
      expect(finalState.timers).toHaveLength(0);
    });

    it('应该正确设置活动计时器', async () => {
      const timer1 = {
        taskId: 'task-1',
        startTime: Date.now(),
        elapsedSeconds: 0,
        status: 'running'
      };
      
      const timer2 = {
        taskId: 'task-2',
        startTime: Date.now(),
        elapsedSeconds: 0,
        status: 'paused'
      };
      
      await appStore.addTimer(timer1);
      await appStore.addTimer(timer2);
      
      const state = appStore.getState();
      expect(state.activeTimer).toBe(state.timers[0]); // 第一个运行中的计时器应该是活动的
    });

    it('应该设置初始计时器', () => {
      const initialTimers = [
        {
          id: 'timer-1',
          taskId: 'task-1',
          startTime: Date.now(),
          elapsedSeconds: 60,
          status: 'paused'
        }
      ];
      
      appStore.setInitialTimers(initialTimers);
      
      const state = appStore.getState();
      expect(state.timers).toEqual(initialTimers);
    });
  });

  describe('悬浮计时器可见性', () => {
    it('应该切换悬浮计时器可见性', () => {
      const initialState = appStore.getState();
      const initialVisibility = initialState.isTimerWidgetVisible;
      
      appStore.toggleTimerWidgetVisibility();
      
      const newState = appStore.getState();
      expect(newState.isTimerWidgetVisible).toBe(!initialVisibility);
    });

    it('应该更新悬浮计时器设置并保存', async () => {
      await appStore.updateFloatingTimerEnabled(false);
      
      const state = appStore.getState();
      expect(state.settings.floatingTimerEnabled).toBe(false);
      expect(state.isTimerWidgetVisible).toBe(false);
      expect(mockPlugin.saveData).toHaveBeenCalled();
    });

    it('应该在启用悬浮计时器时同步可见性', async () => {
      // 初始状态为禁用
      await appStore.updateFloatingTimerEnabled(false);
      expect(appStore.getState().isTimerWidgetVisible).toBe(false);
      
      // 启用悬浮计时器
      await appStore.updateFloatingTimerEnabled(true);
      
      const state = appStore.getState();
      expect(state.settings.floatingTimerEnabled).toBe(true);
      expect(state.isTimerWidgetVisible).toBe(true);
    });
  });

  describe('数据源管理', () => {
    it('应该添加数据源', async () => {
      await appStore.addDataSource('测试数据源');
      
      const state = appStore.getState();
      expect(state.settings.dataSources).toHaveLength(1);
      expect(state.settings.dataSources[0]).toMatchObject({
        name: '测试数据源',
        filters: [],
        sort: []
      });
      expect(state.settings.dataSources[0].id).toBeDefined();
      expect(mockPlugin.saveData).toHaveBeenCalled();
    });

    it('应该更新数据源', async () => {
      await appStore.addDataSource('原始名称');
      
      const state = appStore.getState();
      const dataSourceId = state.settings.dataSources[0].id;
      
      await appStore.updateDataSource(dataSourceId, { name: '新名称' });
      
      const finalState = appStore.getState();
      expect(finalState.settings.dataSources[0].name).toBe('新名称');
    });

    it('应该删除数据源', async () => {
      await appStore.addDataSource('测试数据源');
      await appStore.addViewInstance('测试视图');
      
      const state = appStore.getState();
      const dataSourceId = state.settings.dataSources[0].id;
      const viewInstanceId = state.settings.viewInstances[0].id;
      
      // 设置视图的数据源
      await appStore.updateViewInstance(viewInstanceId, { dataSourceId });
      
      // 删除数据源
      await appStore.deleteDataSource(dataSourceId);
      
      const finalState = appStore.getState();
      expect(finalState.settings.dataSources).toHaveLength(0);
      // 关联的视图应该被重置
      expect(finalState.settings.viewInstances[0].dataSourceId).toBe('');
    });
  });

  describe('视图实例管理', () => {
    it('应该添加视图实例', async () => {
      await appStore.addViewInstance('测试视图');
      
      const state = appStore.getState();
      expect(state.settings.viewInstances).toHaveLength(1);
      expect(state.settings.viewInstances[0]).toMatchObject({
        title: '测试视图',
        viewType: 'BlockView',
        dataSourceId: '',
        collapsed: true
      });
      expect(state.settings.viewInstances[0].id).toBeDefined();
    });

    it('应该更新视图实例', async () => {
      await appStore.addViewInstance('原始标题');
      
      const state = appStore.getState();
      const viewInstanceId = state.settings.viewInstances[0].id;
      
      await appStore.updateViewInstance(viewInstanceId, { title: '新标题' });
      
      const finalState = appStore.getState();
      expect(finalState.settings.viewInstances[0].title).toBe('新标题');
    });

    it('应该删除视图实例', async () => {
      await appStore.addViewInstance('测试视图');
      await appStore.addLayout('测试布局');
      
      const state = appStore.getState();
      const viewInstanceId = state.settings.viewInstances[0].id;
      const layoutId = state.settings.layouts[0].id;
      
      // 将视图添加到布局
      await appStore.updateLayout(layoutId, { viewInstanceIds: [viewInstanceId] });
      
      // 删除视图
      await appStore.deleteViewInstance(viewInstanceId);
      
      const finalState = appStore.getState();
      expect(finalState.settings.viewInstances).toHaveLength(0);
      // 布局中的视图ID应该被移除
      expect(finalState.settings.layouts[0].viewInstanceIds).toHaveLength(0);
    });
  });

  describe('布局管理', () => {
    it('应该添加布局', async () => {
      await appStore.addLayout('测试布局');
      
      const state = appStore.getState();
      expect(state.settings.layouts).toHaveLength(1);
      expect(state.settings.layouts[0]).toMatchObject({
        name: '测试布局',
        viewInstanceIds: [],
        displayMode: 'list',
        initialView: '月',
        initialDateFollowsNow: true
      });
      expect(state.settings.layouts[0].id).toBeDefined();
    });

    it('应该更新布局', async () => {
      await appStore.addLayout('原始名称');
      
      const state = appStore.getState();
      const layoutId = state.settings.layouts[0].id;
      
      await appStore.updateLayout(layoutId, { name: '新名称' });
      
      const finalState = appStore.getState();
      expect(finalState.settings.layouts[0].name).toBe('新名称');
    });

    it('应该删除布局', async () => {
      await appStore.addLayout('测试布局');
      
      const state = appStore.getState();
      const layoutId = state.settings.layouts[0].id;
      
      await appStore.deleteLayout(layoutId);
      
      const finalState = appStore.getState();
      expect(finalState.settings.layouts).toHaveLength(0);
    });
  });

  describe('分组管理', () => {
    it('应该添加分组', async () => {
      await appStore.addGroup('测试分组', null, 'dataSource');
      
      const state = appStore.getState();
      expect(state.settings.groups).toHaveLength(1);
      expect(state.settings.groups[0]).toMatchObject({
        name: '测试分组',
        parentId: null,
        type: 'dataSource'
      });
      expect(state.settings.groups[0].id).toBeDefined();
    });

    it('应该更新分组', async () => {
      await appStore.addGroup('原始名称', null, 'dataSource');
      
      const state = appStore.getState();
      const groupId = state.settings.groups[0].id;
      
      await appStore.updateGroup(groupId, { name: '新名称' });
      
      const finalState = appStore.getState();
      expect(finalState.settings.groups[0].name).toBe('新名称');
    });

    it('应该删除分组并重新分配子项', async () => {
      // 创建父分组和子分组
      await appStore.addGroup('父分组', null, 'dataSource');
      await appStore.addGroup('子分组', null, 'dataSource');
      
      const state = appStore.getState();
      const parentGroupId = state.settings.groups[0].id;
      const childGroupId = state.settings.groups[1].id;
      
      // 设置子分组的父级
      await appStore.updateGroup(childGroupId, { parentId: parentGroupId });
      
      // 删除父分组
      await appStore.deleteGroup(parentGroupId);
      
      const finalState = appStore.getState();
      expect(finalState.settings.groups).toHaveLength(1);
      // 子分组应该被重新分配到父分组的父级（这里是null）
      expect(finalState.settings.groups[0].parentId).toBeNull();
    });
  });

  describe('错误处理', () => {
    it('应该处理插件未设置的情况', async () => {
      const storeWithoutPlugin = new AppStore(mockSettings);
      // 不调用 setPlugin
      
      // 尝试更新设置应该不抛出错误，但会在控制台输出错误
      await expect(storeWithoutPlugin._updateSettingsAndPersist(() => {}))
        .resolves.not.toThrow();
    });

    it('应该处理保存失败的情况', async () => {
      mockPlugin.saveData.mockRejectedValue(new Error('保存失败'));
      
      // 应该不抛出错误（错误应该被捕获并处理）
      await expect(appStore.updateFloatingTimerEnabled(false))
        .resolves.toBeUndefined();
    });
  });

  describe('性能测试', () => {
    it('应该能处理大量计时器', async () => {
      const startTime = performance.now();
      
      // 添加100个计时器
      for (let i = 0; i < 100; i++) {
        await appStore.addTimer({
          taskId: `task-${i}`,
          startTime: Date.now(),
          elapsedSeconds: 0,
          status: 'running'
        });
      }
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      expect(duration).toBeLessThan(1000); // 应该在1秒内完成
      expect(appStore.getState().timers.length).toBe(100);
    });

    it('应该能处理频繁的状态更新', () => {
      const listener = jest.fn();
      appStore.subscribe(listener);
      
      const startTime = performance.now();
      
      // 快速切换100次
      for (let i = 0; i < 100; i++) {
        appStore.toggleTimerWidgetVisibility();
      }
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      expect(duration).toBeLessThan(100); // 应该在100ms内完成
      expect(listener).toHaveBeenCalledTimes(100);
    });
  });
});
