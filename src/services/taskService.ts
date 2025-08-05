// src/services/taskService.ts
/**
 * 业务服务层 —— 专管“完成任务”逻辑
 */
import { DataStore } from '../data/store';
import { markTaskDone } from '../utils/mark';         // ← 修改路径
import { TFile } from 'obsidian';
import { dayjs } from '../utils/date';

export class TaskService {
  static async completeTask(itemId: string): Promise<void> {
    const ds = DataStore.instance;
    if (!ds) throw new Error('DataStore not ready');

    const [filePath, lineStr] = itemId.split('#');
    const lineNo = Number(lineStr);
    const file = ds['app'].vault.getAbstractFileByPath(filePath);
    if (!(file instanceof TFile)) return;

    const content = await ds['app'].vault.read(file);
    const lines = content.split(/\r?\n/);
    if (lineNo < 1 || lineNo > lines.length) return;

    const rawLine = lines[lineNo - 1];
    if (!/^\s*-\s*\[ \]/.test(rawLine)) return;

    const todayISO = dayjs().format('YYYY-MM-DD');
    const nowTime = dayjs().format('HH:mm');
    const { completedLine, nextTaskLine } = markTaskDone(rawLine, todayISO, nowTime);

    lines[lineNo - 1] = completedLine;
    if (nextTaskLine) lines.splice(lineNo, 0, nextTaskLine);

    await ds['app'].vault.modify(file, lines.join('\n'));
    await ds.scanFile(file);
    ds.notifyChange();
  }
}