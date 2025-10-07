# Timer (计时器) 功能模块

## 概述

Timer 模块为 Think OS 插件提供任务计时功能，允许用户跟踪任务执行时间。该模块主要包含浮动计时器组件，支持实时计时、任务切换和时间统计。

## 目录结构

```
src/features/timer/
├── index.ts                   # 模块导出
├── FloatingTimerWidget.ts     # 浮动计时器小部件
└── ui/                        # UI 组件
    ├── index.ts              # UI 导出
    ├── TimerView.tsx         # 计时器视图组件
    └── TimerRow.tsx          # 计时器行组件
```

## 核心组件

### 1. FloatingTimerWidget (浮动计时器)

悬浮的计时器窗口，在页面上显示计时器控制界面。

**实现：**
```typescript
export class FloatingTimerWidget {
    private plugin: ThinkPlugin;
    private containerEl: HTMLElement | null = null;

    constructor(plugin: ThinkPlugin) {
        this.plugin = plugin;
    }

    public load(): void {
        // 创建容器并添加到 document.body
        this.containerEl = document.createElement('div');
        this.containerEl.id = 'think-plugin-floating-timer-container';
        document.body.appendChild(this.containerEl);
        this.render();
    }

    public unload(): void {
        // 清理组件和 DOM
    }

    private render(): void {
        // 渲染 TimerView 组件
    }
}
```

**特性：**
- 独立的悬浮窗口显示
- 与 AppStore 状态同步
- 支持显示/隐藏切换

### 2. TimerView (计时器视图)

Preact 组件，渲染计时器的主要 UI。

**组件属性：**
```typescript
interface TimerViewProps {
    app: App;                      // Obsidian App 实例
    actionService: ActionService;  // 用于处理用户操作
    timerService: TimerService;    // 计时器服务
    dataStore: DataStore;          // 数据存储服务
}
```

**功能特性：**
- 实时时间更新
- 任务状态显示
- 操作按钮（开始、暂停、停止、编辑）
- 任务列表展示
- 与 AppStore 的 isTimerWidgetVisible 状态同步

### 3. TimerRow (计时器行)

单个任务计时项的展示组件。

**功能：**
- 显示任务名称
- 显示计时状态
- 提供操作按钮
- 时间格式化显示

## 服务集成

Timer 模块通过 ServiceManager 进行懒加载：

### 初始化流程

```typescript
// 在 ServiceManager 中
async loadTimerServices(): Promise<void> {
    if (this.services.timerService) return;
    
    console.time('[ThinkPlugin] 计时器服务加载');
    
    // 解析服务
    this.services.timerService = container.resolve(TimerService);
    this.services.timerWidget = new FloatingTimerWidget(this.plugin);
    
    // 注册命令
    this.plugin.addCommand({
        id: 'toggle-think-floating-timer',
        name: '切换悬浮计时器显隐',
        callback: () => {
            this.services.appStore!.toggleTimerWidgetVisibility();
        },
    });

    // 加载计时器状态
    this.services.timerStateService!.loadStateFromFile().then(timers => {
        this.services.appStore!.setInitialTimers(timers);
    });
    
    // 加载小部件
    this.services.timerWidget.load();
    
    console.timeEnd('[ThinkPlugin] 计时器服务加载');
}
```

### 相关服务

1. **TimerService** (`src/core/services/TimerService.ts`)
   - 管理计时器逻辑
   - 处理计时操作

2. **TimerStateService** (`src/core/services/TimerStateService.ts`)
   - 持久化计时器状态
   - 从文件加载/保存状态

## 使用示例

### 切换计时器显示/隐藏

```typescript
// 通过命令切换
app.commands.executeCommandById('toggle-think-floating-timer');

// 通过 AppStore 切换
appStore.toggleTimerWidgetVisibility();

// 永久启用/禁用（保存到设置）
await appStore.updateFloatingTimerEnabled(true);
```

### 访问计时器状态

```typescript
// 使用 useStore Hook
import { useStore } from '@state/AppStore';

const MyComponent = () => {
    const timers = useStore(state => state.timers);
    const activeTimer = useStore(state => state.activeTimer);
    const isVisible = useStore(state => state.isTimerWidgetVisible);
    
    return (
        <div>
            {isVisible && <TimerDisplay timer={activeTimer} />}
        </div>
    );
};
```

## 状态管理

计时器状态通过 AppStore 管理：

```typescript
// AppState 中的计时器相关状态
interface AppState {
    timers: TimerState[];           // 所有计时器
    activeTimer?: TimerState;       // 当前活动的计时器（派生状态）
    isTimerWidgetVisible: boolean;  // 悬浮窗口可见性
}

// TimerState 结构
interface TimerState {
    id: string;
    taskId: string;
    startTime: number;
    elapsedSeconds: number;
    status: 'running' | 'paused';
}

// 状态更新方法
class AppStore {
    // 初始化计时器列表
    setInitialTimers(initialTimers: TimerState[])
    
    // 添加新计时器
    addTimer(timer: Omit<TimerState, 'id'>)
    
    // 更新计时器
    updateTimer(updatedTimer: TimerState)
    
    // 删除计时器
    removeTimer(timerId: string)
    
    // 切换悬浮窗口可见性（临时状态）
    toggleTimerWidgetVisibility()
    
    // 更新悬浮计时器启用设置（持久化）
    updateFloatingTimerEnabled(enabled: boolean)
}
```

## 持久化

计时器状态通过 TimerStateService 持久化到文件：

```typescript
// TimerStateService 负责状态的持久化
class TimerStateService {
    async saveStateToFile(timers: TimerState[]): Promise<void>
    async loadStateFromFile(): Promise<TimerState[]>
}

// 自动持久化流程
private async _updateTimersAndPersist(updater: (draft: TimerState[]) => TimerState[]) {
    const newTimers = updater(JSON.parse(JSON.stringify(this._state.timers)));
    this._state.timers = newTimers;
    this._notify();
    
    // 自动保存到文件
    if (this._plugin?.timerStateService) {
        await this._plugin.timerStateService.saveStateToFile(newTimers);
    }
}
```

## 功能特性

### 1. 实时计时
- 精确到秒的计时
- 后台持续计时
- 断点恢复功能（通过 TimerStateService）

### 2. 任务管理
- 支持多个计时器并行
- 任务状态切换（运行/暂停）
- 自动追踪活动计时器

### 3. 数据持久化
- 自动保存计时器状态到文件
- 插件重启后恢复状态
- 与设置同步

### 4. 界面交互
- 悬浮计时器窗口
- 命令面板快捷操作
- 与其他模块集成

## 配置

计时器相关配置存储在 ThinkSettings 中：

```typescript
interface ThinkSettings {
    floatingTimerEnabled: boolean;  // 是否启用悬浮计时器
    // ... 其他设置
}
```

可见性状态管理：
- `floatingTimerEnabled` - 持久化的设置，决定功能是否启用
- `isTimerWidgetVisible` - 临时状态，控制当前是否显示

## 性能优化

1. **懒加载**：计时器服务在需要时才加载
2. **防抖更新**：UI 更新优化，避免频繁渲染
3. **状态派生**：activeTimer 是派生状态，自动计算
4. **批量持久化**：通过 TimerStateService 批量保存状态

## 架构特点

1. **服务分离**：TimerService 处理逻辑，TimerStateService 处理持久化
2. **状态集中**：所有状态通过 AppStore 管理
3. **懒加载优化**：通过 ServiceManager 按需加载
4. **组件解耦**：UI 组件通过 props 接收服务，易于测试

## 常见问题

### Q: 为什么没有独立的 TimerWidget.ts 文件？

A: 当前实现只有 FloatingTimerWidget，它提供了完整的计时器功能。状态栏集成可以在未来版本中添加。

### Q: 计时器状态如何持久化？

A: TimerStateService 负责将计时器状态保存到文件，插件重启时会自动恢复。

### Q: 如何控制悬浮计时器的显示？

A: 有两种方式：
1. 使用命令 `toggle-think-floating-timer` 临时切换
2. 在设置中启用/禁用 `floatingTimerEnabled` 永久更改

### Q: 计时器服务什么时候加载？

A: 计时器服务在插件启动的第3阶段立即加载，优先级高于其他UI特性，确保用户体验。

## 相关文档

- [ActionService API](../../API.md#actionservice)
- [状态管理](../state-management.md)
- [插件架构](../../ARCHITECTURE.md)

---

*最后更新: 2025-10-07*
