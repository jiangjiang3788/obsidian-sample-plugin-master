// src/core/utils/obsidian.ts

// NOTE (Phase2):
// - core 层不应直接依赖 Obsidian API 类型（App/TFile/...）。
// - 该函数本质上只需要 vaultName 字符串即可生成 advanced-uri。
// - 因此将签名从 (ref, app) 改为 (ref, vaultName)，以减少 core 对 obsidian 的耦合。

type Ref =
    | string
    | { file?: { path: string; line?: number } }
    | { id?: string; file?: { path: string; line?: number } };

/**
 * 生成 Obsidian advanced-uri。
 *
 * @param ref - Item/Task/Block 等引用。支持：
 *  - string: "path#line" or "path"
 *  - { file: { path, line? } }
 *  - { id, file? }
 * @param vaultName - app.vault.getName() 的返回值。未提供则返回一个安全的占位链接。
 */
export function makeObsUri(ref: Ref, vaultName?: string | null): string {
    if (!vaultName) {
        // 在遇到错误时，静默返回一个无效链接，防止 UI 崩溃
        return '#error-vault-not-provided';
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

    const vault = encodeURIComponent(vaultName);
    const qp = `vault=${vault}&filepath=${encodeURIComponent(filePath)}`;
    return `obsidian://advanced-uri?${qp}${line ? '&line=' + line : ''}`;
}
