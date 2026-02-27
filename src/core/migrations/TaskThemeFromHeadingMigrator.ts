import { singleton, inject } from 'tsyringe';

import { VAULT_PORT_TOKEN, type VaultPort } from '@/core/ports/VaultPort';
import { METADATA_PORT_TOKEN, type MetadataPort } from '@/core/ports/MetadataPort';
import { RE_TASK_PREFIX, META_BRACKET } from '@/core/utils/regex';

export interface TaskThemeMigrateResult {
  filesTouched: number;
  tasksTouched: number;
  filesScanned: number;
  tasksScanned: number;
}

/**
 * 迁移器（可删除/可回滚）：
 * - 把“heading 作为主题”的旧习惯，显式写入到任务行： (主题::<heading>)
 * - 只在任务行缺少 (主题::) 时插入
 * - 不改变 Time/Duration/DoneDate 等既有字段
 */
@singleton()
export class TaskThemeFromHeadingMigrator {
  constructor(
    @inject(VAULT_PORT_TOKEN) private vault: VaultPort,
    @inject(METADATA_PORT_TOKEN) private metadata: MetadataPort,
  ) {}

  async migrate(opts: { paths: string[]; dryRun?: boolean }): Promise<TaskThemeMigrateResult> {
    const { paths, dryRun = false } = opts;
    let filesTouched = 0;
    let tasksTouched = 0;
    let filesScanned = 0;
    let tasksScanned = 0;

    for (const path of paths) {
      filesScanned++;
      const content = await this.vault.readFile(path);
      if (content == null) continue;

      const headingsList = await this.metadata.getHeadings(path);
      const lines = content.split(/\r?\n/);

      let nextHeadingIndex = 0;
      let currentHeader = '';
      let fileChanged = false;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // 更新 currentHeader（与 DataStore 同步：去掉 heading 中的 #tag）
        if (nextHeadingIndex < headingsList.length && headingsList[nextHeadingIndex].line === i) {
          const headingText = headingsList[nextHeadingIndex].heading;
          const headingTags = headingText.match(/#([\p{L}\p{N}_\/-]+)/gu) || [];
          let cleanText = headingText;
          for (const tag of headingTags) cleanText = cleanText.replace(tag, '').trim();
          currentHeader = cleanText || '';
          nextHeadingIndex++;
          continue;
        }

        if (!RE_TASK_PREFIX.test(line)) continue;
        tasksScanned++;

        // 没有 header 就不迁
        if (!currentHeader) continue;

        // 已有 (主题::) 则跳过（幂等）
        if (line.includes('(主题::')) continue;

        const inserted = this._insertThemeField(line, currentHeader);
        if (inserted !== line) {
          lines[i] = inserted;
          fileChanged = true;
          tasksTouched++;
        }
      }

      if (fileChanged) {
        filesTouched++;
        if (!dryRun) {
          await this.vault.writeFile(path, lines.join('\n'));
        }
      }
    }

    return { filesTouched, tasksTouched, filesScanned, tasksScanned };
  }

  private _insertThemeField(line: string, theme: string): string {
    const themeVal = theme.trim();
    if (!themeVal) return line;

    // 插入规则（保证你要求的格式不变）：
    // - 优先插在第一个 (xxx::yyy) 之前：  标题 (主题::X) (时间::...) ...
    // - 如果没有任何 (..::..) 字段，则插在第一个 emoji 日期标记之前（✅📅❌🛫⏳➕）
    // - 都没有就追加到行尾
    // 严格格式：插入的 (主题::X) 后面必须跟一个空格，
    // 确保结果为：... (主题::生活) (时间::18:00) ...
    // 注意：如果插入点前已有空格，就不要再加前导空格（避免双空格）。
    const themeFieldWithTrailingSpace = `(主题::${themeVal}) `;
    const themeFieldAtLineEnd = ` (主题::${themeVal})`;

    // 1) before first meta bracket
    META_BRACKET.lastIndex = 0;
    const m = META_BRACKET.exec(line);
    if (m && typeof m.index === 'number') {
      const needsLeadingSpace = m.index === 0 ? true : line[m.index - 1] !== ' ';
      const insert = (needsLeadingSpace ? ' ' : '') + themeFieldWithTrailingSpace;
      return line.slice(0, m.index) + insert + line.slice(m.index);
    }

    // 2) before first emoji marker (keep exact spacing)
    const emojiIdx = this._firstEmojiMarkerIndex(line);
    if (emojiIdx >= 0) {
      const needsLeadingSpace = emojiIdx === 0 ? true : line[emojiIdx - 1] !== ' ';
      const insert = (needsLeadingSpace ? ' ' : '') + themeFieldWithTrailingSpace;
      return line.slice(0, emojiIdx) + insert + line.slice(emojiIdx);
    }

    // 3) end
    return line + themeFieldAtLineEnd;
  }

  private _firstEmojiMarkerIndex(line: string): number {
    const markers = ['✅', '📅', '❌', '🛫', '⏳', '➕'];
    let best = -1;
    for (const m of markers) {
      const idx = line.indexOf(` ${m}`);
      if (idx >= 0 && (best === -1 || idx < best)) best = idx;
    }
    return best;
  }
}
