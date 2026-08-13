/** @jsxImportSource preact */
import { ThinkButton } from '@shared/ui/public';
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
    <div className={`think-modal__footer think-modal__footer--quick-input${isMobileLike ? ' is-mobile-like' : ''}`}>
      <div className="think-quick-input-footer-row">
        <div className="think-quick-input-footer-danger-zone">
          {showDelete ? (
            <ThinkButton
              variant="danger"
              size="sm"
              onMouseDown={onPreserveDesktopInputFocus as any}
              onPointerDown={onPreserveDesktopInputFocus as any}
              onClick={onDelete}
              disabled={isBusy}
            >{pendingAction === 'delete' ? '删除中…' : '删除'}</ThinkButton>
          ) : null}
        </div>
        <div className="think-quick-input-footer-actions">
          <ThinkButton onMouseDown={onPreserveDesktopInputFocus as any} onPointerDown={onPreserveDesktopInputFocus as any} onClick={onCancel} disabled={isBusy}>取消</ThinkButton>
          <ThinkButton
            data-submit="true"
            variant="primary"
            onMouseDown={onSubmitPointerDown as any}
            onPointerDown={onSubmitPointerDown as any}
            onClick={isMobileLike ? onSubmitClick : undefined}
            disabled={isBusy}
          >{getQuickInputSubmitLabel(operationMode, pendingAction === 'submit')}</ThinkButton>
        </div>
      </div>
    </div>
  );
}
