import { SerialTaskQueue } from './SerialTaskQueue';

/** Owns readiness, serialization and commit-before-publication, independently of UI/DI. */
export class DurableSnapshot<T> {
  private current: T | undefined;
  private ready = false;
  private loading: Promise<T> | null = null;
  private readonly queue = new SerialTaskQueue();

  constructor(private readonly io: {
    load: () => Promise<T>;
    save: (snapshot: T) => Promise<void>;
    committed?: (before: T | undefined, after: T) => void;
  }) {}

  private publish(before: T | undefined, after: T): void {
    try { this.io.committed?.(before, after); } catch { /* committed IO is not undone by an observer */ }
  }

  load(): Promise<T> {
    if (this.ready) return Promise.resolve(this.get());
    if (this.loading) return this.loading;
    this.loading = this.queue.run(async () => {
      const next = await this.io.load();
      this.current = next;
      this.ready = true;
      this.publish(undefined, next);
      return next;
    });
    const pending = this.loading;
    void pending.then(() => { this.loading = null; }, () => { this.loading = null; });
    return pending;
  }

  get(): T {
    if (!this.ready) throw new Error('设置尚未加载，请先完成加载。');
    return this.current as T;
  }

  update(build: (current: T) => T): Promise<T> {
    return this.queue.run(async () => {
      const before = this.get();
      const next = build(before);
      if (next === before) return before;
      await this.io.save(next);
      this.current = next;
      this.publish(before, next);
      return next;
    });
  }

  /** Whole-snapshot saves must not silently overwrite a queued newer update. */
  replace(snapshot: T): Promise<T> {
    const expected = this.get();
    return this.update((current) => {
      if (current !== expected) throw new Error('settings_stale_snapshot: 设置已变化，请重新读取后保存。');
      return snapshot;
    });
  }
}
