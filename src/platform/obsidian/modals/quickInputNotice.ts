import { Notice } from 'obsidian';

import { formatQuickInputNotice, type QuickInputNoticeTone } from '@features/quickinput/modal/quickInputNotice';

export function showQuickInputNotice(message: string, tone: QuickInputNoticeTone = 'error'): void {
  const payload = formatQuickInputNotice(message, tone);
  new Notice(payload.text, payload.duration);
}
