/** @jsxImportSource preact */
import { h } from 'preact';

import { Button, ModalHeader } from '@shared/public';
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

function buildOperationHelpText(mode: QuickInputOperationMode): string {
  if (mode === 'convert') {
    return '转换会修改原记录的记录类型，并按新模板保存；如果保存位置变化，会先写入新位置，再删除旧记录。';
  }
  if (mode === 'duplicate') {
    return '另存会按当前内容创建一条新记录，原记录保持不变。';
  }
  return '';
}

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
  const isEditingExistingRecord = operationMode !== 'create';
  const helpText = buildOperationHelpText(operationMode);

  return (
    <div class="think-quick-input-modal-header">
      <ModalHeader
        left={
          <h3
            class="think-quick-input-modal-title"
            title={originalGestureHint}
            onClick={isEditingExistingRecord ? (onOriginalPointerClick as any) : undefined}
            onTouchEnd={isEditingExistingRecord ? (onOriginalTouchEnd as any) : undefined}
          >
            {getQuickInputOperationTitle(operationMode, currentBlockName, isTimerCreate)}
          </h3>
        }
        onClose={onClose}
        padding={0}
        borderBottom={false}
      />

      {isEditingExistingRecord ? (
        <div class="think-quick-input-operation-panel">
          <div class="think-quick-input-operation-panel__actions" role="group" aria-label="编辑记录操作方式">
            <Button
              size="small"
              variant={operationMode === 'edit' ? 'contained' : 'outlined'}
              onClick={() => onOperationModeChange('edit')}
            >
              编辑原记录
            </Button>
            <Button
              size="small"
              variant={operationMode === 'convert' ? 'contained' : 'outlined'}
              onClick={() => onOperationModeChange('convert')}
            >
              转换记录类型
            </Button>
            <Button
              size="small"
              variant={operationMode === 'duplicate' ? 'contained' : 'outlined'}
              onClick={() => onOperationModeChange('duplicate')}
            >
              另存为新记录
            </Button>
          </div>
          {helpText ? <div class="think-quick-input-operation-panel__hint">{helpText}</div> : null}
        </div>
      ) : null}

    </div>
  );
}
