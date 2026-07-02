/** @jsxImportSource preact */
import { h } from 'preact';

import { Button } from '@shared/ui/public';
import type { QuickInputOperationMode } from './quickInputOperationMode';
import { getQuickInputSubmitLabel } from './quickInputOperationMode';

export type QuickInputPendingAction = 'submit' | 'delete' | null;

export interface QuickInputModalFooterProps {
  operationMode: QuickInputOperationMode;
  isBusy: boolean;
  isMobileLike: boolean;
  pendingAction: QuickInputPendingAction;
  onCancel: () => void;
  onDelete: () => void;
  onSubmitClick?: () => void;
  onSubmitPointerDown: (event: MouseEvent | PointerEvent) => void;
  onPreserveDesktopInputFocus: (event: MouseEvent | PointerEvent) => void;
}

export function QuickInputModalFooter({
  operationMode,
  isBusy,
  isMobileLike,
  pendingAction,
  onCancel,
  onDelete,
  onSubmitClick,
  onSubmitPointerDown,
  onPreserveDesktopInputFocus,
}: QuickInputModalFooterProps) {
  const showDelete = operationMode === 'edit' || operationMode === 'convert';

  return (
    <div class={`think-modal__footer think-modal__footer--quick-input${isMobileLike ? ' is-mobile-like' : ''}`}>
      <div class="think-quick-input-footer-row">
        <div class="think-quick-input-footer-danger-zone">
          {showDelete ? (
            <Button
              color="error"
              onMouseDown={onPreserveDesktopInputFocus as any}
              onPointerDown={onPreserveDesktopInputFocus as any}
              onClick={onDelete}
              disabled={isBusy}
            >
              {pendingAction === 'delete' ? '删除中...' : '删除'}
            </Button>
          ) : null}
        </div>
        <div class="think-quick-input-footer-actions">
          <Button onMouseDown={onPreserveDesktopInputFocus as any} onPointerDown={onPreserveDesktopInputFocus as any} onClick={onCancel} disabled={isBusy}>取消</Button>
          <Button
            data-submit="true"
            onMouseDown={onSubmitPointerDown as any}
            onPointerDown={onSubmitPointerDown as any}
            onClick={isMobileLike ? onSubmitClick : undefined}
            variant="contained"
            disabled={isBusy}
          >
            {getQuickInputSubmitLabel(operationMode, pendingAction === 'submit')}
          </Button>
        </div>
      </div>
    </div>
  );
}
