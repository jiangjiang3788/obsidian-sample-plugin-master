// src/core/ports/VaultPort.ts
// ---------------------------------------------------------------------------
// Phase2: core -> platform boundary (Port)
// ---------------------------------------------------------------------------
// Goal:
// - core 逻辑（services/utils）不再 import 'obsidian'
// - 所有 Obsidian Vault API 访问都通过 platform 层适配器实现
//
// Design principles:
// - 只暴露“core 需要的最小能力集合”
// - 只使用 string / plain object types（避免把 App/TFile/TFolder 漏进 core）

import type { InjectionToken } from 'tsyringe';

/**
 * VaultPort
 *
 * 最小文件系统能力集合：
 * - 以 vault 路径为 key
 * - 读/写/删 文件（文本）
 * - 平台层负责：确保目录、处理 TFile/TFolder 语义、抛出路径冲突错误
 */
export interface VaultPort {
  /**
   * 读取文件内容。
   * - 文件不存在 -> null
   * - 路径存在但不是文件 -> null
   */
  readFile(path: string): Promise<string | null>;

  /**
   * 写入文件内容（覆盖/创建）。
   * - 平台层应确保父目录存在
   * - 如果 path 位置已经是文件夹等冲突，应抛出错误
   */
  writeFile(path: string, content: string): Promise<void>;

  /**
   * 删除文件。
   * - 文件不存在 -> no-op
   * - 路径存在但不是文件 -> no-op
   */
  deleteFile(path: string): Promise<void>;
}

/**
 * DI Token
 * - app/main 组合根负责注册平台实现（Obsidian adapter）
 */
export const VAULT_PORT_TOKEN: InjectionToken<VaultPort> = 'VaultPort';
