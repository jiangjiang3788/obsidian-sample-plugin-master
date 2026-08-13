// src/platform/obsidian/modals/AiBatchConfirmRecordHeader.tsx
/** @jsxImportSource preact */
import { ModalHeader } from '@shared/ui/public';
import type { AiBatchConfirmRecordItem } from './AiBatchConfirmModel';
import { shortDisplay } from './AiBatchConfirmModel';

export interface AiBatchConfirmRecordHeaderProps {
  title: string;
  currentIndex: number;
  record: AiBatchConfirmRecordItem;
  onClose: () => void;
}

export function AiBatchConfirmRecordHeader({ title, currentIndex, record, onClose }: AiBatchConfirmRecordHeaderProps) {
  return (
    <ModalHeader
      left={
        <div className="think-ai-batch-header">
          <div className="think-ai-batch-header__title">
            <strong>{title}</strong>
            <span>第 {currentIndex + 1} 条</span>
            {record.saved ? <span className="is-success">已保存</span> : null}
            {record.skipped ? <span>已跳过</span> : null}
          </div>
          <div className="think-ai-batch-header__meta">
            <span>目标 {shortDisplay(record.goalLabel, '未匹配')}</span>
            <span>预设 {shortDisplay(record.presetLabel, '默认')}</span>
            <span>主题 {shortDisplay(record.themePath, '未指定')}</span>
          </div>
        </div>
      }
      onClose={onClose}
    />
  );
}
