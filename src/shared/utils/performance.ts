/**
 * Lightweight performance monitoring utilities.
 *
 * Keep this module focused on the APIs used by the app bootstrap path:
 * startMeasure, measure/measureAsync, metric inspection, and reset.
 *
 * Deliberately avoids Performance API marks/measures and background timers;
 * Obsidian plugin bootstrap only needs lightweight in-memory timings.
 */
import { devError, devWarn } from '@core/utils/public';

export interface PerformanceMetric {
    name: string;
    samples: number[];
    count: number;
    min: number;
    max: number;
    avg: number;
    median: number;
    p95: number;
    p99: number;
    totalTime: number;
    lastUpdated: number;
}

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

export interface PerformanceMonitorConfig {
    maxSamples?: number;
    warningThreshold?: number;
    errorThreshold?: number;
}

const DEFAULT_CONFIG: Required<PerformanceMonitorConfig> = {
    maxSamples: 100,
    warningThreshold: 1000,
    errorThreshold: 5000,
};

const now = (): number => (
    typeof performance !== 'undefined' && typeof performance.now === 'function'
        ? performance.now()
        : Date.now()
);

function percentile(sorted: number[], pct: number): number {
    if (!sorted.length) return 0;
    const index = Math.max(0, Math.ceil((pct / 100) * sorted.length) - 1);
    return sorted[index] ?? 0;
}

function createMetric(name: string): PerformanceMetric {
    return {
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
        lastUpdated: Date.now(),
    };
}

function summarize(metrics: PerformanceMetric[]): PerformanceReport['summary'] {
    let totalOperations = 0;
    let totalTime = 0;
    let slowestOperation = '';
    let fastestOperation = '';
    let slowestAvg = -Infinity;
    let fastestAvg = Infinity;

    for (const metric of metrics) {
        totalOperations += metric.count;
        totalTime += metric.totalTime;

        if (metric.avg > slowestAvg) {
            slowestAvg = metric.avg;
            slowestOperation = metric.name;
        }
        if (metric.avg < fastestAvg) {
            fastestAvg = metric.avg;
            fastestOperation = metric.name;
        }
    }

    return {
        totalOperations,
        totalTime,
        averageTime: totalOperations > 0 ? totalTime / totalOperations : 0,
        slowestOperation,
        fastestOperation,
    };
}

export class PerformanceMonitor {
    private static instance: PerformanceMonitor;
    private readonly metrics = new Map<string, PerformanceMetric>();
    private config: Required<PerformanceMonitorConfig>;

    private constructor(config: PerformanceMonitorConfig = {}) {
        this.config = { ...DEFAULT_CONFIG, ...config };
    }

    public static getInstance(config?: PerformanceMonitorConfig): PerformanceMonitor {
        if (!PerformanceMonitor.instance) {
            PerformanceMonitor.instance = new PerformanceMonitor(config);
        } else if (config) {
            PerformanceMonitor.instance.updateConfig(config);
        }
        return PerformanceMonitor.instance;
    }

    public startMeasure(name: string): () => number {
        const startTime = now();

        return () => {
            const duration = now() - startTime;
            this.recordMetric(name, duration);
            this.checkThreshold(name, duration);
            return duration;
        };
    }

    public async measureAsync<T>(name: string, fn: () => Promise<T>): Promise<T> {
        const stop = this.startMeasure(name);
        try {
            return await fn();
        } finally {
            stop();
        }
    }

    public measure<T>(name: string, fn: () => T): T {
        const stop = this.startMeasure(name);
        try {
            return fn();
        } finally {
            stop();
        }
    }

    public getMetric(name: string): PerformanceMetric | undefined {
        return this.metrics.get(name);
    }

    public getAllMetrics(): PerformanceMetric[] {
        return Array.from(this.metrics.values());
    }

    public generateReport(): PerformanceReport {
        const metrics = this.getAllMetrics();
        return {
            timestamp: Date.now(),
            metrics,
            summary: summarize(metrics),
        };
    }

    public clearMetrics(): void {
        this.metrics.clear();
    }

    public clearMetric(name: string): void {
        this.metrics.delete(name);
    }

    public stopAutoReport(): void {
        // Retained as a no-op compatibility method. Auto-report timers were removed
        // because the plugin only uses explicit bootstrap measurements.
    }

    public updateConfig(config: Partial<PerformanceMonitorConfig>): void {
        this.config = { ...this.config, ...config };
    }

    public getSlowOperations(threshold?: number): PerformanceMetric[] {
        const limit = threshold ?? this.config.warningThreshold;
        return this.getAllMetrics().filter(metric => metric.avg >= limit);
    }

    public getTopSlowOperations(n: number = 10): PerformanceMetric[] {
        return this.getAllMetrics()
            .sort((a, b) => b.avg - a.avg)
            .slice(0, n);
    }

    public reset(): void {
        this.clearMetrics();
    }

    private recordMetric(name: string, duration: number): void {
        const metric = this.metrics.get(name) ?? createMetric(name);
        metric.samples.push(duration);
        metric.count += 1;
        metric.totalTime += duration;
        metric.lastUpdated = Date.now();

        if (metric.samples.length > this.config.maxSamples) {
            metric.samples.splice(0, metric.samples.length - this.config.maxSamples);
        }

        this.updateMetricStats(metric);
        this.metrics.set(name, metric);
    }

    private updateMetricStats(metric: PerformanceMetric): void {
        const sorted = [...metric.samples].sort((a, b) => a - b);
        metric.min = sorted[0] ?? 0;
        metric.max = sorted[sorted.length - 1] ?? 0;
        metric.avg = metric.totalTime / metric.count;
        metric.median = percentile(sorted, 50);
        metric.p95 = percentile(sorted, 95);
        metric.p99 = percentile(sorted, 99);
    }

    private checkThreshold(name: string, duration: number): void {
        if (duration >= this.config.errorThreshold) {
            devError(`[Performance] SLOW: ${name} took ${duration.toFixed(2)}ms (threshold: ${this.config.errorThreshold}ms)`);
            return;
        }
        if (duration >= this.config.warningThreshold) {
            devWarn(`[Performance] Warning: ${name} took ${duration.toFixed(2)}ms (threshold: ${this.config.warningThreshold}ms)`);
        }
    }
}

export const performanceMonitor = PerformanceMonitor.getInstance();

export function startMeasure(name: string): () => number {
    return performanceMonitor.startMeasure(name);
}

export async function measureAsync<T>(name: string, fn: () => Promise<T>): Promise<T> {
    return performanceMonitor.measureAsync(name, fn);
}

export function measure<T>(name: string, fn: () => T): T {
    return performanceMonitor.measure(name, fn);
}
