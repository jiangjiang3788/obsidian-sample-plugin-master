// src/core/utils/obsidian.ts

import { App, TAbstractFile, TFile } from 'obsidian';

type Ref =
  | string
  | { file?: { path: string; line?: number } }
  | { id?: string; file?: { path: string; line?: number } };

export function makeObsUri(ref: Ref, app: App): string {
    // [修改] 移除了所有 console.log 和 console.error 调试代码
    // 保留核心安全检查，但不再向控制台输出大量信息
    if (!app || !app.vault) {
        // 在遇到错误时，静默返回一个无效链接，防止UI崩溃
        return '#error-app-not-provided';
    }

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
    
    const vaultName = encodeURIComponent(app.vault.getName());
    const qp = `vault=${vaultName}&filepath=${encodeURIComponent(filePath)}`;
    return `obsidian://advanced-uri?${qp}${line ? '&line=' + line : ''}`;
}