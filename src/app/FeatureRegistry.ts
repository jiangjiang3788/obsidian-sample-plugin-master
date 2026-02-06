// src/app/FeatureRegistry.ts
/**
 * FeatureRegistry
 *
 * 目标：把“特性加载/启动”从硬编码的 if/else/散落 setTimeout 里收拢成一个可注册/可编排的体系。
 *
 * 设计原则：
 * - ✅ app 层可用（composition root / boot orchestration）
 * - ✅ 不强依赖具体 feature 实现（只管理生命周期）
 * - ✅ 支持 blocking + background（延迟启动）两种模式，便于优化首屏
 */

export type FeatureBootMode = 'blocking' | 'background';

export interface Feature<C> {
  /** 全局唯一 ID（用于日志/调试/开关） */
  id: string;

  /** 可选描述信息 */
  description?: string;

  /**
   * 启动模式：
   * - blocking   : bootAll 会 await 它（适合关键路径，比如依赖数据扫描的 Dashboard）
   * - background : 通过 setTimeout 调度，不阻塞 bootAll 返回
   */
  bootMode?: FeatureBootMode;

  /** background 模式下延迟多少毫秒启动（默认 0） */
  delayMs?: number;

  /** 启动入口 */
  boot: (ctx: C) => void | Promise<void>;
}

export interface FeatureBootResult {
  id: string;
  status: 'ok' | 'error' | 'scheduled';
  error?: unknown;
  durationMs?: number;
}

export interface FeatureRegistryOptions {
  /**
   * 统一错误钩子：不会抛出，交给调用方（FeatureLoader/ServiceManager）决定如何记录。
   */
  onError?: (info: { id: string; error: unknown }) => void;
}

export class FeatureRegistry<C> {
  private readonly features: Feature<C>[] = [];
  private readonly scheduledTimers = new Set<ReturnType<typeof setTimeout>>();
  private disposed = false;

  /**
   * 释放所有尚未触发的 background 定时任务。
   *
   * 典型场景：Obsidian 插件在启动后短时间内被禁用/卸载。
   * 如果不清理，setTimeout 仍可能在 unload 后触发，访问已销毁的 plugin/DOM。
   */
  dispose(): void {
    this.disposed = true;
    for (const t of this.scheduledTimers) {
      try {
        clearTimeout(t);
      } catch {
        // ignore
      }
    }
    this.scheduledTimers.clear();
  }

  register(feature: Feature<C>): void {
    if (!feature?.id) throw new Error('FeatureRegistry.register(): feature.id is required');
    if (this.features.some((f) => f.id === feature.id)) {
      throw new Error(`FeatureRegistry.register(): duplicate feature id '${feature.id}'`);
    }
    this.features.push(feature);
  }

  list(): Feature<C>[] {
    return [...this.features];
  }

  /**
   * 启动所有已注册 features。
   * - blocking：依次 await
   * - background：setTimeout 调度，不阻塞返回
   */
  async bootAll(ctx: C, options: FeatureRegistryOptions = {}): Promise<FeatureBootResult[]> {
    const results: FeatureBootResult[] = [];

    for (const feature of this.features) {
      const bootMode: FeatureBootMode = feature.bootMode ?? 'blocking';
      const delayMs = Math.max(0, feature.delayMs ?? 0);

      if (bootMode === 'background') {
        // background: schedule and move on
        let timer: ReturnType<typeof setTimeout> | undefined;
        timer = setTimeout(() => {
          if (timer) this.scheduledTimers.delete(timer);
          if (this.disposed) return;
          try {
            Promise.resolve(feature.boot(ctx)).catch((error) => {
              options.onError?.({ id: feature.id, error });
            });
          } catch (error) {
            options.onError?.({ id: feature.id, error });
          }
        }, delayMs);

        // 若 registry 已被 dispose，则不再保留悬挂定时器。
        if (timer && !this.disposed) {
          this.scheduledTimers.add(timer);
        }

        results.push({ id: feature.id, status: 'scheduled' });
        continue;
      }

      // blocking: await and capture
      const start = Date.now();
      try {
        await feature.boot(ctx);
        results.push({ id: feature.id, status: 'ok', durationMs: Date.now() - start });
      } catch (error) {
        options.onError?.({ id: feature.id, error });
        results.push({ id: feature.id, status: 'error', error, durationMs: Date.now() - start });
        // 不中断后续 feature；registry 只负责编排，是否 fail-fast 交给调用方。
      }
    }

    return results;
  }
}
