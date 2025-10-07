# 性能优化指南

## 概述

Think OS 插件的性能优化涵盖了启动时间、运行时性能、内存管理和用户体验等多个方面。本文档提供了全面的性能优化策略和最佳实践。

## 性能监控

### 1. 性能指标收集

```typescript
// src/core/performance/PerformanceMonitor.ts
export class PerformanceMonitor {
    private metrics: Map<string, PerformanceMetric> = new Map();
    
    startMeasure(name: string) {
        this.metrics.set(name, {
            start: performance.now(),
            memory: performance.memory?.usedJSHeapSize
        });
    }
    
    endMeasure(name: string): PerformanceResult {
        const metric = this.metrics.get(name);
        if (!metric) return null;
        
        const result = {
            name,
            duration: performance.now() - metric.start,
            memoryDelta: performance.memory?.usedJSHeapSize - metric.memory,
            timestamp: Date.now()
        };
        
        this.metrics.delete(name);
        return result;
    }
    
    async measureAsync<T>(name: string, fn: () => Promise<T>): Promise<T> {
        this.startMeasure(name);
        try {
            const result = await fn();
            return result;
        } finally {
            const metric = this.endMeasure(name);
            console.log(`[Performance] ${name}: ${metric.duration.toFixed(2)}ms`);
        }
    }
}
```

### 2. 自动性能报告

```typescript
export class PerformanceReporter {
    private data: PerformanceData[] = [];
    
    collect(metric: PerformanceMetric) {
        this.data.push(metric);
        
        // 定期生成报告
        if (this.data.length >= 100) {
            this.generateReport();
        }
    }
    
    generateReport() {
        const report = {
            timestamp: Date.now(),
            metrics: this.aggregateMetrics(),
            slowOperations: this.findSlowOperations(),
            memoryLeaks: this.detectMemoryLeaks()
        };
        
        // 保存报告
        this.saveReport(report);
        this.data = [];
    }
    
    private aggregateMetrics() {
        const grouped = this.groupBy(this.data, 'name');
        return Object.entries(grouped).map(([name, metrics]) => ({
            name,
            count: metrics.length,
            avgDuration: this.average(metrics.map(m => m.duration)),
            maxDuration: Math.max(...metrics.map(m => m.duration)),
            minDuration: Math.min(...metrics.map(m => m.duration))
        }));
    }
}
```

## 启动优化

### 1. 延迟加载

```typescript
// 核心模块立即加载，功能模块延迟加载
export class PluginLoader {
    private coreModules = ['core', 'state', 'platform'];
    private featureModules = ['dashboard', 'settings', 'timer'];
    
    async loadCore() {
        // 加载核心模块
        for (const module of this.coreModules) {
            await import(`./src/${module}`);
        }
    }
    
    async loadFeatures() {
        // 延迟加载功能模块
        requestIdleCallback(() => {
            this.featureModules.forEach(async module => {
                await import(`./src/features/${module}`);
            });
        });
    }
}
```

### 2. 代码分割

```typescript
// 使用动态导入实现代码分割
export class LazyComponentLoader {
    private componentCache = new Map<string, any>();
    
    async loadComponent(name: string) {
        if (this.componentCache.has(name)) {
            return this.componentCache.get(name);
        }
        
        const component = await import(
            /* webpackChunkName: "[request]" */
            `./components/${name}`
        );
        
        this.componentCache.set(name, component);
        return component;
    }
}

// 使用示例
const SettingsPanel = lazy(() => import('./features/settings/SettingsPanel'));
```

### 3. 预加载策略

```typescript
export class PreloadManager {
    private preloadQueue: (() => Promise<any>)[] = [];
    
    registerPreload(loader: () => Promise<any>) {
        this.preloadQueue.push(loader);
    }
    
    async executePreloads() {
        // 在空闲时预加载
        for (const loader of this.preloadQueue) {
            await new Promise(resolve => {
                requestIdleCallback(async () => {
                    await loader();
                    resolve(void 0);
                });
            });
        }
    }
}
```

## 渲染优化

### 1. 虚拟滚动

```typescript
// 大列表虚拟滚动实现
export const VirtualList: FunctionalComponent<VirtualListProps> = ({
    items,
    itemHeight,
    containerHeight,
    renderItem
}) => {
    const [scrollTop, setScrollTop] = useState(0);
    
    const startIndex = Math.floor(scrollTop / itemHeight);
    const endIndex = Math.min(
        items.length - 1,
        Math.floor((scrollTop + containerHeight) / itemHeight)
    );
    
    const visibleItems = items.slice(startIndex, endIndex + 1);
    const totalHeight = items.length * itemHeight;
    const offsetY = startIndex * itemHeight;
    
    return (
        <div 
            className="virtual-list-container"
            style={{ height: containerHeight, overflow: 'auto' }}
            onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
        >
            <div style={{ height: totalHeight, position: 'relative' }}>
                <div style={{ transform: `translateY(${offsetY}px)` }}>
                    {visibleItems.map((item, index) => 
                        renderItem(item, startIndex + index)
                    )}
                </div>
            </div>
        </div>
    );
};
```

### 2. 组件记忆化

```typescript
// 使用 memo 优化组件
export const ExpensiveComponent = memo<Props>(({ data, onUpdate }) => {
    // 复杂的渲染逻辑
    const processedData = useMemo(() => 
        expensiveProcessing(data), [data]
    );
    
    const handleClick = useCallback((item) => {
        onUpdate(item);
    }, [onUpdate]);
    
    return (
        <div>
            {processedData.map(item => (
                <Item key={item.id} onClick={() => handleClick(item)} />
            ))}
        </div>
    );
}, (prevProps, nextProps) => {
    // 自定义比较逻辑
    return prevProps.data.id === nextProps.data.id;
});
```

### 3. 批量更新

```typescript
// 批量 DOM 更新
export class BatchRenderer {
    private updateQueue: (() => void)[] = [];
    private rafId: number | null = null;
    
    queueUpdate(update: () => void) {
        this.updateQueue.push(update);
        this.scheduleFlush();
    }
    
    private scheduleFlush() {
        if (this.rafId) return;
        
        this.rafId = requestAnimationFrame(() => {
            const updates = [...this.updateQueue];
            this.updateQueue = [];
            this.rafId = null;
            
            // 批量执行更新
            updates.forEach(update => update());
        });
    }
}
```

## 内存管理

### 1. 对象池

```typescript
// 复用对象减少 GC 压力
export class ObjectPool<T> {
    private pool: T[] = [];
    private factory: () => T;
    private reset: (obj: T) => void;
    private maxSize: number;
    
    constructor(
        factory: () => T,
        reset: (obj: T) => void,
        maxSize = 100
    ) {
        this.factory = factory;
        this.reset = reset;
        this.maxSize = maxSize;
    }
    
    acquire(): T {
        if (this.pool.length > 0) {
            return this.pool.pop()!;
        }
        return this.factory();
    }
    
    release(obj: T) {
        if (this.pool.length < this.maxSize) {
            this.reset(obj);
            this.pool.push(obj);
        }
    }
}

// 使用示例
const nodePool = new ObjectPool(
    () => ({ id: '', data: null, children: [] }),
    (node) => {
        node.id = '';
        node.data = null;
        node.children = [];
    }
);
```

### 2. 弱引用缓存

```typescript
// 使用 WeakMap 避免内存泄漏
export class WeakCache<K extends object, V> {
    private cache = new WeakMap<K, V>();
    
    get(key: K, factory: () => V): V {
        if (!this.cache.has(key)) {
            this.cache.set(key, factory());
        }
        return this.cache.get(key)!;
    }
    
    clear(key: K) {
        this.cache.delete(key);
    }
}

// 使用示例
const metadataCache = new WeakCache<TFile, FileMetadata>();
const metadata = metadataCache.get(file, () => parseFile(file));
```

### 3. 内存泄漏检测

```typescript
export class MemoryLeakDetector {
    private snapshots: MemorySnapshot[] = [];
    private interval: number;
    
    start(interval = 60000) {
        this.interval = window.setInterval(() => {
            this.takeSnapshot();
        }, interval);
    }
    
    stop() {
        if (this.interval) {
            clearInterval(this.interval);
        }
    }
    
    private takeSnapshot() {
        const snapshot = {
            timestamp: Date.now(),
            usedJSHeapSize: performance.memory?.usedJSHeapSize || 0,
            totalJSHeapSize: performance.memory?.totalJSHeapSize || 0
        };
        
        this.snapshots.push(snapshot);
        
        // 检测潜在的内存泄漏
        if (this.snapshots.length > 10) {
            const trend = this.calculateTrend();
            if (trend > 0.1) { // 10% 增长率
                console.warn('Potential memory leak detected', {
                    trend,
                    snapshots: this.snapshots.slice(-5)
                });
            }
        }
        
        // 保留最近 20 个快照
        if (this.snapshots.length > 20) {
            this.snapshots.shift();
        }
    }
    
    private calculateTrend(): number {
        const recent = this.snapshots.slice(-10);
        const start = recent[0].usedJSHeapSize;
        const end = recent[recent.length - 1].usedJSHeapSize;
        return (end - start) / start;
    }
}
```

## 数据处理优化

### 1. 防抖和节流

```typescript
// 防抖函数
export function debounce<T extends (...args: any[]) => any>(
    func: T,
    wait: number
): (...args: Parameters<T>) => void {
    let timeout: number | null = null;
    
    return function(this: any, ...args: Parameters<T>) {
        const context = this;
        
        if (timeout) clearTimeout(timeout);
        
        timeout = window.setTimeout(() => {
            func.apply(context, args);
            timeout = null;
        }, wait);
    };
}

// 节流函数
export function throttle<T extends (...args: any[]) => any>(
    func: T,
    limit: number
): (...args: Parameters<T>) => void {
    let inThrottle = false;
    
    return function(this: any, ...args: Parameters<T>) {
        const context = this;
        
        if (!inThrottle) {
            func.apply(context, args);
            inThrottle = true;
            
            setTimeout(() => {
                inThrottle = false;
            }, limit);
        }
    };
}

// 使用示例
const debouncedSearch = debounce(search, 300);
const throttledScroll = throttle(handleScroll, 100);
```

### 2. Web Worker 处理

```typescript
// 主线程
export class WorkerManager {
    private worker: Worker;
    private tasks = new Map<string, (result: any) => void>();
    
    constructor() {
        this.worker = new Worker('/worker.js');
        this.worker.onmessage = (e) => {
            const { id, result } = e.data;
            const callback = this.tasks.get(id);
            if (callback) {
                callback(result);
                this.tasks.delete(id);
            }
        };
    }
    
    async process<T>(data: any): Promise<T> {
        const id = Math.random().toString(36);
        
        return new Promise((resolve) => {
            this.tasks.set(id, resolve);
            this.worker.postMessage({ id, data });
        });
    }
}

// worker.js
self.onmessage = async (e) => {
    const { id, data } = e.data;
    
    // 执行计算密集型任务
    const result = await heavyComputation(data);
    
    self.postMessage({ id, result });
};
```

### 3. 索引优化

```typescript
// 建立索引加速查询
export class IndexedDataStore {
    private data: Map<string, Item> = new Map();
    private indices: Map<string, Map<any, Set<string>>> = new Map();
    
    addIndex(field: string) {
        this.indices.set(field, new Map());
        
        // 为现有数据建立索引
        for (const [id, item] of this.data) {
            this.updateIndex(field, id, item);
        }
    }
    
    add(id: string, item: Item) {
        this.data.set(id, item);
        
        // 更新所有索引
        for (const field of this.indices.keys()) {
            this.updateIndex(field, id, item);
        }
    }
    
    findBy(field: string, value: any): Item[] {
        const index = this.indices.get(field);
        if (!index) {
            // 无索引，全表扫描
            return Array.from(this.data.values()).filter(
                item => item[field] === value
            );
        }
        
        // 使用索引快速查找
        const ids = index.get(value) || new Set();
        return Array.from(ids).map(id => this.data.get(id)!);
    }
    
    private updateIndex(field: string, id: string, item: Item) {
        const index = this.indices.get(field)!;
        const value = item[field];
        
        if (!index.has(value)) {
            index.set(value, new Set());
        }
        index.get(value)!.add(id);
    }
}
```

## 网络优化

### 1. 请求缓存

```typescript
export class RequestCache {
    private cache = new Map<string, CacheEntry>();
    private maxAge = 5 * 60 * 1000; // 5分钟
    
    async fetch(url: string, options?: RequestInit): Promise<Response> {
        const key = this.getCacheKey(url, options);
        const cached = this.cache.get(key);
        
        if (cached && Date.now() - cached.timestamp < this.maxAge) {
            return cached.response.clone();
        }
        
        const response = await fetch(url, options);
        
        if (response.ok) {
            this.cache.set(key, {
                response: response.clone(),
                timestamp: Date.now()
            });
        }
        
        return response;
    }
    
    private getCacheKey(url: string, options?: RequestInit): string {
        return `${options?.method || 'GET'}:${url}`;
    }
    
    clear() {
        this.cache.clear();
    }
}
```

### 2. 请求合并

```typescript
export class RequestBatcher {
    private pending = new Map<string, Promise<any>>();
    
    async request<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
        // 如果有相同的请求正在进行，复用它
        if (this.pending.has(key)) {
            return this.pending.get(key);
        }
        
        const promise = fetcher().finally(() => {
            this.pending.delete(key);
        });
        
        this.pending.set(key, promise);
        return promise;
    }
}

// 使用示例
const batcher = new RequestBatcher();
// 这些请求会被合并
const user1 = await batcher.request('user:123', () => fetchUser(123));
const user2 = await batcher.request('user:123', () => fetchUser(123));
```

## 构建优化

### Vite 配置

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig({
    build: {
        // 代码分割
        rollupOptions: {
            output: {
                manualChunks: {
                    'vendor': ['preact', 'tsyringe'],
                    'utils': ['dayjs', 'yaml'],
                }
            }
        },
        
        // 压缩选项
        minify: 'terser',
        terserOptions: {
            compress: {
                drop_console: true,
                drop_debugger: true
            }
        },
        
        // 块大小警告
        chunkSizeWarningLimit: 500
    },
    
    // 优化依赖
    optimizeDeps: {
        include: ['preact', 'tsyringe'],
        exclude: ['obsidian']
    },
    
    plugins: [
        // 包分析
        visualizer({
            open: true,
            gzipSize: true,
            brotliSize: true
        })
    ]
});
```

## 性能测试

```typescript
// 性能测试工具
export class PerformanceTester {
    async runBenchmark(name: string, fn: () => void, iterations = 1000) {
        const results: number[] = [];
        
        // 预热
        for (let i = 0; i < 10; i++) {
            fn();
        }
        
        // 测试
        for (let i = 0; i < iterations; i++) {
            const start = performance.now();
            fn();
            const end = performance.now();
            results.push(end - start);
        }
        
        // 统计
        return {
            name,
            iterations,
            avg: this.average(results),
            min: Math.min(...results),
            max: Math.max(...results),
            median: this.median(results),
            p95: this.percentile(results, 95),
            p99: this.percentile(results, 99)
        };
    }
}
```

## 最佳实践

1. **测量优先**：在优化前先测量，确定性能瓶颈
2. **渐进优化**：先解决最大的性能问题
3. **用户体验优先**：优先优化用户可感知的性能
4. **持续监控**：建立性能监控和报告机制
5. **避免过早优化**：保持代码可读性和可维护性

## 相关文档

- [插件架构](ARCHITECTURE.md)
- [测试指南](TESTING.md)
- [Vite 官方文档](https://vitejs.dev/)

---

*最后更新: 2024-10-07*
