// src/core/ports/MetadataPort.ts
// ---------------------------------------------------------------------------
// Phase2: core -> platform boundary (metadata)
// ---------------------------------------------------------------------------
// Goal:
// - core/services 不直接访问 app.metadataCache / TFile
// - 通过 MetadataPort 获取“文件 headings”等解析结果（plain objects）

import type { InjectionToken } from 'tsyringe';

export interface HeadingInfo {
  /** 0-based line index */
  line: number;
  /** raw heading text */
  heading: string;
}

export interface MetadataPort {
  /**
   * 获取文件 headings（按行号升序）。
   * - 文件不存在/不是 markdown -> []
   */
  getHeadings(path: string): Promise<HeadingInfo[]>;
}

export const METADATA_PORT_TOKEN: InjectionToken<MetadataPort> = 'MetadataPort';
