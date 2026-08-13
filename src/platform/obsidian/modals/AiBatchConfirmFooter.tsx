// src/platform/obsidian/modals/AiBatchConfirmFooter.tsx
/** @jsxImportSource preact */
import { ThinkButton } from '@shared/ui/public';

export interface AiBatchConfirmFooterProps {
  saved: boolean;
  skipped: boolean;
  onSkip: () => void;
  onSave: () => void;
  onComplete: () => void;
}

export function AiBatchConfirmFooter({ saved, skipped, onSkip, onSave, onComplete }: AiBatchConfirmFooterProps) {
  return (
    <div className="think-overlay-footer think-ai-batch-footer">
      <ThinkButton variant="ghost" onClick={onSkip} disabled={saved || skipped}>跳过此条</ThinkButton>
      <div className="think-overlay-footer__actions">
        <ThinkButton variant="primary" onClick={onSave} disabled={saved}>{saved ? '已保存' : '保存此条'}</ThinkButton>
        <ThinkButton onClick={onComplete}>完成</ThinkButton>
      </div>
    </div>
  );
}
