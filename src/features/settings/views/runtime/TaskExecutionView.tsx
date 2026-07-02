/** @jsxImportSource preact */
import { h } from 'preact';
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import type { OpenRecordHandler, OpenRecordOriginHandler } from '@shared/types/public';

import { TaskExecutionChipGrid } from './TaskExecutionChipGrid';
import { TaskExecutionContextMenu } from './TaskExecutionContextMenu';
import type { TaskExecutionMenuState, TaskExecutionModelVM } from './TaskExecutionViewModel';
import { buildTaskExecutionTaskMap, getTaskExecutionSelectedTask } from './TaskExecutionViewModel';

interface TaskExecutionViewProps {
  currentView: string;
  taskExecutionModel?: TaskExecutionModelVM | null;
  onMarkDone?: (itemId: string) => void | Promise<void>;
  onOpenRecord?: OpenRecordHandler;
  onOpenRecordOrigin?: OpenRecordOriginHandler;
}

export function TaskExecutionView({ currentView, taskExecutionModel, onMarkDone, onOpenRecord, onOpenRecordOrigin }: TaskExecutionViewProps) {
  const [menu, setMenu] = useState<TaskExecutionMenuState | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const taskMap = useMemo(() => buildTaskExecutionTaskMap(taskExecutionModel), [taskExecutionModel]);
  const selectedTask = useMemo(() => getTaskExecutionSelectedTask({ menu, taskMap }), [menu, taskMap]);

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

  return (
    <div class="task-execution-view">
      <TaskExecutionChipGrid
        sections={taskExecutionModel?.sections || []}
        onMarkDone={onMarkDone}
        onOpenMenu={openMenu}
      />

      {menu && selectedTask && (
        <TaskExecutionContextMenu
          menu={menu}
          selectedTask={selectedTask}
          currentView={currentView}
          menuRef={menuRef}
          onOpenRecord={onOpenRecord}
          onOpenRecordOrigin={onOpenRecordOrigin}
          onClose={() => setMenu(null)}
        />
      )}
    </div>
  );
}
