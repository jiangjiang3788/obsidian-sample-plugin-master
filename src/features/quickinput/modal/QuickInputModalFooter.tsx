/** @jsxImportSource preact */
import { ThinkButton } from '@shared/ui/public';
import type { QuickInputOperationMode } from './quickInputOperationMode';
import { getQuickInputSubmitLabel } from './quickInputOperationMode';

export type QuickInputPendingAction = 'submit' | 'delete' | null;

export interface QuickInputModalFooterProps {
  operationMode: QuickInputOperationMode;
  isBusy: boolean;
  canSubmit?: boolean;
  isMobileLike: boolean;
  pendingAction: QuickInputPendingAction;
  onCancel: () => void;
  onDelete: () => void;
  onSubmitClick?: () => void;
  onSubmitPointerDown: (event: MouseEvent | PointerEvent) => void;
  onPreserveDesktopInputFocus: (event: MouseEvent | PointerEvent) => void;
  allowDelete?: boolean;
}

export function QuickInputModalFooter({
  operationMode,
  isBusy,
  canSubmit = true,
  isMobileLike,
  pendingAction,
  onCancel,
  onDelete,
  onSubmitClick,
  onSubmitPointerDown,
  onPreserveDesktopInputFocus,
  allowDelete = true,
}: QuickInputModalFooterProps) {
  const showDelete = allowDelete && (operationMode === 'edit' || operationMode === 'convert');

  return (
    <div className={`think-modal__footer think-modal__footer--quick-input${isMobileLike ? ' is-mobile-like' : ''}`}>
      <div className="think-quick-input-footer-row">
        <div className="think-quick-input-footer-danger-zone">
          {showDelete ? (
            <ThinkButton
              variant="danger"
              size="sm"
              onMouseDown={onPreserveDesktopInputFocus as any}
              onPointerDown={isMobileLike ? undefined : ((event: PointerEvent) => {
                onPreserveDesktopInputFocus(event);
                onDelete();
              }) as any}
              onClick={isMobileLike ? onDelete : undefined}
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
            disabled={isBusy || !canSubmit}
          >{getQuickInputSubmitLabel(operationMode, pendingAction === 'submit')}</ThinkButton>
        </div>
      </div>
    </div>
  );
}
