// src/core/ai/AiConfigCache.ts
// AI 配置缓存 - TTL 缓存 snapshot，避免每次调用模型都重新拼大段 prompt

import type { ISettingsProvider } from '@/core/services/types';
import { buildAiConfigSnapshot, type AiConfigSnapshot } from './AiConfigSnapshot';
import { devLog, devWarn } from '../utils/devLogger';

function nowMs(): number {
    try {
        return performance.now();
    } catch {
        return Date.now();
    }
}

function elapsedMs(start: number): string {
    return `${(nowMs() - start).toFixed(2)}ms`;
}

/**
 * AI 配置缓存
 * 提供 TTL 缓存机制，避免频繁重建配置快照
 */
export class AiConfigCache {
    private snapshot: AiConfigSnapshot | null = null;
    private lastUpdated = 0;

    constructor(private settingsProvider: ISettingsProvider) {}

    /**
     * 获取配置快照
     * 如果缓存有效则返回缓存，否则重新构建
     */
    getSnapshot(traceId?: string): AiConfigSnapshot {
        const totalStart = nowMs();
        const prefix = traceId ? `[AiInput][${traceId}][ConfigCache]` : '[AiInput][ConfigCache]';

        const settingsStart = nowMs();
        const settings = this.settingsProvider.getSettings();
        const ai = settings.aiSettings;
        devLog(`${prefix} 读取 settings 完成 (${elapsedMs(settingsStart)})`);
        
        if (!ai) {
            throw new Error('AI settings missing');
        }

        const ttlMs = (ai.configCacheTTLSeconds ?? 300) * 1000;
        const now = Date.now();
        const cacheAgeMs = this.snapshot ? now - this.lastUpdated : null;
        const cacheHit = !!this.snapshot && cacheAgeMs !== null && cacheAgeMs <= ttlMs;

        devLog(`${prefix} 缓存状态检查完成 (${elapsedMs(totalStart)})`, {
            cacheHit,
            ttlMs,
            cacheAgeMs,
        });

        // 检查缓存是否过期
        if (!cacheHit) {
            const rebuildStart = nowMs();
            this.snapshot = buildAiConfigSnapshot(settings.inputSettings, ai);
            this.lastUpdated = now;
            devLog(`${prefix} buildAiConfigSnapshot 完成 (${elapsedMs(rebuildStart)})`, {
                blocksCount: this.snapshot.blocks?.length ?? 0,
                themesCount: this.snapshot.themes?.length ?? 0,
            });
            if (nowMs() - rebuildStart >= 50) {
                devWarn(`${prefix} 慢步骤: buildAiConfigSnapshot (${elapsedMs(rebuildStart)})`, {
                    blocksCount: this.snapshot.blocks?.length ?? 0,
                    themesCount: this.snapshot.themes?.length ?? 0,
                });
            }
        }

        devLog(`${prefix} getSnapshot 返回 (${elapsedMs(totalStart)})`, {
            cacheHit,
            blocksCount: this.snapshot.blocks?.length ?? 0,
            themesCount: this.snapshot.themes?.length ?? 0,
        });
        return this.snapshot;
    }

    /**
     * 使缓存失效
     * 下次调用 getSnapshot 时会重新构建
     */
    invalidate(): void {
        devLog('[AiInput][ConfigCache] invalidate called');
        this.snapshot = null;
        this.lastUpdated = 0;
    }

    /**
     * 检查缓存是否有效
     */
    isValid(): boolean {
        const start = nowMs();
        if (!this.snapshot) {
            devLog(`[AiInput][ConfigCache] isValid=false: snapshot missing (${elapsedMs(start)})`);
            return false;
        }
        
        const settings = this.settingsProvider.getSettings();
        const ai = settings.aiSettings;
        if (!ai) {
            devLog(`[AiInput][ConfigCache] isValid=false: ai settings missing (${elapsedMs(start)})`);
            return false;
        }

        const ttlMs = (ai.configCacheTTLSeconds ?? 300) * 1000;
        const valid = Date.now() - this.lastUpdated <= ttlMs;
        devLog(`[AiInput][ConfigCache] isValid=${valid} (${elapsedMs(start)})`, {
            ttlMs,
            cacheAgeMs: Date.now() - this.lastUpdated,
        });
        return valid;
    }
}
