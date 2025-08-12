// src/core/services/taskService.ts
import { DataStore } from './dataStore';
import { markTaskDone } from '@core/utils/mark';
import { TFile } from 'obsidian';
import { dayjs } from '@core/utils/date';

export class TaskService {
  static async completeTask(itemId: string): Promise<void> {
    const ds = DataStore.instance;
    if (!ds) throw new Error('DataStore not ready');

    const [filePath, lineStr] = itemId.split('#');
    const lineNo = Number(lineStr);
    const file = ds.app.vault.getAbstractFileByPath(filePath);

    if (!(file instanceof TFile)) {
        console.warn(`[TaskService] File not found or is not a TFile: ${filePath}`);
        return;
    }

    const content = await ds.platform.readFile(file);
    const lines = content.split(/\r?\n/);
    if (lineNo < 1 || lineNo > lines.length) return;

    const rawLine = lines[lineNo - 1];
    // 确保这是一个未完成的任务
    if (!/^\s*-\s*\[ \]\s*/.test(rawLine)) return;

    // 1. 使用工具函数计算完成后的行和可能的下一条重复任务行
    const todayISO = dayjs().format('YYYY-MM-DD');
    const nowTime = dayjs().format('HH:mm');
    const { completedLine, nextTaskLine } = markTaskDone(
      rawLine,
      todayISO,
      nowTime,
    );
    
    // 2. 更新内存中的行数组
    lines[lineNo - 1] = completedLine;
    if (nextTaskLine) {
        lines.splice(lineNo, 0, nextTaskLine);
    }

    // 3. 将修改写回 `.md` 文件 (真实来源)
    await ds.platform.writeFile(file, lines.join('\n'));

    // 4. [已移除] 不再手动触发扫描和通知，交由 VaultWatcher 处理
    // await ds.scanFile(file);

    // 5. [已移除]
    // ds.notifyChange();
  }
}