import { SerialTaskQueue } from './SerialTaskQueue';

export interface TextFileStore {
  readFile(path: string): Promise<string | null>;
  writeFile(path: string, content: string): Promise<void>;
  deleteFile(path: string): Promise<void>;
}

export class JsonStorageError extends Error {
  constructor(public readonly code: 'invalid_json' | 'recovery_required' | 'external_change' | 'verify_failed', public readonly path: string) {
    super(`${code}: ${path}。已阻止覆盖；请保留原文件、.pending 和 Think/Backups/storage 中的副本后检查。`);
    this.name = 'JsonStorageError';
  }
}

export function parseStoredJson(text: string, path: string): unknown {
  try {
    const value: unknown = JSON.parse(text.replace(/^\uFEFF/, ''));
    // null is the API sentinel for a genuinely absent file, never a valid payload.
    if (value === null) throw new Error('null payload');
    return value;
  } catch { throw new JsonStorageError('invalid_json', path); }
}

export function previousJsonPath(path: string): string {
  return `Think/Backups/storage/${encodeURIComponent(path)}.previous.json`;
}

/**
 * Shared durable JSON boundary. A journal + verified previous copy provides recovery
 * evidence, not a claim of filesystem atomicity or cross-device synchronization.
 * Corruption and incomplete writes never mean "first run".
 */
export class DurableJsonStore {
  private readonly queues = new Map<string, SerialTaskQueue>();
  private readonly observed = new Map<string, string | null>();

  constructor(private readonly files: TextFileStore, private readonly durablePaths: ReadonlySet<string>) {}

  private queue(path: string): SerialTaskQueue {
    let queue = this.queues.get(path);
    if (!queue) { queue = new SerialTaskQueue(); this.queues.set(path, queue); }
    return queue;
  }

  private async readChecked(path: string): Promise<string | null> {
    const text = await this.files.readFile(path);
    if (this.durablePaths.has(path)) {
      const pending = await this.files.readFile(`${path}.pending`);
      if (pending !== null && pending !== text) throw new JsonStorageError('recovery_required', path);
      if (text === null && await this.files.readFile(previousJsonPath(path)) !== null) {
        throw new JsonStorageError('recovery_required', path);
      }
    }
    if (text !== null) parseStoredJson(text, path);
    return text;
  }

  async readJSON<T = unknown>(path: string): Promise<T | null> {
    return this.queue(path).run(async () => {
      const text = await this.readChecked(path);
      // Reading again is an explicit refresh, not permission for a stale writer to overwrite.
      this.observed.set(path, text);
      return text === null ? null : parseStoredJson(text, path) as T;
    });
  }

  async writeJSON(path: string, value: unknown): Promise<void> {
    const text = JSON.stringify(value, null, 2);
    if (typeof text !== 'string') throw new JsonStorageError('invalid_json', path);
    parseStoredJson(text, path); // Snapshot before awaiting; never retain the mutable caller object.
    return this.queue(path).run(async () => {
      const durable = this.durablePaths.has(path);
      const before = await this.readChecked(path);
      if (durable && this.observed.has(path) && this.observed.get(path) !== before) {
        throw new JsonStorageError('external_change', path);
      }
      if (before === text) { this.observed.set(path, text); return; }
      if (durable) {
        if (before !== null) {
          const backupPath = previousJsonPath(path);
          await this.files.writeFile(backupPath, before);
          if (await this.files.readFile(backupPath) !== before) throw new JsonStorageError('verify_failed', backupPath);
        }
        await this.files.writeFile(`${path}.pending`, text);
        if (await this.files.readFile(`${path}.pending`) !== text) throw new JsonStorageError('verify_failed', `${path}.pending`);
        // Narrow the sync race window. This is not an OS-level compare-and-swap.
        if (await this.files.readFile(path) !== before) throw new JsonStorageError('external_change', path);
      }
      await this.files.writeFile(path, text);
      if (await this.files.readFile(path) !== text) throw new JsonStorageError('verify_failed', path);
      this.observed.set(path, text);
      // A matching journal on restart is safe; cleanup failure must not turn a committed
      // save into a reported failure and encourage a duplicate retry.
      if (durable) {
        try { await this.files.deleteFile(`${path}.pending`); } catch { /* verified primary is authoritative */ }
      }
    });
  }

  async remove(path: string): Promise<void> {
    return this.queue(path).run(async () => {
      await this.files.deleteFile(path);
      this.observed.delete(path);
    });
  }
}
