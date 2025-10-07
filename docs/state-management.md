# 状态管理系统

## 概述

Think OS 插件采用简化的发布-订阅模式进行状态管理。核心是 AppStore 类，它提供了状态存储、更新和订阅功能。

## 架构设计

```
┌─────────────────────────────────────┐
│           UI Components             │
└────────────┬───────────┬────────────┘
             │           │
             ▼           ▼
        ┌────────────────────┐
        │     AppStore       │
        │  - state: State    │
        │  - listeners       │
        └────────────────────┘
                 │
                 ▼
        ┌────────────────────┐
        │   Persistence      │
        │  (data.json)       │
        └────────────────────┘
```

## 核心组件

### AppStore

全局状态管理器，负责状态的存储、更新和通知。

```typescript
@singleton()
export class AppStore {
    private _state: AppState;
    private _listeners: Set<() => void> = new Set();
    
    // 获取当前状态
    getState(): AppState;
    
    // 获取设置
    getSettings(): ThinkSettings;
    
    // 订阅状态变化
    subscribe(listener: () => void): () => void;
    
    // 更新并持久化设置
    _updateSettingsAndPersist(updater: (draft: ThinkSettings) => void): Promise<void>;
    
    // 更新临时状态（不持久化）
    _updateEphemeralState(updater: (draft: AppState) => void): void;
}
```

## 状态结构

### 实际的 AppState 定义

```typescript
interface AppState {
    // 插件设置（持久化）
    settings: ThinkSettings;
    
    // 计时器列表（持久化到单独文件）
    timers: TimerState[];
    
    // 当前活动的计时器（派生状态）
    activeTimer?: TimerState;
    
    // 悬浮计时器可见性（临时状态）
    isTimerWidgetVisible: boolean;
}
```

### TimerState 结构

```typescript
interface TimerState {
    id: string;
    taskId: string;
    startTime: number;
    elapsedSeconds: number;
    status: 'running' | 'paused';
}
```

### ThinkSettings 结构

```typescript
interface ThinkSettings {
    // 数据源配置
    dataSources: DataSource[];
    
    // 视图实例配置
    viewInstances: ViewInstance[];
    
    // 布局配置
    layouts: Layout[];
    
    // 输入设置
    inputSettings: InputSettings;
    
    // 分组配置
    groups: Group[];
    
    // 悬浮计时器启用状态
    floatingTimerEnabled: boolean;
}
```

## 使用指南

### 基础使用

#### 1. 获取状态

```typescript
// 获取完整状态
const state = appStore.getState();

// 获取设置
const settings = appStore.getSettings();

// 获取特定部分
const timers = appStore.getState().timers;
const isTimerVisible = appStore.getState().isTimerWidgetVisible;
```

#### 2. 更新状态

AppStore 提供了两种更新方法：

```typescript
// 更新设置（会自动持久化）
await appStore._updateSettingsAndPersist(draft => {
    draft.floatingTimerEnabled = true;
    draft.dataSources.push(newDataSource);
});

// 更新临时状态（不持久化）
appStore._updateEphemeralState(draft => {
    draft.isTimerWidgetVisible = !draft.isTimerWidgetVisible;
});
```

#### 3. 订阅变化

```typescript
// 订阅所有状态变化
const unsubscribe = appStore.subscribe(() => {
    const newState = appStore.getState();
    console.log('状态已更新:', newState);
});

// 取消订阅
unsubscribe();
```

### 具体功能的状态管理

#### 计时器状态管理

```typescript
// 添加计时器
await appStore.addTimer({
    taskId: 'task-123',
    startTime: Date.now(),
    elapsedSeconds: 0,
    status: 'running'
});

// 更新计时器
await appStore.updateTimer({
    id: 'timer-456',
    taskId: 'task-123',
    startTime: Date.now(),
    elapsedSeconds: 120,
    status: 'paused'
});

// 删除计时器
await appStore.removeTimer('timer-456');

// 切换悬浮窗口可见性（临时）
appStore.toggleTimerWidgetVisibility();

// 更新悬浮计时器设置（持久化）
await appStore.updateFloatingTimerEnabled(true);
```

#### 数据源管理

```typescript
// 添加数据源
await appStore.addDataSource('新数据源', parentId);

// 更新数据源
await appStore.updateDataSource('ds-123', {
    name: '更新的名称',
    filters: newFilters
});

// 删除数据源
await appStore.deleteDataSource('ds-123');

// 移动数据源顺序
await appStore.moveDataSource('ds-123', 'up');

// 复制数据源
await appStore.duplicateDataSource('ds-123');
```

#### 视图实例管理

```typescript
// 添加视图实例
await appStore.addViewInstance('新视图', parentId);

// 更新视图实例
await appStore.updateViewInstance('view-123', {
    title: '更新的标题',
    viewType: 'TableView',
    dataSourceId: 'ds-456'
});

// 删除视图实例
await appStore.deleteViewInstance('view-123');
```

## React/Preact 集成

### useStore Hook

项目提供了 `useStore` Hook 用于组件中订阅状态：

```typescript
export function useStore<T>(selector: (state: AppState) => T): T {
    const [state, setState] = useState(() => selector(appStore.getState()));
    
    useEffect(() => {
        const unsubscribe = appStore.subscribe(() => {
            const newStateSlice = selector(appStore.getState());
            setState(newStateSlice);
        });
        return unsubscribe;
    }, [selector]);
    
    return state;
}
```

### 使用示例

```typescript
import { useStore } from '@state/AppStore';

const MyComponent = () => {
    // 订阅特定状态片段
    const timers = useStore(state => state.timers);
    const settings = useStore(state => state.settings);
    const isVisible = useStore(state => state.isTimerWidgetVisible);
    
    // 使用 AppStore 方法
    const handleAddTimer = async () => {
        await appStore.addTimer({
            taskId: 'new-task',
            startTime: Date.now(),
            elapsedSeconds: 0,
            status: 'running'
        });
    };
    
    return (
        <div>
            <p>计时器数量: {timers.length}</p>
            <p>悬浮窗口: {isVisible ? '显示' : '隐藏'}</p>
            <button onClick={handleAddTimer}>添加计时器</button>
            <button onClick={() => appStore.toggleTimerWidgetVisibility()}>
                切换显示
            </button>
        </div>
    );
};
```

## 持久化策略

### 设置持久化

设置通过插件的 `saveData` API 自动保存：

```typescript
public _updateSettingsAndPersist = async (updater: (draft: ThinkSettings) => void) => {
    const newSettings = JSON.parse(JSON.stringify(this._state.settings));
    updater(newSettings);
    this._state.settings = newSettings;
    
    try {
        await this._plugin.saveData(this._state.settings);
    } catch (error) {
        console.error("AppStore: 保存设置失败", error);
    }
    
    this._notify();
}
```

### 计时器状态持久化

计时器状态通过 TimerStateService 单独持久化：

```typescript
private async _updateTimersAndPersist(updater: (draft: TimerState[]) => TimerState[]) {
    const newTimers = updater(JSON.parse(JSON.stringify(this._state.timers)));
    this._state.timers = newTimers;
    this._notify();
    
    if (this._plugin?.timerStateService) {
        await this._plugin.timerStateService.saveStateToFile(newTimers);
    }
}
```

## 派生状态

某些状态是自动计算的派生状态：

```typescript
private _deriveState() {
    // activeTimer 是根据 timers 自动计算的
    this._state.activeTimer = this._state.timers.find(t => t.status === 'running');
}
```

## 状态初始化

状态在插件启动时初始化：

```typescript
// 1. 加载设置
const settings = await this.loadSettings();

// 2. 注册到容器
container.register(SETTINGS_TOKEN, { useValue: settings });

// 3. 创建 AppStore（自动使用注入的设置）
this.services.appStore = container.resolve(AppStore);

// 4. 加载计时器状态
const timers = await timerStateService.loadStateFromFile();
appStore.setInitialTimers(timers);
```

## 性能优化

### 1. 批量更新

状态更新是同步的，但通知是批量的：

```typescript
private _notify() {
    this._deriveState();  // 先计算派生状态
    this._listeners.forEach(l => l());  // 然后通知所有监听器
}
```

### 2. 选择器优化

useStore Hook 使用 useCallback 缓存选择器，避免不必要的重新订阅：

```typescript
const memoizedSelector = useCallback(selector, []);
```

### 3. 对象比较

使用 `Object.is` 进行精确比较，避免不必要的组件更新：

```typescript
if (Object.is(currentStateSlice, newStateSlice)) {
    return currentStateSlice;  // 状态未变化，不触发更新
}
```

## 调试支持

### 状态日志

组件重新渲染时会输出日志：

```typescript
console.log("一个组件因其订阅的状态变更而计划重渲染。", {
    componentHint: memoizedSelector.toString().slice(0, 100)
});
```

### 安全回退

当 AppStore 未初始化时，提供安全的默认状态：

```typescript
if (!store) {
    const safeFallbackState: AppState = {
        settings: DEFAULT_SETTINGS,
        timers: [],
        activeTimer: undefined,
        isTimerWidgetVisible: true,
    };
    console.warn("useStore 在 AppStore 注册前被调用。返回安全的备用状态。");
    return selector(safeFallbackState);
}
```

## 最佳实践

1. **状态扁平化**：保持状态结构扁平，避免深层嵌套
2. **不可变更新**：始终创建新对象，不要直接修改状态
3. **选择器粒度**：使用细粒度的选择器，只订阅需要的状态片段
4. **区分持久化**：明确区分需要持久化的设置和临时的UI状态
5. **错误处理**：在持久化操作中添加错误处理，确保应用稳定性

## 与实际代码的差异说明

本文档反映了项目的实际实现，与早期设计文档的主要差异：

1. **简化的订阅机制**：使用 Set<() => void> 而非复杂的路径订阅
2. **明确的状态结构**：AppState 只包含实际使用的字段
3. **服务管理器集成**：通过 ServiceManager 而非纯 DI 容器管理
4. **分离的持久化**：设置和计时器状态分别持久化到不同位置

## 相关文档

- [插件架构](../ARCHITECTURE.md)
- [API 参考](../API.md#appstore)
- [测试指南](../TESTING.md)

---

*最后更新: 2025-10-07*
