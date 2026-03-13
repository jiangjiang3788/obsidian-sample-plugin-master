/** @jsxImportSource preact */
import { h } from 'preact';
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
interface TaskExecutionRecordVM {
  id: string;
  doneDate?: string;
  timeLabel: string;
}

interface TaskExecutionTaskVM {
  key: string;
  itemId: string;
  title: string;
  count: number;
  records: TaskExecutionRecordVM[];
  recurrenceLabel: string;
}

interface TaskExecutionSectionVM {
  key: string;
  title: string;
  tasks: TaskExecutionTaskVM[];
}

interface TaskExecutionViewProps {
  taskExecutionModel?: { sections: TaskExecutionSectionVM[] } | null;
  onRecordExecution: (itemId: string) => void | Promise<void>;
  currentView: string;
}

interface ContextMenuState {
  x: number;
  y: number;
  taskKey: string;
}

export function TaskExecutionView({ taskExecutionModel, onRecordExecution, currentView }: TaskExecutionViewProps) {
  const [menu, setMenu] = useState<ContextMenuState | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const taskMap = useMemo(() => {
    const map = new Map<string, any>();
    for (const section of taskExecutionModel?.sections || []) {
      for (const task of section.tasks) map.set(task.key, task);
    }
    return map;
  }, [taskExecutionModel]);

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (!menuRef.current) return;
      if (menuRef.current.contains(event.target as Node)) return;
      setMenu(null);
    };
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenu(null);
    };
    window.addEventListener('mousedown', onPointerDown);
    window.addEventListener('keydown', onEscape);
    return () => {
      window.removeEventListener('mousedown', onPointerDown);
      window.removeEventListener('keydown', onEscape);
    };
  }, []);

  const openContextMenu = (event: MouseEvent, taskKey: string) => {
    event.preventDefault();
    setMenu({ x: event.clientX, y: event.clientY, taskKey });
  };

  const menuTask = menu ? taskMap.get(menu.taskKey) : null;

  return (
    <div class="task-execution-view">
      {(taskExecutionModel?.sections || []).map((section) => (
        <section class="task-execution-section" key={section.key}>
          <h3 class="task-execution-section-title">{section.title}</h3>
          <div class="task-execution-chip-grid">
            {section.tasks.map((task) => (
              <button
                key={task.key}
                type="button"
                class="task-execution-chip"
                title={`${task.title}${task.count > 0 ? ` · ${task.count}` : ''}`}
                onClick={() => onRecordExecution(task.itemId)}
                onContextMenu={(event) => openContextMenu(event as unknown as MouseEvent, task.key)}
              >
                {task.count > 0 ? `${task.title} · ${task.count}` : task.title}
              </button>
            ))}
          </div>
        </section>
      ))}

      {menu && menuTask && (
        <div
          ref={menuRef}
          class="task-execution-context-menu"
          style={{ left: `${menu.x}px`, top: `${menu.y}px` }}
        >
          <div class="task-execution-context-title">{menuTask.title}</div>
          <div class="task-execution-context-meta">{currentView}内完成 {menuTask.count} 次</div>
          <div class="task-execution-context-rule">{menuTask.recurrenceLabel}</div>
          <div class="task-execution-context-list">
            {menuTask.records.length > 0 ? menuTask.records.map((record: any) => (
              <div class="task-execution-context-item" key={record.id}>
                {record.timeLabel || record.doneDate || '已记录'}
              </div>
            )) : <div class="task-execution-context-item is-empty">暂无记录</div>}
          </div>
        </div>
      )}
    </div>
  );
}
