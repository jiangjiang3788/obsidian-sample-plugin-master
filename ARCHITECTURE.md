# Think OS 架构设计文档

## 📐 系统架构概览

Think OS 是一个基于 Preact 的 Obsidian 插件，采用模块化、分层的架构设计，使用服务管理器模式实现懒加载和性能优化。

```
┌─────────────────────────────────────────────────────────┐
│                     Obsidian Platform                    │
└─────────────────────────────────────────────────────────┘
                              ↑
┌─────────────────────────────────────────────────────────┐
│                      Plugin Entry                        │
│                       (main.ts)                          │
└─────────────────────────────────────────────────────────┘
                              ↑
┌─────────────────────────────────────────────────────────┐
│                    Service Manager                       │
│              (懒加载和生命周期管理)                       │
└─────────────────────────────────────────────────────────┘
                              ↑
        ┌──────────────────────┴──────────────────────┐
        ↓                                              ↓
┌───────────────┐  ┌───────────────┐  ┌───────────────┐
│   Features    │  │     Core      │  │    State      │
│   - Dashboard │  │   - Services  │  │  - AppStore   │
│   - QuickInput│  │   - Domain    │  │  - Registry   │
│   - Timer     │  │   - Utils     │  │               │
│   - Settings  │  │               │  │               │
└───────────────┘  └───────────────┘  └───────────────┘
        ↑                  ↑                   ↑
        └──────────────────┴───────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────┐
│                    Shared Resources                      │
│              (Components, Utils, Types)                  │
└─────────────────────────────────────────────────────────┘
```

## 🏗️ 核心模块

### 1. Plugin Entry (`src/main.ts`)
插件的入口点，负责：
- 初始化 ServiceManager
- 分阶段加载服务（核心服务 → 计时器服务 → 数据服务 → UI特性）
- 管理插件生命周期
- 加载和保存插件配置

```typescript
export default class ThinkPlugin extends Plugin {
    private serviceManager!: ServiceManager;
    
    async onload() {
        // 步骤 1: 基础初始化
        const settings = await this.loadSettings();
        
        // 步骤 2: 初始化服务管理器
        this.serviceManager = new ServiceManager(this);
        await this.serviceManager.initializeCore();
        
        // 步骤 3: 立即加载计时器服务
        await this.serviceManager.loadTimerServices();
        
        // 步骤 4: 延迟加载其他服务
        this.loadRemainingServicesAsync();
    }
}
```

### 2. Service Manager
服务管理器负责服务的懒加载和生命周期管理：

```typescript
class ServiceManager {
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
    
    // 分阶段加载方法
    async initializeCore(): Promise<void>
    async loadTimerServices(): Promise<void>
    async loadDataServices(): Promise<void>
    async loadUIFeatures(): Promise<void>
}
```

### 3. Core Module (`src/core/`)

#### 3.1 Domain (`src/core/domain/`)
领域模型定义，主要包含 schema 定义：
- **ThinkSettings** - 插件设置
- **DataSource** - 数据源配置
- **ViewInstance** - 视图实例
- **Layout** - 布局配置
- **TimerState** - 计时器状态

#### 3.2 Services (`src/core/services/`)
核心业务服务：
- **DataStore** - 数据存储管理
- **ActionService** - 用户操作处理
- **RendererService** - 渲染服务
- **TimerService** - 计时器管理
- **TimerStateService** - 计时器状态持久化
- **InputService** - 输入处理
- **TaskService** - 任务管理
- **ThemeManager** - 主题管理

#### 3.3 Utils (`src/core/utils/`)
通用工具函数：
- **array** - 数组操作工具
- 其他工具函数

### 4. Features Module (`src/features/`)

每个功能模块都是独立的子系统：

#### 4.1 Dashboard (`src/features/dashboard/`)
仪表板功能，主要包含初始化逻辑：
```typescript
features/dashboard/
├── index.ts            # 模块初始化
├── hooks/             # 自定义 Hooks
├── styles/           # 样式文件
├── ui/              # UI 组件
└── views/           # 视图组件
```

实际的核心组件位于 `features/logic/`：
- **VaultWatcher** - 监控 Vault 变化
- **CodeblockEmbedder** - 代码块嵌入处理

#### 4.2 Quick Input (`src/features/quick-input/`)
快速输入功能，提供高效的数据录入界面。

#### 4.3 Timer (`src/features/timer/`)
计时器功能：
```typescript
features/timer/
├── index.ts                   # 模块导出
├── FloatingTimerWidget.ts     # 浮动计时器
└── ui/                       # UI 组件
    ├── TimerView.tsx         # 计时器视图
    └── TimerRow.tsx          # 计时器行组件
```

#### 4.4 Settings (`src/features/settings/`)
设置管理功能，包括主题矩阵配置、插件配置等。

### 5. State Management (`src/state/`)

采用简单的发布-订阅模式实现状态管理。

#### 5.1 AppStore (`src/state/AppStore.ts`)
全局状态存储，管理：
```typescript
interface AppState {
    settings: ThinkSettings;        // 插件设置
    timers: TimerState[];           // 计时器列表
    activeTimer?: TimerState;       // 当前活动计时器
    isTimerWidgetVisible: boolean; // 悬浮计时器可见性
}
```

核心方法：
- `getState()` - 获取当前状态
- `getSettings()` - 获取设置
- `subscribe(listener)` - 订阅状态变化
- `_updateSettingsAndPersist()` - 更新并持久化设置
- `_updateEphemeralState()` - 更新临时状态

#### 5.2 Store Registry (`src/state/storeRegistry.ts`)
服务注册表，用于全局访问服务实例。

### 6. Platform Adaptation (`src/platform/`)

平台适配层，处理与 Obsidian API 的交互：
- **ObsidianPlatform** - Obsidian 平台适配器

### 7. Shared Resources (`src/shared/`)

共享资源，供所有模块使用：
- Components - 通用 UI 组件
- Utils - 通用工具函数
- Types - 共享类型定义

## 🔄 数据流

### 单向数据流
```
User Action → Command/Event → Service → State Update → UI Re-render
     ↑                                                        ↓
     └────────────────── UI Feedback ←──────────────────────┘
```

### 状态更新流程
1. 用户触发操作（点击、输入等）
2. UI 组件调用服务方法
3. 服务处理业务逻辑
4. 服务更新 AppStore 状态
5. AppStore 通知订阅者
6. 订阅组件接收更新并重新渲染

## 💉 依赖注入 (TSyringe)

### 简化的依赖注入使用

项目使用 TSyringe，但采用了简化的方式：

```typescript
// 仅 AppStore 使用单例注册
import { container, singleton } from 'tsyringe';

@singleton()
export class AppStore {
    // ...
}

container.registerSingleton(AppStore);

// 其他服务通过 ServiceManager 手动管理
this.services.dataStore = container.resolve(DataStore);
this.services.rendererService = container.resolve(RendererService);
```

注册的令牌：
- `AppToken` - Obsidian App 实例
- `SETTINGS_TOKEN` - 插件设置

## 🎨 UI 架构 (Preact)

### 组件层次
```
App
├── QuickInputModal
├── DashboardView
├── SettingsTab
│   └── ThemeMatrix
└── FloatingTimerWidget
    └── TimerView
        └── TimerRow[]
```

### 组件设计原则
1. **单一职责** - 每个组件只负责一个功能
2. **可复用性** - 通过 props 实现组件复用
3. **无状态优先** - 优先使用函数组件
4. **智能/展示分离** - 容器组件处理逻辑，展示组件负责UI

### Hooks 使用
```typescript
// useStore Hook - 订阅状态变化
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

## 📦 构建和打包

### Vite 构建配置
```typescript
// vite.config.ts
export default defineConfig({
    plugins: [preact()],
    build: {
        lib: {
            entry: 'src/main.ts',
            formats: ['cjs'],
            fileName: 'main'
        },
        rollupOptions: {
            external: ['obsidian']
        }
    }
});
```

## 🚀 性能优化

### 懒加载策略
1. **核心服务优先** - 先加载必需的 AppStore 和 TimerStateService
2. **计时器服务快速加载** - 用户体验关键功能优先
3. **数据服务异步加载** - 后台扫描数据，不阻塞主线程
4. **UI特性延迟加载** - 使用 setTimeout 错开加载时机

### 性能优化技巧
```typescript
// 延迟加载示例
private loadQuickInputFeature(): void {
    setTimeout(() => {
        console.time('[ThinkPlugin] QuickInput特性加载');
        QuickInputFeature.setup?.({
            plugin: this.plugin,
            appStore: this.services.appStore!
        });
        console.timeEnd('[ThinkPlugin] QuickInput特性加载');
    }, 100);
}
```

## 🧪 测试架构

### 测试层级
1. **单元测试** - 测试独立模块
2. **集成测试** - 测试模块间交互
3. **E2E测试** - 测试完整用户流程

## 📝 架构决策记录 (ADR)

### ADR-001: 选择 Preact 而非 React
- **决策**：使用 Preact 作为 UI 框架
- **原因**：更小的包体积，更快的运行速度
- **影响**：需要确保第三方库兼容性

### ADR-002: 使用 ServiceManager 模式
- **决策**：采用 ServiceManager 管理服务生命周期
- **原因**：更好的懒加载控制，优化启动性能
- **影响**：服务初始化顺序需要仔细管理

### ADR-003: 简化的状态管理
- **决策**：使用简单的发布-订阅模式而非复杂的状态管理库
- **原因**：降低复杂度，满足当前需求
- **影响**：大规模应用可能需要重新考虑

## 🔮 未来架构演进

### 短期目标
- [ ] 完善测试覆盖
- [ ] 优化打包体积
- [ ] 改进错误处理

### 长期目标
- [ ] 支持插件扩展
- [ ] 实现更复杂的状态管理（如需要）
- [ ] 支持远程配置

---

*文档版本：2.0.0*  
*最后更新：2025年10月7日*  
*维护者：Think OS Team*
