/** @jsxImportSource preact */
import { h } from 'preact';

import { Button } from '@shared/public';

export type QuickInputPendingAction = 'submit' | 'delete' | null;

export interface QuickInputModalFooterProps {
  mode: 'create' | 'edit';
  isBusy: boolean;
  isMobileLike: boolean;
  pendingAction: QuickInputPendingAction;
  onCancel: () => void;
  onDelete: () => void;
  onSubmitClick?: () => void;
  onSubmitPointerDown: (event: MouseEvent | PointerEvent) => void;
  onPreserveDesktopInputFocus: (event: MouseEvent | PointerEvent) => void;
}

function submitButtonLabel(mode: 'create' | 'edit', pendingAction: QuickInputPendingAction): string {
  if (pendingAction === 'submit') return mode === 'edit' ? '保存中...' : '创建中...';
  return mode === 'edit' ? '保存修改' : '创建';
}

export function QuickInputModalFooter({
  mode,
  isBusy,
  isMobileLike,
  pendingAction,
  onCancel,
  onDelete,
  onSubmitClick,
  onSubmitPointerDown,
  onPreserveDesktopInputFocus,
}: QuickInputModalFooterProps) {
  return (
    <div
      class="think-modal__footer think-modal__footer--quick-input"
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: '0.9rem',
        gap: '8px',
        position: isMobileLike ? 'sticky' : 'static',
        bottom: 0,
        background: 'var(--background-primary)',
        paddingBottom: isMobileLike ? 'calc(env(safe-area-inset-bottom, 0px) + 8px)' : undefined,
        zIndex: isMobileLike ? 3 : undefined,
      }}
    >
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'space-between', width: '100%' }}>
        <div>
          {mode === 'edit' ? (
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
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <Button onMouseDown={onPreserveDesktopInputFocus as any} onPointerDown={onPreserveDesktopInputFocus as any} onClick={onCancel} disabled={isBusy}>取消</Button>
          <Button
            data-submit="true"
            onMouseDown={onSubmitPointerDown as any}
            onPointerDown={onSubmitPointerDown as any}
            onClick={isMobileLike ? onSubmitClick : undefined}
            variant="contained"
            disabled={isBusy}
          >
            {submitButtonLabel(mode, pendingAction)}
          </Button>
        </div>
      </div>
    </div>
  );
}
