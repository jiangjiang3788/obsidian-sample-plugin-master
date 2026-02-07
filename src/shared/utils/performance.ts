/**
 * 性能监控工具
 * 提供性能指标收集、分析和报告功能
 */

import { errorHandler } from './errorHandler';
import { devLog } from '@core/public';

/**
 * 性能指标数据结构
 */
export interface PerformanceMetric {
    name: string;                // 指标名称
    samples: number[];           // 样本数据（毫秒）
    count: number;               // 调用次数
    min: number;                 // 最小值
    max: number;                 // 最大值
    avg: number;                 // 平均值
    median: number;              // 中位数
    p95: number;                 // 95分位数
    p99: number;                 // 99分位数
    totalTime: number;           // 总耗时
    lastUpdated: number;         // 最后更新时间
}

/**
 * 性能报告
 */
export interface PerformanceReport {
    timestamp: number;
    metrics: PerformanceMetric[];
    summary: {
        totalOperations: number;
        totalTime: number;
        averageTime: number;
        slowestOperation: string;
        fastestOperation: string;
    };
}

/**
 * 性能监控配置
 */
export interface PerformanceMonitorConfig {
    maxSamples?: number;         // 每个指标保留的最大样本数
    warningThreshold?: number;   // 警告阈值（毫秒）
    errorThreshold?: number;     // 错误阈值（毫秒）
    autoReport?: boolean;        // 自动生成报告
    reportInterval?: number;     // 报告间隔（毫秒）
}

/**
 * 性能监控器单例类
 */
export class PerformanceMonitor {
    private static instance: PerformanceMonitor;
    private metrics: Map<string, PerformanceMetric> = new Map();
    private config: Required<PerformanceMonitorConfig>;
    private reportTimer: number | null = null;

    private constructor(config: PerformanceMonitorConfig = {}) {
        this.config = {
            maxSamples: config.maxSamples ?? 100,
            warningThreshold: config.warningThreshold ?? 1000,
            errorThreshold: config.errorThreshold ?? 5000,
            autoReport: config.autoReport ?? false,
            reportInterval: config.reportInterval ?? 60000 // 1分钟
        };

        if (this.config.autoReport) {
            this.startAutoReport();
        }
    }

    /**
     * 获取性能监控器实例
     */
    public static getInstance(config?: PerformanceMonitorConfig): PerformanceMonitor {
        if (!PerformanceMonitor.instance) {
            PerformanceMonitor.instance = new PerformanceMonitor(config);
        }
        return PerformanceMonitor.instance;
    }

    /**
     * 开始测量性能
     * 
     * @param name - 操作名称
     * @returns 停止测量的函数
     * 
     * @example
     * const stopMeasure = performanceMonitor.startMeasure('fetchData');
     * await fetchData();
     * const duration = stopMeasure();
     */
    public startMeasure(name: string): () => number {
        const startTime = performance.now();
        const startMark = `${name}-start-${Date.now()}`;
        
        // 使用 Performance API 标记
        if (typeof performance.mark === 'function') {
            try {
                performance.mark(startMark);
            } catch (e) {
                // 忽略标记错误
            }
        }

        return () => {
            const endTime = performance.now();
            const duration = endTime - startTime;
            
            // 记录指标
            this.recordMetric(name, duration);
            
            // 检查阈值并发出警告
            this.checkThreshold(name, duration);
            
            // 使用 Performance API 测量
            if (typeof performance.measure === 'function') {
                try {
                    const endMark = `${name}-end-${Date.now()}`;
                    performance.mark(endMark);
                    performance.measure(name, startMark, endMark);
                } catch (e) {
                    // 忽略测量错误
                }
            }
            
            return duration;
        };
    }

    /**
     * 测量异步函数性能
     * 
     * @param name - 操作名称
     * @param fn - 异步函数
     * @returns 函数结果
     * 
     * @example
     * const data = await performanceMonitor.measureAsync('fetchData', async () => {
     *     return await fetch('/api/data');
     * });
     */
    public async measureAsync<T>(
        name: string,
        fn: () => Promise<T>
    ): Promise<T> {
        const stop = this.startMeasure(name);
        try {
            const result = await fn();
            stop();
            return result;
        } catch (error) {
            stop();
            throw error;
        }
    }

    /**
     * 测量同步函数性能
     * 
     * @param name - 操作名称
     * @param fn - 同步函数
     * @returns 函数结果
     */
    public measure<T>(name: string, fn: () => T): T {
        const stop = this.startMeasure(name);
        try {
            const result = fn();
            stop();
            return result;
        } catch (error) {
            stop();
            throw error;
        }
    }

    /**
     * 记录性能指标
     */
    private recordMetric(name: string, duration: number): void {
        let metric = this.metrics.get(name);

        if (!metric) {
            metric = {
                name,
                samples: [],
                count: 0,
                min: Infinity,
                max: -Infinity,
                avg: 0,
                median: 0,
                p95: 0,
                p99: 0,
                totalTime: 0,
                lastUpdated: Date.now()
            };
            this.metrics.set(name, metric);
        }

        // 添加样本
        metric.samples.push(duration);
        metric.count++;
        metric.totalTime += duration;
        metric.lastUpdated = Date.now();

        // 保持样本数量限制
        if (metric.samples.length > this.config.maxSamples) {
            metric.samples.shift();
        }

        // 更新统计数据
        this.updateMetricStats(metric);
    }

    /**
     * 更新指标统计数据
     */
    private updateMetricStats(metric: PerformanceMetric): void {
        const sorted = [...metric.samples].sort((a, b) => a - b);
        
        metric.min = Math.min(...sorted);
        metric.max = Math.max(...sorted);
        metric.avg = metric.totalTime / metric.count;
        metric.median = this.calculatePercentile(sorted, 50);
        metric.p95 = this.calculatePercentile(sorted, 95);
        metric.p99 = this.calculatePercentile(sorted, 99);
    }

    /**
     * 计算百分位数
     */
    private calculatePercentile(sorted: number[], percentile: number): number {
        if (sorted.length === 0) return 0;
        
        const index = Math.ceil((percentile / 100) * sorted.length) - 1;
        return sorted[Math.max(0, index)];
    }

    /**
     * 检查性能阈值
     */
    private checkThreshold(name: string, duration: number): void {
        if (duration >= this.config.errorThreshold) {
            console.error(
                `[Performance] SLOW: ${name} took ${duration.toFixed(2)}ms (threshold: ${this.config.errorThreshold}ms)`
            );
        } else if (duration >= this.config.warningThreshold) {
            console.warn(
                `[Performance] Warning: ${name} took ${duration.toFixed(2)}ms (threshold: ${this.config.warningThreshold}ms)`
            );
        }
    }

    /**
     * 获取单个指标
     */
    public getMetric(name: string): PerformanceMetric | undefined {
        return this.metrics.get(name);
    }

    /**
     * 获取所有指标
     */
    public getAllMetrics(): PerformanceMetric[] {
        return Array.from(this.metrics.values());
    }

    /**
     * 生成性能报告
     */
    public generateReport(): PerformanceReport {
        const metrics = this.getAllMetrics();
        
        let totalOperations = 0;
        let totalTime = 0;
        let slowestOperation = '';
        let fastestOperation = '';
        let slowestTime = -Infinity;
        let fastestTime = Infinity;

        metrics.forEach(metric => {
            totalOperations += metric.count;
            totalTime += metric.totalTime;

            if (metric.avg > slowestTime) {
                slowestTime = metric.avg;
                slowestOperation = metric.name;
            }

            if (metric.avg < fastestTime) {
                fastestTime = metric.avg;
                fastestOperation = metric.name;
            }
        });

        return {
            timestamp: Date.now(),
            metrics,
            summary: {
                totalOperations,
                totalTime,
                averageTime: totalOperations > 0 ? totalTime / totalOperations : 0,
                slowestOperation,
                fastestOperation
            }
        };
    }

    /**
     * 打印性能报告
     */
    public printReport(): void {
        const report = this.generateReport();

        // dev-only 输出：避免污染用户日志
        // 结构化数据直接打印对象，方便在 DevTools 中展开查看
        devLog('📊 Performance Report', {
            generatedAt: new Date(report.timestamp).toLocaleString(),
            summary: {
                ...report.summary,
                totalTime: Number(report.summary.totalTime.toFixed(2)),
                averageTime: Number(report.summary.averageTime.toFixed(2)),
            },
            metrics: report.metrics.map(m => ({
                name: m.name,
                count: m.count,
                avgMs: Number(m.avg.toFixed(2)),
                minMs: Number(m.min.toFixed(2)),
                maxMs: Number(m.max.toFixed(2)),
                p95Ms: Number(m.p95.toFixed(2)),
                p99Ms: Number(m.p99.toFixed(2)),
            })),
        });
    }

    /**
     * 导出报告为 JSON
     */
    public exportReport(): string {
        const report = this.generateReport();
        return JSON.stringify(report, null, 2);
    }

    /**
     * 清除所有指标
     */
    public clearMetrics(): void {
        this.metrics.clear();
    }

    /**
     * 清除特定指标
     */
    public clearMetric(name: string): void {
        this.metrics.delete(name);
    }

    /**
     * 开始自动报告
     */
    private startAutoReport(): void {
        if (this.reportTimer !== null) return;

        this.reportTimer = window.setInterval(() => {
            this.printReport();
        }, this.config.reportInterval);
    }

    /**
     * 停止自动报告
     */
    public stopAutoReport(): void {
        if (this.reportTimer !== null) {
            clearInterval(this.reportTimer);
            this.reportTimer = null;
        }
    }

    /**
     * 更新配置
     */
    public updateConfig(config: Partial<PerformanceMonitorConfig>): void {
        this.config = { ...this.config, ...config };

        if (config.autoReport !== undefined) {
            if (config.autoReport) {
                this.startAutoReport();
            } else {
                this.stopAutoReport();
            }
        }
    }

    /**
     * 获取慢操作（超过阈值）
     */
    public getSlowOperations(threshold?: number): PerformanceMetric[] {
        const limit = threshold ?? this.config.warningThreshold;
        return this.getAllMetrics().filter(m => m.avg >= limit);
    }

    /**
     * 获取 Top N 慢操作
     */
    public getTopSlowOperations(n: number = 10): PerformanceMetric[] {
        return this.getAllMetrics()
            .sort((a, b) => b.avg - a.avg)
            .slice(0, n);
    }

    /**
     * 重置统计数据
     */
    public reset(): void {
        this.clearMetrics();
        this.stopAutoReport();
    }
}

/**
 * 便捷函数：获取性能监控器实例
 */
export const performanceMonitor = PerformanceMonitor.getInstance();

/**
 * 便捷函数：开始测量
 */
export function startMeasure(name: string): () => number {
    return performanceMonitor.startMeasure(name);
}

/**
 * 便捷函数：测量异步函数
 */
export async function measureAsync<T>(
    name: string,
    fn: () => Promise<T>
): Promise<T> {
    return performanceMonitor.measureAsync(name, fn);
}

/**
 * 便捷函数：测量同步函数
 */
export function measure<T>(name: string, fn: () => T): T {
    return performanceMonitor.measure(name, fn);
}

/**
 * 装饰器：测量方法性能（实验性）
 */
export function Measure(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    const className = target.constructor.name;
    const methodName = `${className}.${propertyKey}`;

    descriptor.value = async function (...args: any[]) {
        const stop = performanceMonitor.startMeasure(methodName);
        try {
            const result = await originalMethod.apply(this, args);
            stop();
            return result;
        } catch (error) {
            stop();
            throw error;
        }
    };

    return descriptor;
}
