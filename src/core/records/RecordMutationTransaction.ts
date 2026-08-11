import type { VaultPort } from '@/core/ports/VaultPort';

export interface RecordFileWrite {
  path: string;
  before: string;
  after: string;
}

export interface RecordMutationTransactionResult {
  writtenPaths: string[];
}

export class RecordTransactionRecoveryError extends Error {
  readonly code = 'record_transaction_recovery_required';

  constructor(
    public readonly originalError: unknown,
    public readonly writtenPaths: string[],
    public readonly recoveryFailedPaths: string[],
  ) {
    super(`record_transaction_recovery_required:${recoveryFailedPaths.join(',')}`, { cause: originalError });
    this.name = 'RecordTransactionRecoveryError';
  }
}

/** Application-level file transaction with optimistic precondition + best-effort rollback. */
export class RecordMutationTransaction {
  constructor(private readonly vault: VaultPort) {}

  async commit(writes: RecordFileWrite[]): Promise<RecordMutationTransactionResult> {
    const unique = new Map<string, RecordFileWrite>();
    for (const write of writes) unique.set(write.path, write);
    const ordered = [...unique.values()];

    for (const write of ordered) {
      const current = await this.vault.readFile(write.path);
      if ((current ?? '') !== write.before) {
        throw new Error(`record_write_conflict:${write.path}`);
      }
    }

    const written: RecordFileWrite[] = [];
    try {
      for (const write of ordered) {
        await this.vault.writeFile(write.path, write.after);
        written.push(write);
      }
      return { writtenPaths: written.map(write => write.path) };
    } catch (error) {
      const recoveryFailedPaths: string[] = [];
      for (const write of written.reverse()) {
        try { await this.vault.writeFile(write.path, write.before); }
        catch { recoveryFailedPaths.push(write.path); }
      }
      if (recoveryFailedPaths.length > 0) {
        throw new RecordTransactionRecoveryError(
          error,
          written.map(write => write.path),
          recoveryFailedPaths,
        );
      }
      throw error;
    }
  }
}
