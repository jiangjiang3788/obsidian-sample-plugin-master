// src/core/records/RecordEntity.ts
import type { Item } from '@/core/types/schema';
import type { IThemeMatcher } from '@/core/types/theme';

/**
 * 文件级扫描上下文。
 *
 * 这些字段来自 Obsidian 文件系统/metadata，不是用户输入字段。
 * RecordNormalizer 会把它们稳定写入 Item，避免 DataStore、parser、视图层各自重复拼装。
 */
export interface RecordFileContext {
  filePath: string;
  fileName: string;
  parentFolder: string;
  created: number;
  modified: number;
}

/** 当前记录所在 Markdown 位置上下文。 */
export interface RecordLocationContext {
  /** 1-based line number. */
  line?: number;
  /** Markdown heading/section only; never used as theme. */
  header?: string;
  /** Tags inherited from current heading, e.g. ## Work #project/a. */
  sectionTags?: string[];
}

export interface RecordNormalizeContext extends RecordFileContext, RecordLocationContext {
  themeMatcher?: IThemeMatcher;
}

/**
 * 规范化后的运行时记录。
 *
 * 当前仍兼容 Item 结构；单独导出类型是为了后续逐步把视图/搜索/编辑迁移到 RecordEntity。
 */
export type RecordEntity = Item & {
  schemaVersion: number;
  coreBlock: string;
  source: { path: string; startLine: number; endLine: number; modified: number };
};
