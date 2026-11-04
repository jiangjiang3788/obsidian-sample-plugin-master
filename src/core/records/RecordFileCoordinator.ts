import type { VaultPort } from '@/core/ports/VaultPort';

// One coordinator per VaultPort instance, shared by direct capture and RecordRepository.
// Acquiring paths in a stable order also prevents deadlocks in multi-file transactions.
const fileQueues = new WeakMap<VaultPort, Map<string, Promise<void>>>();

export async function withRecordFileLocks<T>(vault: VaultPort, paths: readonly string[], action: () => Promise<T>): Promise<T> {
  let queues = fileQueues.get(vault);
  if (!queues) {
    queues = new Map();
    fileQueues.set(vault, queues);
  }
  const release: Array<() => void> = [];
  try {
    for (const path of [...new Set(paths)].sort()) {
      const previous = queues.get(path) ?? Promise.resolve();
      let unlock!: () => void;
      const current = new Promise<void>((resolve) => { unlock = resolve; });
      queues.set(path, current);
      await previous;
      release.push(() => {
        if (queues?.get(path) === current) queues.delete(path);
        unlock();
      });
    }
    return await action();
  } finally {
    for (const unlock of release.reverse()) unlock();
  }
}

/**
 * Platform adapters can implement mutateFile with Obsidian Vault.process, so
 * external editor changes are checked against the actual content at write time.
 * Non-Obsidian test hosts retain a sequential read/write fallback.
 * Callers must hold the record file lock before invoking this helper.
 */
export async function mutateRecordFile(
  vault: VaultPort,
  path: string,
  change: (content: string | null) => string,
): Promise<void> {
  if (vault.mutateFile) {
    await vault.mutateFile(path, change);
  } else {
    const before = await vault.readFile(path);
    await vault.writeFile(path, change(before));
  }
}

/** Reject stale snapshots instead of silently overwriting newer file contents. */
export async function replaceRecordFile(
  vault: VaultPort,
  path: string,
  expected: string,
  next: string,
): Promise<void> {
  await mutateRecordFile(vault, path, (current) => {
    if ((current ?? '') !== expected) throw new Error(`record_write_conflict:${path}`);
    return next;
  });
}
