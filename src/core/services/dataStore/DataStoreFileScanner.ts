import type { Item } from '@/core/types/schema';
import { parseRecordBlock } from '@core/utils/parser';
import { normalizeRecordItem } from '@/core/records/RecordNormalizer';
import type { IThemeMatcher } from '@core/types/theme';
import type { VaultPort } from '@core/ports/VaultPort';
import type { MetadataPort } from '@core/ports/MetadataPort';
import type { FileStat, FileStatPort } from '@core/ports/FileStatPort';
import { devWarn } from '@core/utils/devLogger';
import type { RecordIntegrityIssue } from '@/core/records/RecordIndex';
import { isStableRecordId } from '@/core/records/RecordId';
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
  integrityIssues: RecordIntegrityIssue[];
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
    const integrityIssues: RecordIntegrityIssue[] = [];

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
          const blockItem = parseRecordBlock(filePath, lines, i, endIdx, parentFolder);
          if (blockItem) {
            this.normalizeScannedItem(blockItem, filePath, fileName, parentFolder, stat, i + 1, endIdx + 1, currentHeader, currentSectionTags);
            items.push(blockItem);
          } else {
            const blockLines = lines.slice(i + 1, endIdx);
            const idLine = blockLines.find(candidate => /^\s*(?:记录ID|recordId)\s*[:：]{1,2}/i.test(candidate));
            const recordId = idLine?.replace(/^\s*(?:记录ID|recordId)\s*[:：]{1,2}\s*/i, '').trim();
            integrityIssues.push({
              code: !recordId || !isStableRecordId(recordId) ? 'record_id_missing' : 'record_block_malformed',
              recordId: recordId || undefined,
              path: filePath,
              message: !recordId || !isStableRecordId(recordId)
                ? `Record Block at ${filePath}:${i + 1} is missing a valid stable 记录ID.`
                : `Record Block ${recordId} at ${filePath}:${i + 1} does not satisfy Record v2 envelope requirements.`,
            });
          }
          i = endIdx;
          continue;
        }
      }

    }

    return { filePath, items, stat, integrityIssues };
  }

  private normalizeScannedItem(
    item: Item,
    filePath: string,
    fileName: string,
    parentFolder: string,
    stat: FileStat,
    line: number,
    endLine: number,
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
    item.source = { path: filePath, startLine: line, endLine, modified: stat.mtime };
    if (item.file) item.file.line = line;
  }
}
