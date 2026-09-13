/** @jsxImportSource preact */
import {
  CheckCircleIcon,
  DeleteIcon,
  RadioButtonUncheckedIcon,
  ThinkButton,
} from '@shared/ui/public';

import type { AiBatchConfirmRecordItem } from './AiBatchConfirmModel';
import { shortDisplay } from './AiBatchConfirmModel';

export interface AiBatchConfirmSidebarProps {
  records: AiBatchConfirmRecordItem[];
  recordTypes: Array<{ id?: string; name?: string }>;
  currentIndex: number;
  savedCount: number;
  pendingCount: number;
  isBusy: boolean;
  isSavingAll: boolean;
  onSelect: (index: number) => void;
  onSaveAll: () => void;
}

export function AiBatchConfirmSidebar({
  records,
  recordTypes,
  currentIndex,
  savedCount,
  pendingCount,
  isBusy,
  isSavingAll,
  onSelect,
  onSaveAll,
}: AiBatchConfirmSidebarProps) {
  return (
    <aside className="think-ai-batch-sidebar">
      <div className="think-ai-batch-sidebar__header">
        <strong>AI 识别结果</strong>
        <span>{records.length} 条 · 已保存 {savedCount}</span>
      </div>
      <div className="think-ai-batch-sidebar__list">
        {records.map((record, index) => {
          const recordType = recordTypes.find((entry) => entry.id === record.recordTypeId);
          const active = index === currentIndex;
          return (
            <button
              type="button"
              key={record.id}
              className={`think-ai-batch-sidebar__item${active ? ' is-selected' : ''}${record.skipped ? ' is-muted' : ''}`}
              aria-current={active ? 'true' : undefined}
              onClick={() => onSelect(index)}
              disabled={isBusy}
            >
              <span className="think-ai-batch-sidebar__status" aria-hidden="true">
                {record.saved ? <CheckCircleIcon fontSize="small" /> : record.skipped ? <DeleteIcon fontSize="small" /> : <RadioButtonUncheckedIcon fontSize="small" />}
              </span>
              <span className="think-ai-batch-sidebar__text">
                <strong>{recordType?.name || '未知类型'}</strong>
                <span>{shortDisplay(record.goalLabel, '未匹配目标', 18)} · {shortDisplay(record.presetLabel, '默认预设', 18)}</span>
                <span>{record.cmd.fieldValues?.内容?.slice(0, 20) || record.cmd.rawText?.slice(0, 20) || `记录 ${index + 1}`}</span>
              </span>
            </button>
          );
        })}
      </div>
      <div className="think-ai-batch-sidebar__footer">
        <ThinkButton
          size="sm"
          loading={isSavingAll}
          data-ai-batch-action="save-all"
          onClick={onSaveAll}
          disabled={isBusy || pendingCount === 0}
          aria-label="保存全部 AI 识别记录"
        >{isSavingAll ? '保存中…' : `保存全部 (${pendingCount})`}</ThinkButton>
      </div>
    </aside>
  );
}
