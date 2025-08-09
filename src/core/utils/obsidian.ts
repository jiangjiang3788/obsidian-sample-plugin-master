// src/core/utils/obsidian.ts
// obsidian:// 链接工具 —— 优先使用运行时 file 对象，回退解析 id
import { DataStore } from '@core/services/dataStore';

type Ref =
  | string
  | { file?: { path: string; line?: number } }
  | { id?: string; file?: { path: string; line?: number } };

export function makeObsUri(ref: Ref): string {
  let filePath = '';
  let line = '';

  const anyRef: any = ref as any;
  if (anyRef && anyRef.file && anyRef.file.path) {
    filePath = String(anyRef.file.path);
    if (typeof anyRef.file.line === 'number') line = String(anyRef.file.line);
  }

  if (!filePath) {
    const id = typeof ref === 'string' ? ref : (anyRef?.id || '');
    const hashIndex = id.lastIndexOf('#');
    filePath = hashIndex >= 0 ? id.substring(0, hashIndex) : id;
    line = hashIndex >= 0 ? id.substring(hashIndex + 1) : '';
  }

  const vaultName = encodeURIComponent(DataStore.instance.app.vault.getName());
  const qp = `vault=${vaultName}&filepath=${encodeURIComponent(filePath)}`;
  return `obsidian://advanced-uri?${qp}${line ? '&line=' + line : ''}`;
}