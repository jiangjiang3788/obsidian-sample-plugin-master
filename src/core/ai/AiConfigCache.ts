// src/core/ai/AiConfigCache.ts
// AI 配置缓存 - TTL 缓存 snapshot，避免每次调用模型都重新拼大段 prompt

import type { ISettingsProvider } from '@/core/services/types';
import { buildAiConfigSnapshot, type AiConfigSnapshot } from './AiConfigSnapshot';

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
    getSnapshot(): AiConfigSnapshot {
        const settings = this.settingsProvider.getSettings();
        const ai = settings.aiSettings;
        
        if (!ai) {
            throw new Error('AI settings missing');
        }

        const ttlMs = (ai.configCacheTTLSeconds ?? 300) * 1000;
        const now = Date.now();

        // 检查缓存是否过期
        if (!this.snapshot || now - this.lastUpdated > ttlMs) {
            this.snapshot = buildAiConfigSnapshot(settings.inputSettings, ai);
            this.lastUpdated = now;
        }

        return this.snapshot;
    }

    /**
     * 使缓存失效
     * 下次调用 getSnapshot 时会重新构建
     */
    invalidate(): void {
        this.snapshot = null;
        this.lastUpdated = 0;
    }

    /**
     * 检查缓存是否有效
     */
    isValid(): boolean {
        if (!this.snapshot) return false;
        
        const settings = this.settingsProvider.getSettings();
        const ai = settings.aiSettings;
        if (!ai) return false;

        const ttlMs = (ai.configCacheTTLSeconds ?? 300) * 1000;
        return Date.now() - this.lastUpdated <= ttlMs;
    }
}
