import type { Item } from '@/core/types/schema';
import { parseBlockContent, parseTaskLine } from '@core/utils/parser';
import { normalizeRecordItem } from '@/core/records';
import type { IThemeMatcher } from '@core/types/theme';
import type { VaultPort } from '@core/ports/VaultPort';
import type { MetadataPort } from '@core/ports/MetadataPort';
import type { FileStat, FileStatPort } from '@core/ports/FileStatPort';
import { devWarn } from '@core/utils/devLogger';
import {
  basenameNoExt,
  normalizeFilePathInput,
  pathBasename,
  pathParentName,
  type FilePathInput,
} from './pathUtils';

export interface ScannedMarkdownFile {
  filePath: string;
  items: Item[];
  stat: FileStat;
}

export class DataStoreFileScanner {
  constructor(
    private vault: VaultPort,
    private metadata: MetadataPort,
    private fileStat: FileStatPort,
    private themeMatcher: IThemeMatcher
  ) {}

  async scan(filePathOrFile: FilePathInput): Promise<ScannedMarkdownFile | null> {
    const filePath = normalizeFilePathInput(filePathOrFile);
    if (!filePath) {
      devWarn('ThinkPlugin: scanFile 入参非法（缺少 path）', filePathOrFile);
      return null;
    }

    const content = await this.vault.readFile(filePath);
    if (content == null) {
      devWarn('ThinkPlugin: scanFile 文件不存在或不可读', filePath);
      return null;
    }

    const headingsList = await this.metadata.getHeadings(filePath);
    const stat = await this.fileStat.stat(filePath);
    if (!stat) {
      devWarn('ThinkPlugin: scanFile 获取 stat 失败', filePath);
      return null;
    }

    const lines = content.split(/\r?\n/);
    const parentFolder = pathParentName(filePath);
    const fileName = basenameNoExt(pathBasename(filePath));
    const items: Item[] = [];

    let nextHeadingIndex = 0;
    let currentSectionTags: string[] = [];
    let currentHeader = '';

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (nextHeadingIndex < headingsList.length && headingsList[nextHeadingIndex].line === i) {
        const headingEntry = headingsList[nextHeadingIndex];
        const headingText = headingEntry.heading;
        const headingTags = headingText.match(/#([\p{L}\p{N}_\/-]+)/gu) || [];
        currentSectionTags = headingTags.map((t) => t.trim()).filter(Boolean);
        let cleanText = headingText;
        for (const tag of headingTags) cleanText = cleanText.replace(tag, '').trim();
        currentHeader = cleanText || '';
        nextHeadingIndex++;
        continue;
      }

      if (line.trim() === '<!-- start -->') {
        const endIdx = lines.indexOf('<!-- end -->', i + 1);
        if (endIdx !== -1) {
          const blockItem = parseBlockContent(filePath, lines, i, endIdx, parentFolder);
          if (blockItem) {
            this.normalizeScannedItem(blockItem, filePath, fileName, parentFolder, stat, i + 1, currentHeader, currentSectionTags);
            items.push(blockItem);
          }
          i = endIdx;
          continue;
        }
      }

      const taskItem = parseTaskLine(filePath, line, i + 1, parentFolder);
      if (taskItem) {
        this.normalizeScannedItem(taskItem, filePath, fileName, parentFolder, stat, i + 1, currentHeader, currentSectionTags);
        items.push(taskItem);
      }
    }

    return { filePath, items, stat };
  }

  private normalizeScannedItem(
    item: Item,
    filePath: string,
    fileName: string,
    parentFolder: string,
    stat: FileStat,
    line: number,
    currentHeader: string,
    currentSectionTags: string[]
  ): void {
    normalizeRecordItem(item, {
      filePath,
      fileName,
      parentFolder,
      created: stat.ctime,
      modified: stat.mtime,
      line,
      header: currentHeader || undefined,
      sectionTags: currentSectionTags,
      themeMatcher: this.themeMatcher,
    });
  }
}
