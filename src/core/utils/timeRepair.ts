import { dayjs, normalizeDateStr, timeToMinutes } from './date';
import { parseTaskLine } from './parser';

const DONE_DATE_RE = /(✅\s*)(\d{4}[-/]\d{2}[-/]\d{2})(\s*)$/;

export interface TimeRepairSample {
  file: string;
  line: number;
  oldDate: string;
  newDate: string;
  startTime: string;
  endTime: string;
  duration: number;
}

export interface TimeRepairResult {
  scannedFiles: number;
  changedFiles: number;
  changedLines: number;
  scannedTasks: number;
  crossDayTasks: number;
  samples: TimeRepairSample[];
}

function getParentFolder(filePath: string): string {
  const normalized = String(filePath || '').replace(/\\/g, '/');
  const parts = normalized.split('/').filter(Boolean);
  if (parts.length <= 1) return '';
  return parts[parts.length - 2] || '';
}

function isCrossDay(startTime?: string, endTime?: string): boolean {
  const startMinutes = timeToMinutes(String(startTime || ''));
  const endMinutes = timeToMinutes(String(endTime || ''));
  if (startMinutes === null || endMinutes === null) return false;
  return endMinutes < startMinutes;
}

function repairCrossDayTaskLine(filePath: string, rawLine: string, lineNo: number): { nextLine: string; changed: boolean; sample?: TimeRepairSample } {
  const item = parseTaskLine(filePath, rawLine, lineNo, getParentFolder(filePath));
  if (!item || item.type !== 'task') return { nextLine: rawLine, changed: false };
  if (!item.doneDate || !item.startTime || !item.endTime || item.duration == null) return { nextLine: rawLine, changed: false };
  if (!isCrossDay(item.startTime, item.endTime)) return { nextLine: rawLine, changed: false };

  const oldDate = normalizeDateStr(item.doneDate);
  const newDate = dayjs(oldDate).subtract(1, 'day').format('YYYY-MM-DD');
  if (!newDate || newDate === oldDate) return { nextLine: rawLine, changed: false };

  const nextLine = rawLine.replace(DONE_DATE_RE, `$1${newDate}$3`);
  if (nextLine === rawLine) return { nextLine: rawLine, changed: false };

  return {
    nextLine,
    changed: true,
    sample: {
      file: filePath,
      line: lineNo,
      oldDate,
      newDate,
      startTime: item.startTime,
      endTime: item.endTime,
      duration: item.duration,
    },
  };
}

export async function repairCrossDayTaskCompletionDatesInVault(vault: {
  getMarkdownFiles(): Array<{ path: string }>;
  read(file: { path: string }): Promise<string>;
  modify(file: { path: string }, content: string): Promise<void>;
}): Promise<TimeRepairResult> {
  const files = vault.getMarkdownFiles();
  let changedFiles = 0;
  let changedLines = 0;
  let scannedTasks = 0;
  let crossDayTasks = 0;
  const samples: TimeRepairSample[] = [];

  for (const file of files) {
    const content = await vault.read(file);
    const lines = content.split('\n');
    let fileChanged = false;

    const nextLines = lines.map((rawLine, index) => {
      const lineNo = index + 1;
      const maybeTask = parseTaskLine(file.path, rawLine, lineNo, getParentFolder(file.path));
      if (maybeTask?.type === 'task') scannedTasks += 1;
      if (maybeTask?.type === 'task' && maybeTask.doneDate && maybeTask.startTime && maybeTask.endTime && isCrossDay(maybeTask.startTime, maybeTask.endTime)) {
        crossDayTasks += 1;
      }

      const repaired = repairCrossDayTaskLine(file.path, rawLine, lineNo);
      if (!repaired.changed) return rawLine;
      fileChanged = true;
      changedLines += 1;
      if (repaired.sample && samples.length < 10) samples.push(repaired.sample);
      return repaired.nextLine;
    });

    if (fileChanged) {
      await vault.modify(file, nextLines.join('\n'));
      changedFiles += 1;
    }
  }

  return { scannedFiles: files.length, changedFiles, changedLines, scannedTasks, crossDayTasks, samples };
}
