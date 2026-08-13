// src/platform/obsidian/modals/AiBatchConfirmSidebar.tsx
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
  blocks: any[];
  currentIndex: number;
  savedCount: number;
  pendingCount: number;
  onSelect: (index: number) => void;
  onSaveAll: () => void;
}

export function AiBatchConfirmSidebar({ records, blocks, currentIndex, savedCount, pendingCount, onSelect, onSaveAll }: AiBatchConfirmSidebarProps) {
  return (
    <aside className="think-ai-batch-sidebar">
      <div className="think-ai-batch-sidebar__header">
        <strong>AI 识别结果</strong>
        <span>{records.length} 条 · 已保存 {savedCount}</span>
      </div>
      <div className="think-ai-batch-sidebar__list">
        {records.map((record, index) => {
          const block = blocks.find((entry) => entry.id === record.blockId);
          const active = index === currentIndex;
          return (
            <button
              type="button"
              key={record.id}
              className={`think-ai-batch-sidebar__item${active ? ' is-selected' : ''}${record.skipped ? ' is-muted' : ''}`}
              onClick={() => onSelect(index)}
            >
              <span className="think-ai-batch-sidebar__status" aria-hidden="true">
                {record.saved ? <CheckCircleIcon fontSize="small" /> : record.skipped ? <DeleteIcon fontSize="small" /> : <RadioButtonUncheckedIcon fontSize="small" />}
              </span>
              <span className="think-ai-batch-sidebar__text">
                <strong>{block?.name || '未知类型'}</strong>
                <span>{shortDisplay(record.goalLabel, '未匹配目标', 18)} · {shortDisplay(record.presetLabel, '默认预设', 18)}</span>
                <span>{record.cmd.fieldValues?.内容?.slice(0, 20) || record.cmd.rawText?.slice(0, 20) || `记录 ${index + 1}`}</span>
              </span>
            </button>
          );
        })}
      </div>
      <div className="think-ai-batch-sidebar__footer">
        <ThinkButton size="sm" onClick={onSaveAll} disabled={pendingCount === 0}>保存全部 ({pendingCount})</ThinkButton>
      </div>
    </aside>
  );
}
