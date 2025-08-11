// src\core\services\taskService.ts
import { DataStore } from './dataStore';
import { markTaskDone } from '@core/utils/mark';
import { TFile } from 'obsidian';                 // ✅ 运行时需要值，不能用 type-only
import { dayjs } from '@core/utils/date';

export class TaskService {
  static async completeTask(itemId: string): Promise<void> {
    const ds = DataStore.instance;
    if (!ds) throw new Error('DataStore not ready');

    const [filePath, lineStr] = itemId.split('#');
    const lineNo = Number(lineStr);
    const file = ds.platform.app.vault.getAbstractFileByPath(filePath);
    if (!(file instanceof TFile)) return;         // ✅ 正确判断

    const content = await ds.platform.readFile(file as TFile);
    const lines = content.split(/\r?\n/);
    if (lineNo < 1 || lineNo > lines.length) return;

    const rawLine = lines[lineNo - 1];
    if (!/^\s*-\s*\[ \]/.test(rawLine)) return;

    const todayISO = dayjs().format('YYYY-MM-DD');
    const nowTime = dayjs().format('HH:mm');
    const { completedLine, nextTaskLine } = markTaskDone(
      rawLine,
      todayISO,
      nowTime,
    );

    lines[lineNo - 1] = completedLine;
    if (nextTaskLine) lines.splice(lineNo, 0, nextTaskLine);

    await ds.platform.writeFile(file as TFile, lines.join('\n'));
    await ds.scanFile(file as TFile);
    ds.notifyChange();
  }
}
