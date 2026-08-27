import fs from 'node:fs';
import path from 'node:path';
import type { VaultPort } from '@/core/ports/VaultPort';
import type { FileStat, FileStatPort } from '@/core/ports/FileStatPort';
import type { MetadataPort } from '@/core/ports/MetadataPort';
import type { IPluginStorage } from '@/core/services/StorageService';
import { DataStore } from '@/core/services/DataStore';
import { RecordRepository } from '@/core/records/RecordRepository';

export type WriteFailureRule = {
  path?: string;
  contentEquals?: string;
  contentIncludes?: string;
  occurrence?: number;
  times?: number;
  message?: string;
};

type ExternalReadMutation = {
  path: string;
  occurrence: number;
  content: string | null;
};

const fixtureRoot = path.resolve(process.cwd(), 'test/fixtures/fault-lab');

export function 读取故障样本(relativePath: string): string {
  return fs.readFileSync(path.join(fixtureRoot, relativePath), 'utf8');
}

export function 生成超大字段字符(size = 512 * 1024): string {
  const seed = 'ThinkOS-fault-lab|::|[[link]]|#tag|0123456789\n';
  if (size <= 0) return '';
  let output = '';
  while (output.length < size) output += seed;
  return output.slice(0, size);
}

/**
 * 只用于测试的可控 Vault。
 * 动态故障通过规则注入，业务源码完全不知道故障实验室的存在。
 */
export class FaultLabVault implements VaultPort {
  readonly files = new Map<string, string>();
  readonly stats = new Map<string, FileStat>();
  readonly writes: Array<{ path: string; content: string }> = [];
  readonly deletes: string[] = [];

  private clock = 100;
  private writeCount = 0;
  private readCountByPath = new Map<string, number>();
  private writeFailures: Array<WriteFailureRule & { remaining: number }> = [];
  private readMutations: ExternalReadMutation[] = [];
  private statFailures = new Map<string, number>();

  constructor(initial: Record<string, string> = {}) {
    for (const [filePath, content] of Object.entries(initial)) this.put(filePath, content);
  }

  put(filePath: string, content: string, mtime?: number): void {
    this.files.set(filePath, content);
    const modified = mtime ?? ++this.clock;
    this.stats.set(filePath, {
      ctime: this.stats.get(filePath)?.ctime ?? modified,
      mtime: modified,
      size: content.length,
    });
  }

  remove(filePath: string): void {
    this.files.delete(filePath);
    this.stats.delete(filePath);
  }

  注入写入失败(rule: WriteFailureRule): void {
    this.writeFailures.push({ ...rule, remaining: rule.times ?? 1 });
  }

  注入指定读取时外部改写(pathValue: string, occurrence: number, content: string | null): void {
    this.readMutations.push({ path: pathValue, occurrence, content });
  }

  注入Stat失败(pathValue: string, times = 1): void {
    this.statFailures.set(pathValue, (this.statFailures.get(pathValue) ?? 0) + times);
  }

  async readFile(filePath: string): Promise<string | null> {
    const occurrence = (this.readCountByPath.get(filePath) ?? 0) + 1;
    this.readCountByPath.set(filePath, occurrence);
    const mutationIndex = this.readMutations.findIndex((item) => item.path === filePath && item.occurrence === occurrence);
    if (mutationIndex >= 0) {
      const mutation = this.readMutations.splice(mutationIndex, 1)[0];
      if (mutation.content == null) this.remove(filePath);
      else this.put(filePath, mutation.content);
    }
    return this.files.get(filePath) ?? null;
  }

  listMarkdownFilePaths(): string[] {
    return [...this.files.keys()].filter((filePath) => filePath.endsWith('.md')).sort();
  }

  async writeFile(filePath: string, content: string): Promise<void> {
    this.writeCount += 1;
    this.writes.push({ path: filePath, content });
    const failure = this.writeFailures.find((rule) => {
      if (rule.remaining <= 0) return false;
      if (rule.path && rule.path !== filePath) return false;
      if (rule.contentEquals !== undefined && rule.contentEquals !== content) return false;
      if (rule.contentIncludes !== undefined && !content.includes(rule.contentIncludes)) return false;
      if (rule.occurrence !== undefined && rule.occurrence !== this.writeCount) return false;
      return true;
    });
    if (failure) {
      failure.remaining -= 1;
      throw new Error(failure.message ?? `fault_lab_write_failed:${filePath}`);
    }
    this.put(filePath, content);
  }

  async deleteFile(filePath: string): Promise<void> {
    this.deletes.push(filePath);
    this.remove(filePath);
  }

  readonly fileStat: FileStatPort = {
    stat: async (filePath: string) => {
      const remaining = this.statFailures.get(filePath) ?? 0;
      if (remaining > 0) {
        this.statFailures.set(filePath, remaining - 1);
        return null;
      }
      return this.stats.get(filePath) ?? null;
    },
  };
}

export function 创建故障实验环境(initial: Record<string, string> = {}) {
  const vault = new FaultLabVault(initial);
  const metadata: MetadataPort = { getHeadings: async () => [] };
  const storageFiles = new Map<string, unknown>();
  const storage: IPluginStorage = {
    readJSON: async <T,>(filePath: string) => {
      const value = storageFiles.get(filePath);
      return value == null ? null : JSON.parse(JSON.stringify(value)) as T;
    },
    writeJSON: async (filePath, value) => {
      storageFiles.set(filePath, JSON.parse(JSON.stringify(value)));
    },
    remove: async (filePath) => { storageFiles.delete(filePath); },
  };
  const dataStore = new DataStore(vault, metadata, vault.fileStat, storage);
  const repository = new RecordRepository(vault, dataStore);
  return { vault, metadata, storage, storageFiles, dataStore, repository };
}
