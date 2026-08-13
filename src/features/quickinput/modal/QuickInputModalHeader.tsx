/** @jsxImportSource preact */
import { ModalHeader, ThinkSegmentedControl } from '@shared/ui/public';
import type { QuickInputOperationMode } from './quickInputOperationMode';
import { getQuickInputOperationTitle } from './quickInputOperationMode';

export interface QuickInputModalHeaderProps {
  operationMode: QuickInputOperationMode;
  currentBlockName: string;
  isTimerCreate: boolean;
  originalGestureHint?: string;
  onClose: () => void;
  onOriginalPointerClick: (event: MouseEvent) => void;
  onOriginalTouchEnd: (event: TouchEvent) => void;
  onOperationModeChange: (mode: QuickInputOperationMode) => void;
}

const operationOptions = [
  { value: 'edit', label: '编辑' },
  { value: 'convert', label: '转换' },
  { value: 'duplicate', label: '另存' },
] as const;

export function QuickInputModalHeader({
  operationMode,
  currentBlockName,
  isTimerCreate,
  originalGestureHint,
  onClose,
  onOriginalPointerClick,
  onOriginalTouchEnd,
  onOperationModeChange,
}: QuickInputModalHeaderProps) {
  const editing = operationMode !== 'create';
  return (
    <div className="think-quick-input-modal-header">
      <ModalHeader
        left={
          <h3
            className="think-quick-input-modal-title"
            title={originalGestureHint}
            onClick={editing ? (onOriginalPointerClick as any) : undefined}
            onTouchEnd={editing ? (onOriginalTouchEnd as any) : undefined}
          >
            {getQuickInputOperationTitle(operationMode, currentBlockName, isTimerCreate)}
          </h3>
        }
        onClose={onClose}
        padding={0}
        borderBottom={false}
      />
      {editing ? (
        <ThinkSegmentedControl
          className="think-quick-input-operation-switcher"
          label="编辑记录方式"
          value={operationMode}
          options={operationOptions}
          onChange={(value) => onOperationModeChange(value as QuickInputOperationMode)}
        />
      ) : null}
    </div>
  );
}
