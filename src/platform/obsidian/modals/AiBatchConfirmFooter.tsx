/** @jsxImportSource preact */
import { ThinkButton } from '@shared/ui/public';

import type { AiBatchConfirmActionStatus } from './useAiBatchConfirmActions';

export interface AiBatchConfirmFooterProps {
  saved: boolean;
  skipped: boolean;
  isBusy: boolean;
  isSavingCurrent: boolean;
  actionStatus: AiBatchConfirmActionStatus;
  onSkip: () => void;
  onSave: () => void;
  onComplete: () => void;
}

export function AiBatchConfirmFooter({
  saved,
  skipped,
  isBusy,
  isSavingCurrent,
  actionStatus,
  onSkip,
  onSave,
  onComplete,
}: AiBatchConfirmFooterProps) {
  return (
    <div className="think-overlay-footer think-ai-batch-footer">
      <div className="think-ai-batch-footer__left">
        <ThinkButton
          variant="ghost"
          data-ai-batch-action="skip-current"
          onClick={onSkip}
          disabled={isBusy || saved || skipped}
        >跳过此条</ThinkButton>
        {actionStatus.message ? (
          <span
            className={`think-ai-batch-footer__status is-${actionStatus.tone}`}
            role="status"
            aria-live="polite"
          >{actionStatus.message}</span>
        ) : null}
      </div>
      <div className="think-overlay-footer__actions">
        <ThinkButton
          data-submit="true"
          data-ai-batch-action="save-current"
          variant="primary"
          loading={isSavingCurrent}
          onClick={onSave}
          disabled={isBusy || saved || skipped}
        >{saved ? '已保存' : isSavingCurrent ? '保存中…' : '保存此条'}</ThinkButton>
        <ThinkButton
          data-ai-batch-action="complete"
          onClick={onComplete}
          disabled={isBusy}
        >完成</ThinkButton>
      </div>
    </div>
  );
}
