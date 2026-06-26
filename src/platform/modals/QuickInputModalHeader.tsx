/** @jsxImportSource preact */
import { h } from 'preact';

import { Box, ModalHeader } from '@shared/public';


export interface QuickInputModalHeaderProps {
  mode: 'create' | 'edit';
  currentBlockName: string;
  isTimerCreate: boolean;
  originalGestureHint?: string;
  outputPlanHint?: string;
  pathChangeHint?: string;
  onClose: () => void;
  onOriginalPointerClick: (event: MouseEvent) => void;
  onOriginalTouchEnd: (event: TouchEvent) => void;
}

function buildTitle(mode: 'create' | 'edit', currentBlockName: string, isTimerCreate: boolean): string {
  if (mode === 'edit') return `编辑记录 · ${currentBlockName}`;
  return isTimerCreate ? `开始新任务 · ${currentBlockName}` : `快速录入 · ${currentBlockName}`;
}

export function QuickInputModalHeader({
  mode,
  currentBlockName,
  isTimerCreate,
  originalGestureHint,
  outputPlanHint,
  pathChangeHint,
  onClose,
  onOriginalPointerClick,
  onOriginalTouchEnd,
}: QuickInputModalHeaderProps) {
  return (
    <Box sx={{ mb: '0.75rem' }}>
      <ModalHeader
        left={
          <h3
            style={{ margin: 0 }}
            title={originalGestureHint}
            onClick={mode === 'edit' ? (onOriginalPointerClick as any) : undefined}
            onTouchEnd={mode === 'edit' ? (onOriginalTouchEnd as any) : undefined}
          >
            {buildTitle(mode, currentBlockName, isTimerCreate)}
          </h3>
        }
        onClose={onClose}
        padding={0}
        borderBottom={false}
      />
      {(pathChangeHint || outputPlanHint) ? (
        <div
          style={{
            marginTop: '0.35rem',
            fontSize: '12px',
            color: pathChangeHint ? 'var(--text-warning)' : 'var(--text-muted)',
            lineHeight: 1.5,
            padding: pathChangeHint ? '0.45rem 0.55rem' : '0.25rem 0',
            border: pathChangeHint ? '1px solid var(--background-modifier-border)' : undefined,
            borderRadius: pathChangeHint ? '8px' : undefined,
            background: pathChangeHint ? 'var(--background-secondary)' : undefined,
          }}
        >
          <div style={{ fontWeight: pathChangeHint ? 600 : 400, marginBottom: pathChangeHint ? '0.15rem' : 0 }}>
            {pathChangeHint ? '保存位置预览：将迁移保存' : '保存位置预览'}
          </div>
          <div>{pathChangeHint || outputPlanHint}</div>
        </div>
      ) : null}
    </Box>
  );
}
