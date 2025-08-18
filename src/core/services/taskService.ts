// src/core/services/taskService.ts
import { DataStore } from './dataStore';
import { markTaskDone } from '@core/utils/mark';
import { TFile } from 'obsidian';
import { dayjs } from '@core/utils/date';

// [NEW] 新增一个辅助函数，用于智能地更新或插入键值对
function upsertKvTag(line: string, key: string, value: string): string {
    const pattern = new RegExp(`([\\(\\[]\\s*${key}::\\s*)[^\\)\\]]+(\\s*[\\)\\]])`);
    if (pattern.test(line)) {
        // 如果标签已存在，则替换其值
        return line.replace(pattern, `$1${value}$2`);
    } else {
        // 如果标签不存在，则在行尾追加它
        return `${line.trim()} (${key}:: ${value})`;
    }
}

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
  }

  /**
   * [NEW] 更新任务的时间和/或时长
   * @param itemId - 任务的唯一ID (filePath#lineNumber)
   * @param newValues - 包含新时间和/或新时长的对象
   */
  static async updateTaskTime(itemId: string, newValues: { time?: string; duration?: number }): Promise<void> {
    const ds = DataStore.instance;
    if (!ds) throw new Error('DataStore not ready');

    const [filePath, lineStr] = itemId.split('#');
    const lineNo = Number(lineStr);
    const file = ds.app.vault.getAbstractFileByPath(filePath);

    if (!(file instanceof TFile)) {
        console.warn(`[TaskService] File not found for updating time: ${filePath}`);
        return;
    }

    const content = await ds.platform.readFile(file);
    const lines = content.split(/\r?\n/);
    if (lineNo < 1 || lineNo > lines.length) return;

    let targetLine = lines[lineNo - 1];

    // 智能更新时间
    if (newValues.time) {
        targetLine = upsertKvTag(targetLine, '时间', newValues.time);
    }
    // 智能更新时长
    if (newValues.duration !== undefined) {
        targetLine = upsertKvTag(targetLine, '时长', String(newValues.duration));
    }

    // 将修改后的行写回数组
    lines[lineNo - 1] = targetLine;

    // 将整个文件内容写回磁盘
    await ds.platform.writeFile(file, lines.join('\n'));
    // 注意：此处无需调用 notifyChange，因为 VaultWatcher 会监听到文件修改并触发重扫和通知
  }
}