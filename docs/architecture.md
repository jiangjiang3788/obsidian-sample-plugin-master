# 架构概览

## 一、分层架构图

```mermaid
graph TD
    Entry[插件入口 (main.ts)] --> ServiceMgr[服务管理器 (ServiceManager)]
    
    subgraph Core [核心层]
        ServiceMgr --> DI[DI 容器 (tsyringe)]
        DI --> AppStore[状态存储 (AppStore)]
        DI --> DataStore[数据服务 (DataStore)]
        DI --> TimerService[计时器服务]
        DI --> Renderer[渲染服务 (RendererService)]
    end

    subgraph Glue [胶水层]
        ServiceMgr --> FeatureLoader[特性加载器 (FeatureLoader)]
    end
    
    subgraph Features [特性/UI层]
        FeatureLoader --> Dashboard[仪表盘 (Dashboard)]
        FeatureLoader --> Settings[设置页]
        FeatureLoader --> QuickInput[快速输入]
        Renderer -.-> Dashboard
        Renderer -.-> Settings
    end
    
    subgraph Platform [平台层]
        DataStore --> Obsidian[Obsidian API]
        TimerService --> Obsidian
    end
```

## 二、主执行流程

1. **启动 (Bootstrap)**
   - `ThinkPlugin.onload()`: 插件入口
   - `setupCoreContainer()`: 注册 DI 容器依赖
   - `ServiceManager.bootstrap()`: 启动主流程

2. **初始化 (Initialization)**
   - `initializeCore()`: 初始化 AppStore, TimerState
   - `loadTimerServices()`: 启动计时器逻辑
   - `loadDataServices()`: 启动数据索引与扫描

3. **渲染 (Rendering)**
   - `loadUIFeatures()`: 委托 `FeatureLoader` 加载 UI 模块
   - `FeatureLoader`: 协调 Dashboard, Settings, QuickInput 的初始化与挂载
   - `RendererService`: 提供底层挂载能力

## 三、关键模块说明

| 模块 | 角色 | 主要文件 | 职责 |
| :--- | :--- | :--- | :--- |
| **插件入口** | 入口 | `src/main.ts` | 负责生命周期管理，配置 DI 容器，启动 ServiceManager |
| **服务管理器** | 应用层 | `src/app/ServiceManager.ts` | 协调各服务的启动顺序，管理全局生命周期 |
| **FeatureLoader** | 胶水层 | `src/app/FeatureLoader.ts` | 专门负责 UI 特性（Dashboard, Settings 等）的加载、挂载与依赖组装 |
| **AppStore** | 状态 | `src/app/AppStore.ts` | 集中管理应用状态（设置、UI状态），不含复杂业务逻辑 |
| **TimerService** | 业务 | `src/features/timer/TimerService.ts` | 计时器核心逻辑，处理开始/暂停/停止等副作用 |
| **DataStore** | 业务+IO | `src/core/services/DataStore.ts` | 负责 Vault 文件扫描、索引建立、数据读写 |
| **RendererService** | 业务+UI | `src/features/settings/RendererService.ts` | 负责将配置转换为实际的 UI 组件，桥接服务与视图 |

## 四、服务访问与依赖注入规范

为了减少“从哪里获取服务”的困惑，我们遵循以下明确的访问约定：

### 1. 核心层 (Core & Services)
**方式**：依赖注入 (Dependency Injection)
**适用范围**：`src/core/services/*`, `src/features/*Service.ts`
**规则**：
- 使用 `tsyringe` 的 `@inject` 装饰器在构造函数中声明依赖。
- **禁止**使用全局 `storeRegistry`。

```typescript
@singleton()
export class MyService {
  constructor(
    @inject(AppStore) private appStore: AppStore,
    @inject(DataStore) private dataStore: DataStore
  ) {}
}
```

### 2. UI 层 (Features & Views)
**方式**：参数注入 (Props Injection)
**适用范围**：`src/features/views/*`, React/Preact 组件
**规则**：
- 服务和数据应作为 `props` 从父组件或渲染器传入。
- 组件内部**不应**直接访问 DI 容器或全局变量。
- `RendererService` 等负责将服务从 DI 容器桥接到 UI 组件树。

```typescript
// 正确
const MyView = ({ dataStore, timerService }) => { ... }

// 错误
const MyView = () => {
  const store = container.resolve(DataStore); // 不要这样做
}
```

### 3. 入口与胶水层 (Entry & Glue)
**方式**：全局注册表 (Global Registry) / 容器直接访问
**适用范围**：`main.ts`, `ServiceManager.ts`, `FeatureLoader.ts`, 调试控制台
**规则**：
- `storeRegistry` 仅用于向后兼容或在无法使用 DI 的极少数边缘情况（如 Obsidian 的某些回调中）。
- 逐步减少对 `storeRegistry` 的依赖。
