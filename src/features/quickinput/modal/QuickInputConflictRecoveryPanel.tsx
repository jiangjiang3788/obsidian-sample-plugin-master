/** @jsxImportSource preact */
import { ThinkButton } from '@shared/ui/public';
import type { RecordSubmitRecoveryPresentation } from '@core/utils/public';

export interface QuickInputConflictRecoveryPanelProps {
  recovery: RecordSubmitRecoveryPresentation;
  isBusy: boolean;
  isRescanning: boolean;
  onOpenOriginal: () => void;
  onRescan: () => void;
  onRetry: () => void;
  onDismiss: () => void;
}

export function QuickInputConflictRecoveryPanel({ recovery, isBusy, isRescanning, onOpenOriginal, onRescan, onRetry, onDismiss }: QuickInputConflictRecoveryPanelProps) {
  if (!recovery.shouldShow) return null;
  const disabled = isBusy || isRescanning;
  return (
    <div className="think-quick-input-recovery" role="alert">
      <div className="think-quick-input-recovery__text">
        <strong>{recovery.title}</strong>
        <span>{recovery.message}</span>
        <span className="think-quick-input-recovery__advice">{recovery.advice}</span>
        {recovery.paths.length ? <span className="think-quick-input-recovery__paths">将重新扫描：{recovery.paths.join('、')}</span> : null}
      </div>
      <div className="think-quick-input-recovery__actions">
        {recovery.canOpenOriginal ? <ThinkButton size="sm" onClick={onOpenOriginal} disabled={disabled}>打开原文</ThinkButton> : null}
        {recovery.canRescan ? <ThinkButton size="sm" onClick={onRescan} disabled={disabled}>{isRescanning ? '扫描中…' : '重新扫描'}</ThinkButton> : null}
        {recovery.canRetry ? <ThinkButton size="sm" variant="primary" onClick={onRetry} disabled={disabled}>重试保存</ThinkButton> : null}
        <ThinkButton size="sm" variant="ghost" onClick={onDismiss} disabled={disabled}>隐藏</ThinkButton>
      </div>
    </div>
  );
}
