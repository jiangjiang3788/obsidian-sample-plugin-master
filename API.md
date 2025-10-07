# Think OS API 参考文档

## 📚 概述

本文档提供 Think OS 插件的完整 API 参考，包括核心服务、状态管理、工具函数和组件接口。

## 🎯 核心服务 API

### DataSourceService

数据源管理服务，负责数据的创建、查询、更新和删除。

```typescript
import { container } from 'tsyringe';
import { DataSourceService } from '@core/services';

const dataSourceService = container.resolve(DataSourceService);
```

#### 方法

##### `createDataSource(data: CreateDataSourceDto): Promise<DataSource>`
创建新的数据源。

```typescript
const dataSource = await dataSourceService.createDataSource({
    content: "任务内容",
    theme: "工作/项目A",
    tags: ["重要", "紧急"],
    timestamp: Date.now()
});
```

##### `getDataSource(id: string): Promise<DataSource | null>`
获取指定ID的数据源。

```typescript
const dataSource = await dataSourceService.getDataSource("ds_123456");
```

##### `queryDataSources(query: DataSourceQuery): Promise<DataSource[]>`
查询数据源列表。

```typescript
const dataSources = await dataSourceService.queryDataSources({
    theme: "工作",
    tags: ["重要"],
    startDate: new Date("2025-01-01"),
    endDate: new Date("2025-12-31"),
    limit: 100
});
```

##### `updateDataSource(id: string, updates: Partial<DataSource>): Promise<DataSource>`
更新数据源。

```typescript
const updated = await dataSourceService.updateDataSource("ds_123456", {
    content: "更新后的内容",
    tags: ["已完成"]
});
```

##### `deleteDataSource(id: string): Promise<void>`
删除数据源。

```typescript
await dataSourceService.deleteDataSource("ds_123456");
```

##### `batchOperation(operation: BatchOperation): Promise<BatchResult>`
批量操作数据源。

```typescript
const result = await dataSourceService.batchOperation({
    type: 'update',
    ids: ["ds_1", "ds_2", "ds_3"],
    updates: {
        theme: "归档"
    }
});
```

### ThemeService

主题管理服务，处理主题的层级结构和配置。

```typescript
import { ThemeService } from '@core/services';

const themeService = container.resolve(ThemeService);
```

#### 方法

##### `createTheme(theme: CreateThemeDto): Promise<Theme>`
创建新主题。

```typescript
const theme = await themeService.createTheme({
    name: "工作",
    path: "生活/工作",
    color: "#4CAF50",
    icon: "briefcase",
    parent: "生活"
});
```

##### `getTheme(idOrPath: string): Promise<Theme | null>`
获取主题信息。

```typescript
// 通过ID获取
const theme = await themeService.getTheme("theme_123");

// 通过路径获取
const theme = await themeService.getTheme("生活/工作/项目A");
```

##### `getThemeTree(): Promise<ThemeTreeNode>`
获取完整的主题树结构。

```typescript
const themeTree = await themeService.getThemeTree();
// 返回层级结构的主题树
```

##### `getThemeChildren(parentPath: string): Promise<Theme[]>`
获取子主题列表。

```typescript
const children = await themeService.getThemeChildren("生活/工作");
```

##### `moveTheme(themePath: string, newParentPath: string): Promise<Theme>`
移动主题到新的父级。

```typescript
const moved = await themeService.moveTheme(
    "生活/工作/项目A",
    "归档"
);
```

##### `mergeThemes(sourcePaths: string[], targetPath: string): Promise<Theme>`
合并多个主题。

```typescript
const merged = await themeService.mergeThemes(
    ["临时/任务1", "临时/任务2"],
    "工作/已完成"
);
```

### BlockService

数据块管理服务，处理视图中的数据展示块。

```typescript
import { BlockService } from '@core/services';

const blockService = container.resolve(BlockService);
```

#### 方法

##### `createBlock(block: CreateBlockDto): Promise<Block>`
创建数据块。

```typescript
const block = await blockService.createBlock({
    title: "本周任务",
    type: "list",
    config: {
        theme: "工作",
        timeRange: "week",
        sortBy: "priority"
    }
});
```

##### `getBlockData(blockId: string): Promise<BlockData>`
获取数据块的数据。

```typescript
const blockData = await blockService.getBlockData("block_123");
// 返回处理后的展示数据
```

##### `updateBlockConfig(blockId: string, config: Partial<BlockConfig>): Promise<Block>`
更新数据块配置。

```typescript
const updated = await blockService.updateBlockConfig("block_123", {
    timeRange: "month",
    showCompleted: false
});
```

### TimerService

计时器管理服务。

```typescript
import { TimerService } from '@core/services';

const timerService = container.resolve(TimerService);
```

#### 方法

##### `startTimer(config: TimerConfig): Timer`
启动计时器。

```typescript
const timer = timerService.startTimer({
    duration: 25 * 60 * 1000, // 25分钟
    type: "pomodoro",
    onComplete: () => console.log("Timer completed!")
});
```

##### `pauseTimer(timerId: string): void`
暂停计时器。

```typescript
timerService.pauseTimer("timer_123");
```

##### `resumeTimer(timerId: string): void`
恢复计时器。

```typescript
timerService.resumeTimer("timer_123");
```

##### `stopTimer(timerId: string): void`
停止计时器。

```typescript
timerService.stopTimer("timer_123");
```

##### `getTimerStats(): TimerStatistics`
获取计时统计信息。

```typescript
const stats = timerService.getTimerStats();
// { totalTime: 3600000, sessions: 4, averageSession: 900000 }
```

## 🗄️ 状态管理 API

### AppStore

全局状态存储。

```typescript
import { AppStore } from '@state/AppStore';

const appStore = container.resolve(AppStore);
```

#### 方法

##### `getState(): AppState`
获取当前状态。

```typescript
const state = appStore.getState();
const { dataSources, themes, settings } = state;
```

##### `setState(updates: Partial<AppState>): void`
更新状态。

```typescript
appStore.setState({
    settings: {
        ...appStore.getState().settings,
        darkMode: true
    }
});
```

##### `subscribe(event: string, callback: Subscriber): Unsubscribe`
订阅状态变更。

```typescript
const unsubscribe = appStore.subscribe('theme.update', (data) => {
    console.log('Theme updated:', data);
});

// 取消订阅
unsubscribe();
```

##### `publish(event: string, data: any): void`
发布事件。

```typescript
appStore.publish('dataSource.created', { id: 'ds_123' });
```

### State Providers

#### DataSourceProvider

```typescript
import { DataSourceProvider } from '@state/providers';

const provider = container.resolve(DataSourceProvider);

// 获取过滤后的数据源
const filtered = provider.getFilteredDataSources({
    theme: "工作",
    tags: ["重要"]
});

// 获取分组数据
const grouped = provider.getGroupedByTheme();
```

#### ThemeProvider

```typescript
import { ThemeProvider } from '@state/providers';

const provider = container.resolve(ThemeProvider);

// 获取活跃主题
const activeThemes = provider.getActiveThemes();

// 获取主题统计
const stats = provider.getThemeStatistics();
```

## 🛠️ 工具函数 API

### 日期工具 (dateUtils)

```typescript
import { dateUtils } from '@core/utils';

// 格式化日期
const formatted = dateUtils.format(new Date(), 'YYYY-MM-DD HH:mm');

// 获取相对时间
const relative = dateUtils.getRelativeTime(timestamp); // "2小时前"

// 获取日期范围
const range = dateUtils.getDateRange('week'); // 本周的开始和结束日期

// 判断是否同一天
const isSame = dateUtils.isSameDay(date1, date2);
```

### 路径工具 (pathUtils)

```typescript
import { pathUtils } from '@core/utils';

// 解析路径
const segments = pathUtils.parsePath("生活/工作/项目A");
// ["生活", "工作", "项目A"]

// 获取父路径
const parent = pathUtils.getParentPath("生活/工作/项目A");
// "生活/工作"

// 判断是否子路径
const isChild = pathUtils.isChildPath("生活/工作", "生活");
// false

// 规范化路径
const normalized = pathUtils.normalizePath("生活//工作/");
// "生活/工作"
```

### 验证工具 (validationUtils)

```typescript
import { validationUtils } from '@core/utils';

// 验证主题路径
const isValid = validationUtils.isValidThemePath("生活/工作");

// 验证标签
const isValidTag = validationUtils.isValidTag("#重要");

// 验证数据源
const validation = validationUtils.validateDataSource(data);
// { isValid: boolean, errors: string[] }
```

### 数组工具 (arrayUtils)

```typescript
import { arrayUtils } from '@shared/utils';

// 去重
const unique = arrayUtils.unique([1, 2, 2, 3]); // [1, 2, 3]

// 分组
const grouped = arrayUtils.groupBy(items, 'category');

// 分块
const chunks = arrayUtils.chunk(array, 10); // 每10个一组

// 扁平化
const flat = arrayUtils.flatten([[1, 2], [3, 4]]); // [1, 2, 3, 4]
```

## 🎨 组件 Props 接口

### ThemeMatrix 组件

```typescript
interface ThemeMatrixProps {
    themes: Theme[];
    onThemeSelect?: (theme: Theme) => void;
    onThemeCreate?: (theme: CreateThemeDto) => void;
    onThemeUpdate?: (id: string, updates: Partial<Theme>) => void;
    onThemeDelete?: (id: string) => void;
    selectedThemes?: string[];
    multiSelect?: boolean;
    showToolbar?: boolean;
    readOnly?: boolean;
}
```

### QuickInput 组件

```typescript
interface QuickInputProps {
    onSubmit: (data: QuickInputData) => void;
    onCancel?: () => void;
    defaultTheme?: string;
    suggestions?: {
        themes?: string[];
        tags?: string[];
    };
    placeholder?: string;
    autoFocus?: boolean;
}
```

### DashboardView 组件

```typescript
interface DashboardViewProps {
    blocks: Block[];
    layout?: 'grid' | 'list' | 'masonry';
    columns?: number;
    onBlockClick?: (block: Block) => void;
    onBlockEdit?: (block: Block) => void;
    onBlockDelete?: (blockId: string) => void;
    onLayoutChange?: (layout: string) => void;
    editable?: boolean;
}
```

### BlockCard 组件

```typescript
interface BlockCardProps {
    block: Block;
    data: BlockData;
    onClick?: () => void;
    onEdit?: () => void;
    onDelete?: () => void;
    className?: string;
    style?: CSSProperties;
}
```

## 🔌 Hooks API

### useDataSource

```typescript
function useDataSource(id: string): {
    dataSource: DataSource | null;
    loading: boolean;
    error: Error | null;
    refresh: () => void;
}

// 使用示例
const { dataSource, loading, error, refresh } = useDataSource("ds_123");
```

### useTheme

```typescript
function useTheme(path: string): {
    theme: Theme | null;
    children: Theme[];
    loading: boolean;
}

// 使用示例
const { theme, children, loading } = useTheme("生活/工作");
```

### useAppState

```typescript
function useAppState<T = AppState>(
    selector?: (state: AppState) => T
): T

// 使用示例
const settings = useAppState(state => state.settings);
const dataSources = useAppState(state => state.dataSources);
```

### useTimer

```typescript
function useTimer(config?: TimerConfig): {
    time: number;
    isRunning: boolean;
    isPaused: boolean;
    start: () => void;
    pause: () => void;
    resume: () => void;
    stop: () => void;
}

// 使用示例
const timer = useTimer({ duration: 25 * 60 * 1000 });
```

### useQuickInput

```typescript
function useQuickInput(): {
    isOpen: boolean;
    open: () => void;
    close: () => void;
    submit: (data: QuickInputData) => void;
}

// 使用示例
const quickInput = useQuickInput();
```

## 📡 事件系统

### 事件列表

| 事件名称 | 描述 | 数据类型 |
|---------|------|----------|
| `dataSource.created` | 数据源创建 | `{ id: string, dataSource: DataSource }` |
| `dataSource.updated` | 数据源更新 | `{ id: string, updates: Partial<DataSource> }` |
| `dataSource.deleted` | 数据源删除 | `{ id: string }` |
| `theme.created` | 主题创建 | `{ theme: Theme }` |
| `theme.updated` | 主题更新 | `{ id: string, updates: Partial<Theme> }` |
| `theme.deleted` | 主题删除 | `{ id: string }` |
| `settings.changed` | 设置变更 | `{ key: string, value: any }` |
| `view.changed` | 视图切换 | `{ viewId: string }` |

### 事件订阅示例

```typescript
// 订阅单个事件
const unsubscribe = appStore.subscribe('dataSource.created', (data) => {
    console.log('New data source:', data.dataSource);
});

// 订阅多个事件
const subscriptions = [
    appStore.subscribe('theme.created', handleThemeCreated),
    appStore.subscribe('theme.updated', handleThemeUpdated),
    appStore.subscribe('theme.deleted', handleThemeDeleted)
];

// 清理订阅
subscriptions.forEach(unsub => unsub());
```

## 🔧 类型定义

### 核心类型

```typescript
interface DataSource {
    id: string;
    content: string;
    theme: string;
    tags: string[];
    timestamp: number;
    metadata?: Record<string, any>;
    attachments?: Attachment[];
}

interface Theme {
    id: string;
    name: string;
    path: string;
    parent?: string;
    children?: string[];
    color?: string;
    icon?: string;
    settings?: ThemeSettings;
    createdAt: number;
    updatedAt: number;
}

interface Block {
    id: string;
    title: string;
    type: 'list' | 'grid' | 'chart' | 'calendar' | 'timeline';
    config: BlockConfig;
    position?: { x: number; y: number };
    size?: { width: number; height: number };
}

interface Timer {
    id: string;
    type: 'pomodoro' | 'countdown' | 'stopwatch';
    duration?: number;
    elapsed: number;
    status: 'idle' | 'running' | 'paused' | 'completed';
    startTime?: number;
    endTime?: number;
}
```

### 配置类型

```typescript
interface AppSettings {
    theme: 'light' | 'dark' | 'auto';
    language: string;
    dateFormat: string;
    timeFormat: '12h' | '24h';
    firstDayOfWeek: 0 | 1 | 2 | 3 | 4 | 5 | 6;
    defaultView: string;
    quickInputHotkey: string;
    autoSave: boolean;
    autoSaveInterval: number;
}

interface BlockConfig {
    theme?: string;
    tags?: string[];
    timeRange?: 'day' | 'week' | 'month' | 'year' | 'custom';
    customRange?: { start: Date; end: Date };
    sortBy?: 'date' | 'theme' | 'priority' | 'alphabetical';
    sortOrder?: 'asc' | 'desc';
    limit?: number;
    showCompleted?: boolean;
    groupBy?: 'theme' | 'date' | 'tag';
}

interface ThemeSettings {
    isActive: boolean;
    isArchived: boolean;
    priority: number;
    defaultTags?: string[];
    template?: string;
    reminder?: ReminderConfig;
}
```

## 🌐 平台适配器 API

### FileSystemAdapter

```typescript
class FileSystemAdapter {
    readFile(path: string): Promise<string>;
    writeFile(path: string, content: string): Promise<void>;
    deleteFile(path: string): Promise<void>;
    exists(path: string): Promise<boolean>;
    listFiles(path: string): Promise<string[]>;
    createDirectory(path: string): Promise<void>;
}
```

### VaultAdapter

```typescript
class VaultAdapter {
    getActiveFile(): TFile | null;
    getFiles(): TFile[];
    getMarkdownFiles(): TFile[];
    getFolders(): TFolder[];
    createNote(path: string, content: string): Promise<TFile>;
    modifyNote(file: TFile, content: string): Promise<void>;
    deleteNote(file: TFile): Promise<void>;
}
```

### WorkspaceAdapter

```typescript
class WorkspaceAdapter {
    getActiveView(): View | null;
    openView(viewType: string): Promise<View>;
    closeView(view: View): Promise<void>;
    revealLeaf(leaf: WorkspaceLeaf): void;
    getLeaves(): WorkspaceLeaf[];
}
```

## 📖 使用示例

### 完整的数据源管理流程

```typescript
import { container } from 'tsyringe';
import { DataSourceService, ThemeService, AppStore } from '@core';

async function manageDataSources() {
    const dataSourceService = container.resolve(DataSourceService);
    const themeService = container.resolve(ThemeService);
    const appStore = container.resolve(AppStore);
    
    // 1. 创建主题
    const theme = await themeService.createTheme({
        name: "项目管理",
        path: "工作/项目管理"
    });
    
    // 2. 创建数据源
    const dataSource = await dataSourceService.createDataSource({
        content: "完成项目文档",
        theme: theme.path,
        tags: ["重要", "本周"]
    });
    
    // 3. 订阅更新
    const unsubscribe = appStore.subscribe('dataSource.updated', (data) => {
        console.log('数据源已更新:', data);
    });
    
    // 4. 更新数据源
    await dataSourceService.updateDataSource(dataSource.id, {
        tags: [...dataSource.tags, "已完成"]
    });
    
    // 5. 查询相关数据源
    const related = await dataSourceService.queryDataSources({
        theme: theme.path,
        tags: ["重要"]
    });
    
    console.log(`找到 ${related.length} 个相关数据源`);
    
    // 清理
    unsubscribe();
}
```

### 自定义 Hook 实现

```typescript
import { useState, useEffect } from 'preact/hooks';
import { container } from 'tsyringe';
import { DataSourceService, AppStore } from '@core';

export function useDataSources(query?: DataSourceQuery) {
    const [dataSources, setDataSources] = useState<DataSource[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);
    
    const dataSourceService = container.resolve(DataSourceService);
    const appStore = container.resolve(AppStore);
    
    useEffect(() => {
        loadDataSources();
        
        const unsubscribes = [
            appStore.subscribe('dataSource.created', loadDataSources),
            appStore.subscribe('dataSource.updated', loadDataSources),
            appStore.subscribe('dataSource.deleted', loadDataSources)
        ];
        
        return () => {
            unsubscribes.forEach(unsub => unsub());
        };
    }, [JSON.stringify(query)]);
    
    async function loadDataSources() {
        try {
            setLoading(true);
            const data = await dataSourceService.queryDataSources(query || {});
            setDataSources(data);
            setError(null);
        } catch (err) {
            setError(err as Error);
        } finally {
            setLoading(false);
        }
    }
    
    return { dataSources, loading, error, refresh: loadDataSources };
}
```

---

*文档版本：1.0.0*  
*最后更新：2025年10月7日*  
*维护者：Think OS Team*
