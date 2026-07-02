/** @jsxImportSource preact */
import { h } from 'preact';
import type { RefObject } from 'preact';
import type { OpenRecordHandler, OpenRecordOriginHandler } from '@shared/types/public';
import { createRecordGestureHandlers } from '@shared/ui/public';
import type { TaskExecutionMenuState, TaskExecutionTaskVM } from './TaskExecutionViewModel';
import { buildTaskExecutionCountLabel, getTaskExecutionRecordLabel } from './TaskExecutionViewModel';

interface TaskExecutionContextMenuProps {
  menu: TaskExecutionMenuState;
  selectedTask: TaskExecutionTaskVM;
  currentView: string;
  menuRef: RefObject<HTMLDivElement | null>;
  onOpenRecord?: OpenRecordHandler;
  onOpenRecordOrigin?: OpenRecordOriginHandler;
  onClose: () => void;
}

export function TaskExecutionContextMenu(props: TaskExecutionContextMenuProps) {
  const { menu, selectedTask, currentView, menuRef, onOpenRecord, onOpenRecordOrigin, onClose } = props;

  return (
    <div class="task-execution-context-menu" ref={menuRef} style={{ left: `${menu.x}px`, top: `${menu.y}px` }}>
      <div class="task-execution-context-title">{selectedTask.title}</div>
      <div class="task-execution-context-meta">{buildTaskExecutionCountLabel(currentView, selectedTask.count)}</div>
      <div class="task-execution-context-rule">{selectedTask.recurrenceLabel}</div>
      <div class="task-execution-context-list">
        {selectedTask.records.length > 0 ? selectedTask.records.map((record) => {
          const gesture = createRecordGestureHandlers({
            item: record.item,
            onOpenOrigin: onOpenRecordOrigin,
            onPrimary: () => {
              void onOpenRecord?.(record.item);
              onClose();
            },
          });
          return (
            <a
              key={record.id}
              class="task-execution-context-link"
              href="#"
              onClick={(event) => { gesture.onClick(event as any); onClose(); }}
              onDblClick={(event) => { gesture.onDblClick(event as any); onClose(); }}
              onTouchEnd={(event) => { gesture.onTouchEnd(event as any); }}
            >
              {getTaskExecutionRecordLabel(record)}
            </a>
          );
        }) : <div class="task-execution-context-empty">暂无记录</div>}
      </div>
    </div>
  );
}
