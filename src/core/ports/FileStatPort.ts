// src/core/ports/FileStatPort.ts
// ---------------------------------------------------------------------------
// Phase2: core -> platform boundary (file stat)
// ---------------------------------------------------------------------------
// Goal:
// - core/services 不直接依赖 TFile.stat
// - 通过 FileStatPort 读取 mtime/ctime/size（plain object）

import type { InjectionToken } from 'tsyringe';

export interface FileStat {
  ctime: number;
  mtime: number;
  size: number;
}

export interface FileStatPort {
  /**
   * 获取文件 stat。
   * - 文件不存在/不是文件 -> null
   */
  stat(path: string): Promise<FileStat | null>;
}

export const FILESTAT_PORT_TOKEN: InjectionToken<FileStatPort> = 'FileStatPort';
