# Logic (逻辑处理) 功能模块

## 概述

Logic 模块包含 Think OS 插件的核心业务逻辑组件，主要负责 Obsidian 库的文件监控和代码块处理。该模块提供了 VaultWatcher（库监控器）和 CodeblockEmbedder（代码块嵌入器）两个核心组件。

## 目录结构

```
src/features/logic/
├── index.ts               # 模块导出
├── VaultWatcher.ts        # 库文件监控器
└── CodeblockEmbedder.ts   # 代码块嵌入处理器
```

## 核心组件

### 1. VaultWatcher (库监控器)

监控 Obsidian 库中的文件变化，实时同步数据。

**主要功能：**
- 监听文件创建、修改、删除、重命名事件
- 自动解析和更新文件内容
- 维护文件索引和元数据
- 提供文件变化的事件通知

**核心接口：**
```typescript
export class VaultWatcher {
    constructor(
        plugin: Plugin,
        dataStore: DataStore
    );
    
    // 开始监控
    public start(): void;
    
    // 停止监控
    public stop(): void;
    
    // 手动触发文件扫描
    public scan(): Promise<void>;
    
    // 处理单个文件
    private processFile(file: TFile): Promise<void>;
}
```

**事件处理：**
```typescript
// 文件创建
private onFileCreate(file: TAbstractFile): void;

// 文件修改
private onFileModify(file: TAbstractFile): void;

// 文件删除
private onFileDelete(file: TAbstractFile): void;

// 文件重命名
private onFileRename(file: TAbstractFile, oldPath: string): void;
```

### 2. CodeblockEmbedder (代码块嵌入器)

处理 Markdown 中的特殊代码块，提供动态内容嵌入和渲染。

**主要功能：**
- 识别和解析自定义代码块语法
- 动态渲染代码块内容
- 支持多种代码块类型
- 与 ActionService 集成执行操作

**核心接口：**
```typescript
export class CodeblockEmbedder {
    constructor(
        plugin: Plugin,
        appStore: AppStore,
        dataStore: DataStore,
        rendererService: RendererService,
        actionService: ActionService
    );
    
    // 注册代码块处理器
    public registerProcessor(
        language: string,
        processor: CodeblockProcessor
    ): void;
    
    // 处理代码块
    public process(
        source: string,
        el: HTMLElement,
        ctx: MarkdownPostProcessorContext
    ): Promise<void>;
}
```

## 代码块类型

### 1. 查询代码块

执行数据查询并显示结果：

````markdown
```think-query
type: task
status: pending
tags: #important
limit: 10
```
````

### 2. 视图代码块

渲染自定义视图组件：

````markdown
```think-view
component: timeline
dateRange: 7d
showCompleted: true
```
````

### 3. 操作代码块

提供交互式操作界面：

````markdown
```think-action
action: create-task
template: daily
autoOpen: true
```
````

### 4. 统计代码块

显示数据统计信息：

````markdown
```think-stats
metric: task-completion
period: month
chart: bar
```
````

## 使用示例

### 初始化逻辑模块

```typescript
import { VaultWatcher, CodeblockEmbedder } from '@features/logic';

// 初始化库监控器
const vaultWatcher = new VaultWatcher(plugin, dataStore);
vaultWatcher.start();

// 初始化代码块嵌入器
const codeblockEmbedder = new CodeblockEmbedder(
    plugin,
    appStore,
    dataStore,
    rendererService,
    actionService
);
```

### 自定义代码块处理器

```typescript
// 定义处理器接口
interface CodeblockProcessor {
    language: string;
    process(
        source: string,
        el: HTMLElement,
        ctx: MarkdownPostProcessorContext
    ): Promise<void>;
}

// 实现自定义处理器
class CustomProcessor implements CodeblockProcessor {
    language = 'think-custom';
    
    async process(source: string, el: HTMLElement, ctx: MarkdownPostProcessorContext) {
        // 解析源代码
        const config = this.parseConfig(source);
        
        // 创建渲染内容
        const content = this.render(config);
        
        // 添加到元素
        el.appendChild(content);
    }
    
    private parseConfig(source: string): any {
        // 解析 YAML 或其他格式
        return yaml.parse(source);
    }
    
    private render(config: any): HTMLElement {
        const container = document.createElement('div');
        container.className = 'think-custom-block';
        // 添加内容
        return container;
    }
}

// 注册处理器
codeblockEmbedder.registerProcessor('think-custom', new CustomProcessor());
```

### 监听文件变化

```typescript
// 扩展 VaultWatcher 添加自定义逻辑
class ExtendedVaultWatcher extends VaultWatcher {
    protected async onFileModify(file: TAbstractFile) {
        await super.onFileModify(file);
        
        // 添加自定义处理
        if (file instanceof TFile && file.extension === 'md') {
            // 检查特定标签
            const content = await this.plugin.app.vault.read(file);
            if (content.includes('#daily-note')) {
                this.processDailyNote(file);
            }
        }
    }
    
    private processDailyNote(file: TFile) {
        // 处理日记文件
        console.log('Processing daily note:', file.path);
    }
}
```

## 数据流

### VaultWatcher 数据流

```
文件系统事件 -> VaultWatcher -> 文件解析 -> DataStore 更新 -> UI 刷新
```

### CodeblockEmbedder 数据流

```
Markdown 渲染 -> 代码块识别 -> 处理器匹配 -> 内容生成 -> DOM 插入
```

## 性能优化

### 1. 文件监控优化

- **防抖处理**：避免频繁的文件修改触发多次处理
- **批量更新**：累积多个文件变化后批量更新
- **增量解析**：仅解析变化的部分
- **缓存策略**：缓存解析结果，避免重复解析

```typescript
class OptimizedVaultWatcher extends VaultWatcher {
    private updateQueue: Set<TFile> = new Set();
    private updateTimer: number | null = null;
    
    protected onFileModify(file: TAbstractFile) {
        if (file instanceof TFile) {
            this.updateQueue.add(file);
            this.scheduleUpdate();
        }
    }
    
    private scheduleUpdate() {
        if (this.updateTimer) {
            clearTimeout(this.updateTimer);
        }
        
        this.updateTimer = window.setTimeout(() => {
            this.processBatch();
        }, 500); // 500ms 防抖
    }
    
    private async processBatch() {
        const files = Array.from(this.updateQueue);
        this.updateQueue.clear();
        
        // 批量处理
        await Promise.all(files.map(file => this.processFile(file)));
    }
}
```

### 2. 代码块渲染优化

- **懒加载**：仅渲染可视区域的代码块
- **虚拟滚动**：长列表使用虚拟滚动
- **异步渲染**：复杂内容异步渲染
- **缓存结果**：缓存渲染结果

## 配置选项

```typescript
interface LogicSettings {
    // VaultWatcher 设置
    vault: {
        enabled: boolean;
        scanOnStartup: boolean;
        filePatterns: string[];  // 要监控的文件模式
        excludePatterns: string[];  // 排除的文件模式
        debounceMs: number;  // 防抖延迟
    };
    
    // CodeblockEmbedder 设置
    codeblock: {
        enabled: boolean;
        processors: string[];  // 启用的处理器
        renderTimeout: number;  // 渲染超时
        cacheResults: boolean;  // 是否缓存结果
    };
}
```

## 错误处理

```typescript
// VaultWatcher 错误处理
class RobustVaultWatcher extends VaultWatcher {
    protected async processFile(file: TFile) {
        try {
            await super.processFile(file);
        } catch (error) {
            console.error(`Failed to process file ${file.path}:`, error);
            
            // 记录错误
            this.logError(file, error);
            
            // 通知用户
            new Notice(`处理文件失败: ${file.name}`);
            
            // 重试逻辑
            this.scheduleRetry(file);
        }
    }
}

// CodeblockEmbedder 错误处理
class RobustCodeblockEmbedder extends CodeblockEmbedder {
    async process(source: string, el: HTMLElement, ctx: MarkdownPostProcessorContext) {
        try {
            await super.process(source, el, ctx);
        } catch (error) {
            // 显示错误信息
            el.createEl('div', {
                text: '代码块渲染失败',
                cls: 'codeblock-error'
            });
            
            // 显示详细错误（开发模式）
            if (this.plugin.manifest.isDev) {
                el.createEl('pre', {
                    text: error.message,
                    cls: 'codeblock-error-detail'
                });
            }
        }
    }
}
```

## 测试

```typescript
describe('VaultWatcher', () => {
    it('should detect file changes', async () => {
        const watcher = new VaultWatcher(mockPlugin, mockDataStore);
        watcher.start();
        
        // 创建测试文件
        const file = await vault.create('test.md', '# Test');
        
        // 等待处理
        await new Promise(r => setTimeout(r, 100));
        
        // 验证数据更新
        expect(mockDataStore.has('test.md')).toBe(true);
    });
});

describe('CodeblockEmbedder', () => {
    it('should process custom codeblocks', async () => {
        const embedder = new CodeblockEmbedder(...deps);
        
        const el = document.createElement('div');
        const source = 'type: task\nstatus: pending';
        
        await embedder.process(source, el, mockContext);
        
        expect(el.querySelector('.think-query-result')).toBeTruthy();
    });
});
```

## 常见问题

### Q: 文件监控占用资源过多怎么办？

A: 可以：
- 增加防抖延迟
- 使用文件模式过滤
- 限制并发处理数
- 实现智能扫描策略

### Q: 代码块渲染失败怎么处理？

A: 建议：
- 提供降级方案
- 显示原始内容
- 记录错误日志
- 提供重试机制

### Q: 如何处理大文件？

A: 可以：
- 分块解析
- 流式处理
- 后台处理
- 进度提示

## 相关文档

- [Dashboard 功能](dashboard.md)
- [数据存储](../../ARCHITECTURE.md#datastore)
- [渲染服务](../../API.md#rendererservice)

---

*最后更新: 2024-10-07*
