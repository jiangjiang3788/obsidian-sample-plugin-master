/** @jsxImportSource preact */
import { h } from 'preact';
import { useMemo, useState } from 'preact/hooks';
import type { RecordViewItem } from '@core/types/public';
import {
  TASK_QUADRANT_PRESENTATION,
  getTaskStatusPresentation,
  type EisenhowerQuadrant,
} from '@core/records/public';
import type { OpenRecordHandler, UpdateTaskQuadrantHandler } from '@shared/types/public';
import { buildEisenhowerColumns, EISENHOWER_MAIN_QUADRANTS } from './EisenhowerViewModel';

export interface EisenhowerViewProps {
  items: RecordViewItem[];
  showUnclassified?: boolean;
  onOpenRecord?: OpenRecordHandler;
  onTaskQuadrantChange?: UpdateTaskQuadrantHandler;
  onNotice?: (message: string) => void;
}

function TaskCard({ item, onOpenRecord }: { item: RecordViewItem; onOpenRecord?: OpenRecordHandler }) {
  const status = getTaskStatusPresentation(item.status);
  const title = item.title || item.content || '未命名任务';
  return (
    <button
      type="button"
      className="think-eisenhower-card"
      draggable
      onDragStart={(event) => {
        event.dataTransfer?.setData('text/plain', item.id);
        if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move';
      }}
      onClick={() => onOpenRecord?.(item)}
      title="点击编辑；拖到其他象限可重新分类"
    >
      <span className="think-eisenhower-card__status" aria-hidden="true">{status.emoji}</span>
      <span className="think-eisenhower-card__title">{title}</span>
    </button>
  );
}

function QuadrantZone({
  quadrant,
  items,
  active,
  onDropTask,
  onOpenRecord,
}: {
  quadrant: EisenhowerQuadrant;
  items: RecordViewItem[];
  active: boolean;
  onDropTask: (taskId: string, quadrant: EisenhowerQuadrant) => Promise<void>;
  onOpenRecord?: OpenRecordHandler;
}) {
  const meta = TASK_QUADRANT_PRESENTATION[quadrant];
  return (
    <section
      className={`think-eisenhower-zone is-${quadrant}${active ? ' is-dragover' : ''}`}
      data-quadrant={quadrant}
      onDragOver={(event) => { event.preventDefault(); }}
      onDrop={(event) => {
        event.preventDefault();
        const taskId = event.dataTransfer?.getData('text/plain') || '';
        if (taskId) void onDropTask(taskId, quadrant);
      }}
    >
      <header className="think-eisenhower-zone__header">
        <span>{meta.emoji} {meta.label}</span>
        <span className="think-eisenhower-zone__count">{items.length}</span>
      </header>
      <div className="think-eisenhower-zone__cards">
        {items.length ? items.map((item) => (
          <TaskCard key={item.id} item={item} onOpenRecord={onOpenRecord} />
        )) : <div className="think-eisenhower-zone__empty">拖任务到这里</div>}
      </div>
    </section>
  );
}

export function EisenhowerView({
  items,
  showUnclassified = true,
  onOpenRecord,
  onTaskQuadrantChange,
  onNotice,
}: EisenhowerViewProps) {
  const columns = useMemo(() => buildEisenhowerColumns(items), [items]);
  const [pendingTaskId, setPendingTaskId] = useState<string | null>(null);

  const moveTask = async (taskId: string, quadrant: EisenhowerQuadrant) => {
    if (!onTaskQuadrantChange || pendingTaskId) return;
    setPendingTaskId(taskId);
    try {
      await onTaskQuadrantChange(taskId, quadrant);
    } catch (error) {
      onNotice?.(error instanceof Error ? error.message : '四象限分类更新失败');
    } finally {
      setPendingTaskId(null);
    }
  };

  const openCount = Object.values(columns).reduce((total, rows) => total + rows.length, 0);

  return (
    <div className="think-eisenhower-view">
      <div className="think-eisenhower-summary">
        <strong>四象限</strong>
        <span>仅显示未完成任务 · {openCount} 条</span>
      </div>
      {showUnclassified ? (
        <QuadrantZone
          quadrant="unclassified"
          items={columns.unclassified}
          active={Boolean(pendingTaskId)}
          onDropTask={moveTask}
          onOpenRecord={onOpenRecord}
        />
      ) : null}
      <div className="think-eisenhower-grid">
        {EISENHOWER_MAIN_QUADRANTS.map((quadrant) => (
          <QuadrantZone
            key={quadrant}
            quadrant={quadrant}
            items={columns[quadrant]}
            active={Boolean(pendingTaskId)}
            onDropTask={moveTask}
            onOpenRecord={onOpenRecord}
          />
        ))}
      </div>
    </div>
  );
}
