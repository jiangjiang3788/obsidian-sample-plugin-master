// services/taskService.ts
/**
 * 业务服务层 —— 专管“完成任务”逻辑，
 * DataStore 不再直接写业务代码，避免重复。
 */
import { DataStore } from '../data/store';
import { markTaskDone } from '../data/mark';
import { TFile } from 'obsidian';

export class TaskService {
  /**
   * 标记任务完成（支持周期任务），并刷新数据存储。
   */
  static async completeTask(itemId: string): Promise<void> {
    const ds = DataStore.instance;
    if (!ds) throw new Error('DataStore not ready');

    const [filePath, lineStr] = itemId.split('#');
    const lineNo = Number(lineStr);
    const file = ds['app'].vault.getAbstractFileByPath(filePath);
    if (!(file instanceof TFile)) return;

    const content = await ds['app'].vault.read(file);
    const lines   = content.split(/\r?\n/);
    if (lineNo < 1 || lineNo > lines.length) return;

    const rawLine = lines[lineNo - 1];
    if (!/^\s*-\s*\[ \]/.test(rawLine)) return;          // 不是未完成任务

    const moment      = (window as any).moment;
    const todayISO    = moment().format('YYYY-MM-DD');
    const nowTime     = moment().format('HH:mm');
    const { completedLine, nextTaskLine } =
      markTaskDone(rawLine, todayISO, nowTime);

    lines[lineNo - 1] = completedLine;
    if (nextTaskLine) lines.splice(lineNo, 0, nextTaskLine);

    await ds['app'].vault.modify(file, lines.join('\n'));
    await ds.scanFile(file);          // 重新解析
    ds.notifyChange();                // 通知视图刷新
  }
}