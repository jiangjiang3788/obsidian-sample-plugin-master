// src/core/utils/obsidian.ts
import { App, TAbstractFile, TFile } from 'obsidian'; // [修改] 导入 App 和其他类型

// [修改] Ref 类型现在更具体
type Ref =
  | string
  | { file?: { path: string; line?: number } }
  | { id?: string; file?: { path: string; line?: number } };

// [修改] 函数现在接收 app 实例作为参数，不再依赖 DataStore 单例
export function makeObsUri(ref: Ref, app: App): string {
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
    
    // [修改] 直接使用传入的 app 实例
    const vaultName = encodeURIComponent(app.vault.getName());
    const qp = `vault=${vaultName}&filepath=${encodeURIComponent(filePath)}`;
    return `obsidian://advanced-uri?${qp}${line ? '&line=' + line : ''}`;
}