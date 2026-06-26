/** @jsxImportSource preact */
import { h } from 'preact';
import { Button } from '@shared/public';

import type { RecordSubmitRecoveryPresentation } from '@core/public';

export interface QuickInputConflictRecoveryPanelProps {
  recovery: RecordSubmitRecoveryPresentation;
  isBusy: boolean;
  isRescanning: boolean;
  onOpenOriginal: () => void;
  onRescan: () => void;
  onRetry: () => void;
  onDismiss: () => void;
}

export function QuickInputConflictRecoveryPanel({
  recovery,
  isBusy,
  isRescanning,
  onOpenOriginal,
  onRescan,
  onRetry,
  onDismiss,
}: QuickInputConflictRecoveryPanelProps) {
  if (!recovery.shouldShow) return null;

  return (
    <div
      class="think-quick-input-recovery"
      role="alert"
      style={{
        border: '1px solid var(--background-modifier-error)',
        borderRadius: '10px',
        padding: '10px 12px',
        margin: '8px 0 10px 0',
        background: 'var(--background-modifier-error-hover)',
        color: 'var(--text-normal)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontWeight: 700, marginBottom: '4px' }}>{recovery.title}</div>
          <div style={{ fontSize: '0.9em', lineHeight: 1.45, whiteSpace: 'pre-wrap' }}>{recovery.message}</div>
          <div style={{ fontSize: '0.86em', lineHeight: 1.45, marginTop: '6px', color: 'var(--text-muted)' }}>{recovery.advice}</div>
          {recovery.paths.length > 0 ? (
            <div style={{ fontSize: '0.82em', lineHeight: 1.4, marginTop: '6px', color: 'var(--text-faint)', wordBreak: 'break-all' }}>
              将重新扫描：{recovery.paths.join('、')}
            </div>
          ) : null}
        </div>
        <Button size="small" onClick={onDismiss} disabled={isBusy || isRescanning}>隐藏</Button>
      </div>

      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '10px' }}>
        {recovery.canOpenOriginal ? (
          <Button size="small" variant="outlined" onClick={onOpenOriginal} disabled={isBusy || isRescanning}>打开原文</Button>
        ) : null}
        {recovery.canRescan ? (
          <Button size="small" variant="outlined" onClick={onRescan} disabled={isBusy || isRescanning}>
            {isRescanning ? '扫描中...' : '重新扫描'}
          </Button>
        ) : null}
        {recovery.canRetry ? (
          <Button size="small" variant="contained" onClick={onRetry} disabled={isBusy || isRescanning}>重试保存</Button>
        ) : null}
      </div>
    </div>
  );
}
