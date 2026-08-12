/** @jsxImportSource preact */
import { h } from 'preact';
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import type { RefObject } from 'preact';
import type { OpenRecordHandler, OpenRecordOriginHandler } from '@shared/types/public';
import { createRecordGestureHandlers, hasPlatformModifier, isKeyboardActivation, RECORD_GESTURE_HINT, stopInteractionEvent } from '@shared/ui/public';
import type { EnergyTaskListItemVM, EnergyTaskListModel } from '../models/energyTaskListModel';

interface Props {
  model: EnergyTaskListModel;
  currentView: string;
  onStartTask?: (task: EnergyTaskListItemVM) => void | Promise<void>;
  onOpenRecord?: OpenRecordHandler;
  onOpenRecordOrigin?: OpenRecordOriginHandler;
}

interface MenuState {
  x: number;
  y: number;
  taskId: string;
}

function recordLabel(record: EnergyTaskListItemVM['records'][number]): string {
  return record.timeLabel || record.doneDate || '查看记录';
}

function TaskMenu({ menu, task, currentView, menuRef, onOpenRecord, onOpenRecordOrigin, onClose }: {
  menu: MenuState;
  task: EnergyTaskListItemVM;
  currentView: string;
  menuRef: RefObject<HTMLDivElement>;
  onOpenRecord?: OpenRecordHandler;
  onOpenRecordOrigin?: OpenRecordOriginHandler;
  onClose: () => void;
}) {
  const editTask = () => {
    void onOpenRecord?.(task.item);
    onClose();
  };
  const taskGesture = createRecordGestureHandlers({
    item: task.item,
    onPrimary: editTask,
    onOpenOrigin: onOpenRecordOrigin ? (originItem) => {
      void onOpenRecordOrigin(originItem);
      onClose();
    } : undefined,
  });
  return (
    <div class="think-energy-task-list__menu" ref={menuRef} style={`left:${menu.x}px;top:${menu.y}px;`}>
      <div class="think-energy-task-list__menu-title">{task.title}</div>
      <button
        type="button"
        class="think-energy-task-list__menu-action"
        title={RECORD_GESTURE_HINT}
        onClick={taskGesture.onClick}
        onDblClick={taskGesture.onDblClick}
        onTouchEnd={taskGesture.onTouchEnd}
        onKeyDown={taskGesture.onKeyDown}
      >编辑任务</button>
      <div class="think-energy-task-list__menu-meta">{currentView}内完成 {task.count} 次</div>
      {task.recurrenceLabel && <div class="think-energy-task-list__menu-meta">{task.recurrenceLabel}</div>}
      <div class="think-energy-task-list__menu-records">
        {task.records.length > 0 ? task.records.map((record) => {
          const gesture = createRecordGestureHandlers({
            item: record.item,
            onOpenOrigin: onOpenRecordOrigin ? (originItem) => {
              void onOpenRecordOrigin(originItem);
              onClose();
            } : undefined,
            onPrimary: () => {
              void onOpenRecord?.(record.item);
              onClose();
            },
          });
          return (
            <a
              key={record.id}
              class="think-energy-task-list__menu-record"
              href="#"
              title={RECORD_GESTURE_HINT}
              onClick={gesture.onClick}
              onDblClick={gesture.onDblClick}
              onTouchEnd={gesture.onTouchEnd}
              onKeyDown={gesture.onKeyDown}
            >{recordLabel(record)}</a>
          );
        }) : <div class="think-energy-task-list__menu-empty">暂无历史记录</div>}
      </div>
    </div>
  );
}

export function EnergyTaskList({ model, currentView, onStartTask, onOpenRecord, onOpenRecordOrigin }: Props) {
  const [menu, setMenu] = useState<MenuState | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const taskMap = useMemo(() => {
    const map = new Map<string, EnergyTaskListItemVM>();
    for (const goal of model.goals) {
      for (const row of goal.rows) {
        for (const task of row.tasks) map.set(task.itemId, task);
      }
    }
    return map;
  }, [model]);
  const selectedTask = menu ? taskMap.get(menu.taskId) || null : null;

  useEffect(() => {
    const onDown = (event: MouseEvent) => {
      if (!menuRef.current || menuRef.current.contains(event.target as Node)) return;
      setMenu(null);
    };
    const onEsc = (event: KeyboardEvent) => { if (event.key === 'Escape') setMenu(null); };
    window.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onEsc);
    return () => {
      window.removeEventListener('mousedown', onDown);
      window.removeEventListener('keydown', onEsc);
    };
  }, []);

  return (
    <section class="think-energy-task-list" aria-label="任务">
      <div class="think-energy-task-list__goals">
        {model.goals.length > 0 ? model.goals.map((goal) => (
          <section class="think-energy-task-list__goal-group" key={goal.key}>
            <div class="think-energy-task-list__goal-title">{goal.label}</div>
            <div class="think-energy-task-list__rows">
              {goal.rows.map((row) => (
                <div class={`think-energy-task-list__row think-energy-task-list__row--${row.key}`} key={row.key}>
                  <div class="think-energy-task-list__row-label" title={row.label} aria-label={row.label}><span aria-hidden="true">{row.emoji}</span></div>
                  <div class="think-energy-task-list__items">
                    {row.tasks.map((task) => (
                      <button
                        key={task.itemId}
                        type="button"
                        class={`think-energy-task-list__item think-energy-task-list__item--${task.cadence}`}
                        title={`${task.title} · 点击开始/继续计时 · Ctrl/⌘+点击打开原文 · 右键更多`}
                        onClick={(event) => {
                          if (hasPlatformModifier(event) && onOpenRecordOrigin) {
                            stopInteractionEvent(event);
                            void onOpenRecordOrigin(task.item);
                            return;
                          }
                          void onStartTask?.(task);
                        }}
                        onKeyDown={(event: KeyboardEvent) => {
                          if (!onOpenRecordOrigin || !hasPlatformModifier(event) || !isKeyboardActivation(event)) return;
                          stopInteractionEvent(event);
                          void onOpenRecordOrigin(task.item);
                        }}
                        onContextMenu={(event) => {
                          event.preventDefault();
                          setMenu({ x: event.clientX, y: event.clientY, taskId: task.itemId });
                        }}
                      >
                        <span class="think-energy-task-list__task">{task.title}</span>
                        {task.recurring && task.count > 0 && <span class="think-energy-task-list__count">·{task.count}</span>}
                        {task.energyMatched && <span class="think-energy-task-list__energy-match" aria-label="当前精力更匹配" title="当前精力更匹配">★</span>}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )) : <div class="think-energy-task-list__empty-state">当前没有未完成任务。</div>}
      </div>
      {menu && selectedTask && (
        <TaskMenu
          menu={menu}
          task={selectedTask}
          currentView={currentView}
          menuRef={menuRef}
          onOpenRecord={onOpenRecord}
          onOpenRecordOrigin={onOpenRecordOrigin}
          onClose={() => setMenu(null)}
        />
      )}
    </section>
  );
}
