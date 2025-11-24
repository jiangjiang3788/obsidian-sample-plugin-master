# Think Plugin 功能流程图

## 插件启动与模块加载流程

```mermaid
graph TD
    A[插件启动 ThinkPlugin.onload] --> B[1. 加载设置 loadSettings]
    B --> C[2. 配置DI容器 setupCoreContainer]
    C --> D[3. 创建ServiceManager]
    D --> E[ServiceManager.bootstrap]
    
    %% ServiceManager Bootstrap 详细流程
    E --> F[initializeCore: 核心服务初始化]
    F --> G[loadTimerServices: 计时器服务]
    G --> H[loadDataServices: 数据服务]
    H --> I[loadUIFeatures: UI特性加载]
    
    %% 核心服务初始化
    F --> F1[AppStore 实例化]
    F --> F2[TimerStateService 实例化]
    F1 --> F3[注册子Store: TimerStore, ThemeStore, etc.]
    
    %% 计时器服务
    G --> G1[TimerService 实例化]
    G --> G2[注册计时器命令]
    G --> G3[恢复计时器状态]
    G --> G4[加载悬浮计时器Widget]
    
    %% 数据服务
    H --> H1[DataStore 实例化]
    H --> H2[RendererService 实例化]
    H --> H3[ActionService 实例化]
    H --> H4[InputService 实例化]
    H --> H5[ItemService 实例化]
    H --> H6[注册到全局Registry]
    H --> H7[触发后台数据扫描]
    
    %% 数据扫描流程
    H7 --> DS1[warmStart: 暖启动]
    DS1 --> DS2[加载缓存 cache.json]
    DS2 --> DS3[列出Markdown文件]
    DS3 --> DS4[对比文件mtime/size]
    DS4 --> DS5[复原未变更的缓存数据]
    DS5 --> DS6[扫描变更的文件]
    DS6 --> DS7[解析Task和Block内容]
    DS7 --> DS8[更新内存索引和缓存]
    DS8 --> DS9[通知数据变化]
    
    %% UI特性加载
    I --> UI1[创建FeatureLoader]
    UI1 --> UI2[等待数据扫描完成]
    UI2 --> UI3[loadDashboardFeature]
    UI2 --> UI4[loadSettingsFeature]
    UI2 --> UI5[loadQuickInputFeature]
    
    %% Dashboard特性
    UI3 --> D1[setupDashboard]
    D1 --> D2[注册Dashboard视图]
    D1 --> D3[渲染数据面板]
    
    %% Settings特性
    UI4 --> S1[setupSettings]
    S1 --> S2[注册设置Tab]
    S1 --> S3[注册打开设置命令]
    
    %% QuickInput特性
    UI5 --> Q1[QuickInput.setup]
    Q1 --> Q2[注册快速输入命令]
    
    %% 最终完成
    I --> DONE[4. 注册性能报告命令]
    DONE --> END[插件启动完成]

    %% 样式
    classDef coreService fill:#e1f5fe
    classDef dataService fill:#f3e5f5
    classDef uiService fill:#e8f5e8
    classDef process fill:#fff3e0
    
    class F1,F2,F3 coreService
    class H1,H2,H3,H4,H5,DS1,DS2,DS3,DS4,DS5,DS6,DS7,DS8,DS9 dataService
    class UI3,UI4,UI5,D1,D2,D3,S1,S2,S3,Q1,Q2 uiService
    class A,B,C,D,E,F,G,H,I,DONE,END process
```

## 数据流架构图

```mermaid
graph LR
    subgraph "用户交互层"
        UI1[Dashboard视图]
        UI2[Settings面板]
        UI3[QuickInput命令]
        UI4[悬浮计时器Widget]
    end
    
    subgraph "特性层 (Features)"
        F1[Timer Feature]
        F2[Settings Feature]
        F3[QuickInput Feature]
    end
    
    subgraph "应用层 (Application)"
        APP[AppStore<br/>状态聚合器]
        SM[ServiceManager<br/>服务编排器]
        FL[FeatureLoader<br/>特性加载器]
    end
    
    subgraph "业务服务层 (Services)"
        TS[TimerService<br/>计时器业务]
        RS[RendererService<br/>渲染业务]
        AS[ActionService<br/>操作业务]
        IS[InputService<br/>输入业务]
        ITEMS[ItemService<br/>项目业务]
    end
    
    subgraph "核心服务层 (Core)"
        DS[DataStore<br/>数据存储与查询]
        TSS[TimerStateService<br/>计时器状态持久化]
        TM[ThemeManager<br/>主题管理]
    end
    
    subgraph "数据持久化层"
        CACHE[缓存系统<br/>cache.json]
        VAULT[Obsidian Vault<br/>Markdown文件]
        CONFIG[插件配置<br/>data.json]
    end
    
    subgraph "子Store系统"
        TS_STORE[TimerStore]
        THEME_STORE[ThemeStore]
        LAYOUT_STORE[LayoutStore]
        VIEW_STORE[ViewInstanceStore]
        BLOCK_STORE[BlockStore]
        GROUP_STORE[GroupStore]
        SETTINGS_STORE[SettingsStore]
    end
    
    %% 用户交互流
    UI1 --> F1
    UI2 --> F2
    UI3 --> F3
    UI4 --> F1
    
    %% 特性到应用层
    F1 --> APP
    F2 --> APP
    F3 --> APP
    
    %% 应用层内部
    SM --> FL
    SM --> APP
    FL --> APP
    
    %% 应用层到服务层
    APP --> TS
    APP --> RS
    APP --> AS
    APP --> IS
    APP --> ITEMS
    
    %% 服务层到核心层
    TS --> DS
    TS --> TSS
    RS --> DS
    AS --> DS
    IS --> DS
    ITEMS --> DS
    RS --> TM
    
    %% AppStore 与子Store关系
    APP --> TS_STORE
    APP --> THEME_STORE
    APP --> LAYOUT_STORE
    APP --> VIEW_STORE
    APP --> BLOCK_STORE
    APP --> GROUP_STORE
    APP --> SETTINGS_STORE
    
    %% 数据持久化
    DS --> CACHE
    DS --> VAULT
    TSS --> CONFIG
    APP --> CONFIG
    
    %% 样式
    classDef ui fill:#e3f2fd
    classDef feature fill:#e8f5e8
    classDef app fill:#fff3e0
    classDef service fill:#f3e5f5
    classDef core fill:#e1f5fe
    classDef store fill:#fce4ec
    classDef data fill:#f1f8e9
    
    class UI1,UI2,UI3,UI4 ui
    class F1,F2,F3 feature
    class APP,SM,FL app
    class TS,RS,AS,IS,ITEMS service
    class DS,TSS,TM core
    class TS_STORE,THEME_STORE,LAYOUT_STORE,VIEW_STORE,BLOCK_STORE,GROUP_STORE,SETTINGS_STORE store
    class CACHE,VAULT,CONFIG data
```

## 核心业务流程

### 1. 数据扫描与索引流程
```mermaid
sequenceDiagram
    participant Plugin as ThinkPlugin
    participant SM as ServiceManager
    participant DS as DataStore
    participant Cache as 缓存系统
    participant Vault as Obsidian Vault
    
    Plugin->>SM: bootstrap()
    SM->>DS: loadDataServices()
    DS->>Cache: 读取 cache.json
    DS->>Vault: 获取所有 .md 文件
    DS->>DS: 对比文件 mtime/size
    
    loop 处理变更文件
        DS->>Vault: 读取文件内容
        DS->>DS: 解析 Task 和 Block
        DS->>DS: 更新内存索引
        DS->>Cache: 更新缓存条目
    end
    
    DS->>DS: 通知数据变化
    DS-->>Plugin: 扫描完成
```

### 2. 计时器业务流程
```mermaid
sequenceDiagram
    participant User as 用户
    participant UI as 悬浮计时器
    participant TS as TimerService
    participant Store as TimerStore
    participant TSS as TimerStateService
    participant File as 状态文件
    
    User->>UI: 点击开始计时
    UI->>TS: startTimer(taskId)
    TS->>Store: updateTimer(state)
    Store->>Store: 更新内存状态
    Store->>TSS: 持久化状态
    TSS->>File: 写入状态文件
    Store-->>UI: 通知状态更新
    UI-->>User: 显示计时中
```

### 3. 设置管理流程
```mermaid
sequenceDiagram
    participant User as 用户
    participant Settings as 设置面板
    participant APP as AppStore
    participant SubStore as 子Store
    participant Plugin as ThinkPlugin
    participant Config as data.json
    
    User->>Settings: 修改设置
    Settings->>APP: updateXXX(newValue)
    APP->>SubStore: 委托具体更新
    SubStore->>SubStore: 验证并更新
    SubStore->>APP: 触发持久化
    APP->>Plugin: saveData()
    Plugin->>Config: 写入配置文件
    APP-->>Settings: 通知界面更新
```

## 模块职责表

| 模块类型 | 模块名 | 主要职责 | 主要文件 |
|---------|--------|---------|---------|
| **入口层** | ThinkPlugin | 插件生命周期管理 | `src/main.ts` |
| **应用层** | ServiceManager | 服务编排与生命周期 | `src/app/ServiceManager.ts` |
|  | FeatureLoader | UI特性加载 | `src/app/FeatureLoader.ts` |
|  | AppStore | 状态聚合与持久化 | `src/app/AppStore.ts` |
| **特性层** | Timer Feature | 计时器功能 | `src/features/timer/` |
|  | Settings Feature | 设置管理功能 | `src/features/settings/` |
|  | QuickInput Feature | 快速输入功能 | `src/features/quickinput/` |
| **服务层** | TimerService | 计时器业务逻辑 | `src/features/timer/TimerService.ts` |
|  | DataStore | 数据扫描与查询 | `src/core/services/DataStore.ts` |
|  | RendererService | 布局渲染 | `src/features/settings/RendererService.ts` |
| **存储层** | TimerStore | 计时器状态 | `src/features/timer/TimerStore.ts` |
|  | ThemeStore | 主题状态 | `src/features/settings/ThemeStore.ts` |
|  | 其他子Store | 各种业务状态 | `src/features/settings/*Store.ts` |

## 关键设计模式

1. **依赖注入 (DI)**: 使用 tsyringe 容器管理服务生命周期
2. **发布订阅**: Store 系统通过订阅机制通知 React 组件更新
3. **分层架构**: 严格的层次依赖，上层可调用下层，下层不依赖上层
4. **状态委托**: AppStore 作为聚合器，具体逻辑委托给子 Store
5. **缓存优化**: DataStore 使用文件 mtime/size 对比实现增量扫描
6. **特性模块化**: 每个功能特性独立封装，可插拔
