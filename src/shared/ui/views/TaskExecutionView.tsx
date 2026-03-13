/** @jsxImportSource preact */
import { h } from 'preact';
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { makeObsUri } from '@core/public';
import type { Item } from '@core/public';

interface TaskExecutionRecordVM {
  id: string;
  doneDate?: string;
  timeLabel: string;
  item: Item;
}

interface TaskExecutionTaskVM {
  key: string;
  itemId: string;
  title: string;
  count: number;
  recurrenceLabel: string;
  records: TaskExecutionRecordVM[];
}

interface TaskExecutionSubgroupVM {
  key: string;
  title: string;
  tasks: TaskExecutionTaskVM[];
}

interface TaskExecutionSectionVM {
  key: string;
  title: string;
  groups: TaskExecutionSubgroupVM[];
}

interface TaskExecutionViewProps {
  app: any;
  currentView: string;
  taskExecutionModel?: { sections: TaskExecutionSectionVM[] } | null;
  onRecordExecution: (itemId: string) => void | Promise<void>;
}

interface MenuState {
  x: number;
  y: number;
  taskKey: string;
}

export function TaskExecutionView({ app, currentView, taskExecutionModel, onRecordExecution }: TaskExecutionViewProps) {
  const [menu, setMenu] = useState<MenuState | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const vaultName = app?.vault?.getName?.() || '';

  const taskMap = useMemo(() => {
    const map = new Map<string, TaskExecutionTaskVM>();
    for (const section of taskExecutionModel?.sections || []) {
      for (const group of section.groups || []) {
        for (const task of group.tasks || []) map.set(task.key, task);
      }
    }
    return map;
  }, [taskExecutionModel]);

  useEffect(() => {
    const onDown = (event: MouseEvent) => {
      if (!menuRef.current) return;
      if (menuRef.current.contains(event.target as Node)) return;
      setMenu(null);
    };
    const onEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenu(null);
    };
    window.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onEsc);
    return () => {
      window.removeEventListener('mousedown', onDown);
      window.removeEventListener('keydown', onEsc);
    };
  }, []);

  const openMenu = (event: MouseEvent, taskKey: string) => {
    event.preventDefault();
    setMenu({ x: event.clientX, y: event.clientY, taskKey });
  };

  const selectedTask = menu ? taskMap.get(menu.taskKey) : null;

  return (
    <div class="task-execution-view">
      {(taskExecutionModel?.sections || []).map((section) => (
        <section class="task-execution-section" key={section.key}>
          <h2 class="task-execution-section-title">{section.title}</h2>
          {(section.groups || []).map((group) => (
            <div class="task-execution-subsection" key={group.key}>
              {group.title ? <h3 class="task-execution-subsection-title">{group.title}</h3> : null}
              <div class="task-execution-chip-grid">
                {(group.tasks || []).map((task) => (
                  <button
                    key={task.key}
                    type="button"
                    class="task-execution-chip"
                    title={task.recurrenceLabel || task.title}
                    onClick={() => onRecordExecution(task.itemId)}
                    onContextMenu={(event) => openMenu(event as unknown as MouseEvent, task.key)}
                  >
                    {task.count > 0 ? `${task.title} · ${task.count}` : task.title}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </section>
      ))}

      {menu && selectedTask && (
        <div class="task-execution-context-menu" ref={menuRef} style={{ left: `${menu.x}px`, top: `${menu.y}px` }}>
          <div class="task-execution-context-title">{selectedTask.title}</div>
          <div class="task-execution-context-meta">{currentView}内完成 {selectedTask.count} 次</div>
          <div class="task-execution-context-rule">{selectedTask.recurrenceLabel}</div>
          <div class="task-execution-context-list">
            {selectedTask.records.length > 0 ? selectedTask.records.map((record) => (
              <a
                key={record.id}
                class="task-execution-context-link"
                href={makeObsUri(record.item, vaultName)}
                onClick={() => setMenu(null)}
              >
                {record.timeLabel || record.doneDate || '查看记录'}
              </a>
            )) : <div class="task-execution-context-empty">暂无记录</div>}
          </div>
        </div>
      )}
    </div>
  );
}
