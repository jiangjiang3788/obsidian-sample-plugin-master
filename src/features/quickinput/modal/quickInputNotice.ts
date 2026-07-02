export type QuickInputNoticeTone = 'success' | 'warning' | 'error';

export interface QuickInputNoticePayload {
  text: string;
  duration: number;
}

export type ShowQuickInputNotice = (message: string, tone?: QuickInputNoticeTone) => void;

export function formatQuickInputNotice(message: string, tone: QuickInputNoticeTone = 'error'): QuickInputNoticePayload {
  const prefix = tone === 'success' ? '' : tone === 'warning' ? '⚠️ ' : '❌ ';
  const duration = tone === 'success' ? 4000 : tone === 'warning' ? 12000 : 10000;
  return {
    text: `${prefix}${message}`,
    duration,
  };
}
