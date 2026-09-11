/** @jsxImportSource preact */
import { h } from 'preact';
import type { RecordViewItem } from '@core/types/public';
import type { WhiteboardArchivedItem } from '@core/whiteboard/public';
import { ThinkButton, ThinkIconButton } from '@shared/ui/public';
import { buildWhiteboardRecordPresentation } from './WhiteboardRecordPresentation';

export interface WhiteboardArchivePanelProps {
  items: readonly WhiteboardArchivedItem[];
  recordsById: ReadonlyMap<string, RecordViewItem>;
  restoringItemIds: ReadonlySet<string>;
  onRestore: (itemId: string) => void | Promise<void>;
  onClose: () => void;
}

function archiveTitle(item: WhiteboardArchivedItem, recordsById: ReadonlyMap<string, RecordViewItem>): string {
  const record = recordsById.get(item.recordId);
  return record ? buildWhiteboardRecordPresentation(record).primaryText : `原记录不可用 · ${item.recordId}`;
}

export function WhiteboardArchivePanel({ items, recordsById, restoringItemIds, onRestore, onClose }: WhiteboardArchivePanelProps) {
  const sorted = [...items].sort((left, right) => right.archivedAt - left.archivedAt);
  return (
    <aside class="think-whiteboard-archive" aria-label="白板归档箱">
      <header class="think-whiteboard-archive__header">
        <div><strong>归档箱</strong><span>{items.length} 张</span></div>
        <ThinkIconButton size="sm" label="关闭归档箱" icon={<span aria-hidden="true">×</span>} onClick={onClose} />
      </header>
      <div class="think-whiteboard-archive__list">
        {sorted.length === 0 ? <div class="think-whiteboard-archive__empty">暂无归档卡片</div> : sorted.map((item) => (
          <div key={item.id} class="think-whiteboard-archive__row" data-whiteboard-archived-item-id={item.id}>
            <div class="think-whiteboard-archive__main">
              <div class="think-whiteboard-archive__title">{archiveTitle(item, recordsById)}</div>
              <div class="think-whiteboard-archive__meta">原位置 {Math.round(item.x)}, {Math.round(item.y)}</div>
            </div>
            <ThinkButton size="sm" variant="secondary" disabled={restoringItemIds.has(item.id)} onClick={() => void onRestore(item.id)}>
              {restoringItemIds.has(item.id) ? '恢复中…' : '恢复'}
            </ThinkButton>
          </div>
        ))}
      </div>
    </aside>
  );
}
