# 依赖注入系统 (TSyringe)

## 概述

Think OS 插件使用 TSyringe 作为依赖注入（DI）容器，但采用了简化的实现方式。主要通过 ServiceManager 类管理服务生命周期，而不是完全依赖装饰器模式。

## 实际架构

### ServiceManager 模式

项目采用 ServiceManager 作为服务管理的核心，而非纯粹的 DI 容器：

```typescript
class ServiceManager {
    private plugin: ThinkPlugin;
    private services: Partial<{
        appStore: AppStore;
        dataStore: DataStore;
        rendererService: RendererService;
        actionService: ActionService;
        timerService: TimerService;
        timerStateService: TimerStateService;
        inputService: InputService;
        timerWidget: FloatingTimerWidget;
        taskService: TaskService;
    }> = {};
    
    // 分阶段加载服务
    async initializeCore(): Promise<void>
    async loadTimerServices(): Promise<void>
    async loadDataServices(): Promise<void>
    async loadUIFeatures(): Promise<void>
}
```

## TSyringe 的实际使用

### 1. AppStore 单例注册

项目中只有 AppStore 使用了完整的 TSyringe 装饰器模式：

```typescript
import { singleton, inject } from 'tsyringe';

@singleton()
export class AppStore {
    public constructor(
        @inject(SETTINGS_TOKEN) initialSettings: ThinkSettings
    ) {
        this._state = {
            settings: initialSettings,
            timers: [],
            isTimerWidgetVisible: initialSettings.floatingTimerEnabled,
        };
    }
}

// 注册单例
container.registerSingleton(AppStore);
```

### 2. 令牌注册

实际注册的令牌很少：

```typescript
// 在 main.ts 中
container.register(AppToken, { useValue: this.app });
container.register(SETTINGS_TOKEN, { useValue: settings });
```

### 3. 服务解析

其他服务通过 container.resolve() 直接解析，不使用装饰器：

```typescript
// 在 ServiceManager 中
this.services.appStore = container.resolve(AppStore);
this.services.dataStore = container.resolve(DataStore);
this.services.rendererService = container.resolve(RendererService);
this.services.actionService = container.resolve(ActionService);
this.services.timerService = container.resolve(TimerService);
```

## 基础概念

### 容器

TSyringe 提供全局容器用于管理依赖：

```typescript
import { container } from 'tsyringe';

// 容器是全局单例
// 所有依赖注册和解析都通过它进行
```

### 装饰器（部分使用）

虽然 TSyringe 支持多种装饰器，但项目中主要使用：

- `@singleton()` - 标记类为单例（仅用于 AppStore）
- `@inject()` - 注入依赖（仅在 AppStore 构造函数中使用）

```typescript
// 实际使用示例
@singleton()
export class AppStore {
    constructor(
        @inject(SETTINGS_TOKEN) settings: ThinkSettings
    ) {
        // ...
    }
}
```

## 服务生命周期管理

### 懒加载策略

ServiceManager 实现了分阶段的懒加载：

```typescript
export default class ThinkPlugin extends Plugin {
    async onload(): Promise<void> {
        // 步骤 1: 基础初始化
        const settings = await this.loadSettings();
        
        // 步骤 2: 初始化服务管理器
        this.serviceManager = new ServiceManager(this);
        await this.serviceManager.initializeCore();
        
        // 步骤 3: 立即加载计时器服务（用户体验关键）
        await this.serviceManager.loadTimerServices();
        
        // 步骤 4: 延迟加载其他服务
        this.loadRemainingServicesAsync();
    }
}
```

### 服务初始化顺序

1. **核心服务** (initializeCore)
   - AppStore
   - TimerStateService

2. **计时器服务** (loadTimerServices)
   - TimerService
   - FloatingTimerWidget
   - 注册相关命令

3. **数据服务** (loadDataServices)
   - DataStore
   - RendererService
   - ActionService
   - InputService
   - TaskService

4. **UI特性** (loadUIFeatures)
   - Dashboard
   - QuickInput
   - Settings

## 服务注册表

项目使用 storeRegistry 进行全局服务访问：

```typescript
// src/state/storeRegistry.ts
import { AppStore } from './AppStore';
import type { DataStore } from '@core/services/dataStore';
import type { TimerService } from '@core/services/TimerService';
import type { InputService } from '@core/services/inputService';

export let appStore: AppStore;
export let dataStore: DataStore;
export let timerService: TimerService;
export let inputService: InputService;

export function registerStore(store: AppStore) {
    appStore = store;
}

export function registerDataStore(store: DataStore) {
    dataStore = store;
}

export function registerTimerService(service: TimerService) {
    timerService = service;
}

export function registerInputService(service: InputService) {
    inputService = service;
}
```

## 依赖注入的优势（在当前实现中）

1. **解耦合**：服务之间通过接口依赖，不直接创建实例
2. **可测试性**：可以轻松替换模拟实现进行测试
3. **生命周期管理**：通过 ServiceManager 统一管理服务生命周期
4. **懒加载**：按需加载服务，优化启动性能

## 实际使用示例

### 在组件中使用服务

```typescript
// 直接从注册表导入
import { appStore, dataStore } from '@state/storeRegistry';

export const MyComponent = () => {
    const handleAction = async () => {
        const data = await dataStore.getAllItems();
        appStore.updateSettings({ /* ... */ });
    };
    
    return <div>...</div>;
};
```

### 在服务中注入依赖

```typescript
// 通过 ServiceManager 传递依赖
export class VaultWatcher {
    constructor(
        private plugin: Plugin,
        private dataStore: DataStore
    ) {
        // 手动接收依赖
    }
}

// 在 Dashboard 初始化时
new VaultWatcher(plugin, dataStore);
```

## 测试支持

虽然没有使用完整的 DI 模式，但当前架构仍支持测试：

```typescript
// 测试时可以创建独立的容器
describe('AppStore', () => {
    let testContainer: DependencyContainer;
    
    beforeEach(() => {
        testContainer = container.createChildContainer();
        testContainer.register(SETTINGS_TOKEN, {
            useValue: mockSettings
        });
    });
    
    it('should initialize with settings', () => {
        const store = testContainer.resolve(AppStore);
        expect(store.getSettings()).toEqual(mockSettings);
    });
});
```

## 与设计文档的差异

本文档反映了实际实现，与初始设计的主要差异：

1. **简化的装饰器使用**：只有 AppStore 使用装饰器
2. **ServiceManager 模式**：手动管理服务而非自动注入
3. **有限的令牌注册**：只注册必要的令牌
4. **混合方式**：结合了 DI 容器和手动依赖管理

## 为什么采用这种混合方式？

1. **性能优化**：精确控制服务加载时机
2. **简化复杂度**：避免过度使用装饰器带来的复杂性
3. **渐进式采用**：可以逐步迁移到完整的 DI 模式
4. **实用主义**：满足当前需求，不过度设计

## 未来改进方向

如果项目规模扩大，可以考虑：

1. 更多服务使用 `@injectable()` 装饰器
2. 实现接口注入而非具体类
3. 使用作用域控制生命周期
4. 添加更多的自动化依赖解析

## 最佳实践（基于当前实现）

1. **保持 ServiceManager 的职责单一**：只负责服务生命周期
2. **明确服务依赖**：在构造函数中声明所有依赖
3. **使用类型安全**：利用 TypeScript 确保依赖类型正确
4. **避免循环依赖**：通过良好的架构设计避免
5. **合理的服务粒度**：不要创建过多细粒度的服务

## 相关文档

- [插件架构](../ARCHITECTURE.md)
- [ServiceManager 实现](../ARCHITECTURE.md#service-manager)
- [TSyringe 官方文档](https://github.com/microsoft/tsyringe)

---

*最后更新: 2025-10-07*
