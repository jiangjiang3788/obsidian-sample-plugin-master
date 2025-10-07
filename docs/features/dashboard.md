# Dashboard (仪表板) 功能模块

## 概述

Dashboard 模块是 Think OS 插件的核心功能之一，负责初始化数据监控和代码块嵌入功能。该模块主要作为初始化入口，实际的核心组件位于 `features/logic/` 目录。

## 目录结构

```
src/features/dashboard/
├── index.ts           # 模块入口和初始化
├── hooks/            # React/Preact hooks
├── styles/           # 样式文件（包含 global.css）
├── ui/              # UI 组件
└── views/           # 视图组件

src/features/logic/    # 实际的核心组件位置
├── VaultWatcher.ts   # 库监控器
└── CodeblockEmbedder.ts  # 代码块嵌入器
```

## 模块初始化

Dashboard 模块通过 `setup` 函数进行初始化：

```typescript
export function setup(deps: DashboardDependencies) {  
    const { plugin, dataStore, appStore, rendererService, actionService } = deps;
    
    // 初始化核心组件
    new VaultWatcher(plugin, dataStore);
    new CodeblockEmbedder(plugin, appStore, dataStore, rendererService, actionService);
}
```

## 核心组件（位于 features/logic/）

### 1. VaultWatcher (库监控器)

监控 Obsidian 库中的文件变化，实时更新数据存储。

**位置：** `src/features/logic/VaultWatcher.ts`

**主要职责：**
- 监听文件创建、修改、删除事件
- 自动同步数据到 DataStore
- 维护文件索引和缓存

### 2. CodeblockEmbedder (代码块嵌入器)

处理 Markdown 中的特殊代码块，提供动态内容嵌入功能。

**位置：** `src/features/logic/CodeblockEmbedder.ts`

**主要职责：**
- 解析自定义代码块语法
- 渲染动态内容
- 与 ActionService 集成执行操作

## 依赖关系

Dashboard 模块依赖以下核心服务：

```typescript
export interface DashboardDependencies {
    plugin: Plugin;           // Obsidian 插件实例
    appStore: AppStore;       // 应用状态存储
    dataStore: DataStore;     // 数据存储服务
    rendererService: RendererService;  // 渲染服务
    actionService: ActionService;      // 动作执行服务
}
```

## 时间轴解析器 API

### TimelineTask 接口

```typescript
interface TimelineTask extends Item {
    startMinute: number;      // 开始时间（分钟）
    endMinute: number;        // 结束时间（分钟）
    duration: number;         // 持续时长（分钟）
    pureText: string;         // 纯文本内容
    actualStartDate: string;  // 实际开始日期
}
```

### TaskBlock 接口

```typescript
interface TaskBlock extends TimelineTask {
    day: string;              // 日期 (YYYY-MM-DD)
    blockStartMinute: number; // 块开始时间
    blockEndMinute: number;   // 块结束时间
}
```

### 核心函数

#### processItemsToTimelineTasks

将原始任务项转换为时间轴任务格式。

```typescript
function processItemsToTimelineTasks(items: Item[]): TimelineTask[]
```

**功能：**
- 过滤已完成的任务
- 解析时间信息
- 提取纯文本内容
- 处理跨天任务的日期计算

#### splitTaskIntoDayBlocks

将跨天任务分割为按天对齐的任务块。

```typescript
function splitTaskIntoDayBlocks(
    task: TimelineTask, 
    dateRange: [dayjs.Dayjs, dayjs.Dayjs]
): TaskBlock[]
```

**功能：**
- 处理跨天任务
- 生成每天的任务块
- 计算块的开始和结束时间

## 使用示例

### 初始化 Dashboard

Dashboard 功能在 ServiceManager 中通过懒加载方式初始化：

```typescript
// 在 ServiceManager 中
private async loadDashboardFeature(): Promise<void> {
    // 等待数据扫描完成
    if (this.scanDataPromise) {
        await this.scanDataPromise;
    }
    
    // 数据准备好后再加载 Dashboard
    console.time('[ThinkPlugin] Dashboard特性加载');
    DashboardFeature.setup?.({
        plugin: this.plugin,
        appStore: this.services.appStore!,
        dataStore: this.services.dataStore!,
        rendererService: this.services.rendererService!,
        actionService: this.services.actionService!
    });
    console.timeEnd('[ThinkPlugin] Dashboard特性加载');
}
```

### 样式管理

Dashboard 模块提供全局样式：

```typescript
// src/features/dashboard/styles/global.ts
export const GLOBAL_CSS = `
    /* Think 插件全局样式 */
`;

// 在插件主文件中注入
private injectGlobalCss() {
    let el = document.getElementById(STYLE_TAG_ID) as HTMLStyleElement | null;
    if (!el) {
        el = document.createElement('style');
        el.id = STYLE_TAG_ID;
        document.head.appendChild(el);
    }
    el.textContent = GLOBAL_CSS;
}
```

## 与其他模块的集成

Dashboard 模块与其他系统组件紧密集成：

1. **DataStore** - 提供数据存储和查询
2. **AppStore** - 管理全局状态
3. **RendererService** - 处理内容渲染
4. **ActionService** - 执行用户操作

## 性能优化

1. **增量更新**：VaultWatcher 仅处理变化的文件
2. **缓存机制**：解析结果会被缓存，避免重复计算
3. **延迟渲染**：仅渲染可视区域内的内容

## 扩展点

Dashboard 模块提供以下扩展点：

1. **自定义代码块处理器**：通过 CodeblockEmbedder 注册自定义处理器
2. **时间轴视图插件**：扩展时间轴视图的渲染和交互
3. **数据过滤器**：自定义任务过滤和排序规则

## 性能考虑

Dashboard 模块采用以下策略优化性能：

1. **延迟加载** - 等待数据扫描完成后再初始化
2. **事件防抖** - VaultWatcher 使用防抖处理文件变化
3. **增量更新** - 只处理变化的文件，避免全量扫描

## 常见问题

### Q: Dashboard 模块和 logic 模块的关系是什么？

A: Dashboard 模块是功能入口，负责初始化。实际的业务逻辑组件（VaultWatcher、CodeblockEmbedder）位于 `features/logic/` 目录。

### Q: 为什么 Dashboard 要等待数据扫描完成？

A: 确保用户界面显示时已有数据可用，提供更好的用户体验。

### Q: 如何扩展 Dashboard 功能？

A: 可以在 `features/dashboard/ui/` 或 `features/dashboard/views/` 添加新的 UI 组件，或在 `features/logic/` 添加新的业务逻辑组件。

## 相关文档

- [核心服务](../../ARCHITECTURE.md#核心服务)
- [状态管理](../state-management.md)
- [测试指南](../../TESTING.md)

---

*最后更新: 2025-10-07*
