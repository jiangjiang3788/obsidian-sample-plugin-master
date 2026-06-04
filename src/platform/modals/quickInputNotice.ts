import { Notice } from 'obsidian';

export type QuickInputNoticeTone = 'success' | 'warning' | 'error';

export function showQuickInputNotice(message: string, tone: QuickInputNoticeTone = 'error'): void {
  const prefix = tone === 'success' ? '' : tone === 'warning' ? '⚠️ ' : '❌ ';
  const duration = tone === 'success' ? 4000 : tone === 'warning' ? 12000 : 10000;
  new Notice(`${prefix}${message}`, duration);
}
