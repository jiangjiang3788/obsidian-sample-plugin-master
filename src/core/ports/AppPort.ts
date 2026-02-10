// src/core/ports/AppPort.ts
// ---------------------------------------------------------------------------
// Phase0/1: core -> platform boundary (App)
// ---------------------------------------------------------------------------
// Goal:
// - core 只需要极少数 App 级信息时，不直接依赖 Obsidian App 类型
// - 用 plain types 暴露“最小能力”
// ---------------------------------------------------------------------------

/**
 * AppVaultNamePort
 * 仅暴露 vault 名称（用于日志/诊断展示等）。
 */
export interface AppVaultNamePort {
  getVaultName(): string;
}

/**
 * AppPort
 * 预留扩展：后续需要更多 app 级能力时在这里增量加接口。
 */
export type AppPort = AppVaultNamePort;
