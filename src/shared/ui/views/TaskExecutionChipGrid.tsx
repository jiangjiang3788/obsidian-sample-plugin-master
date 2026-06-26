/** @jsxImportSource preact */
import { h } from 'preact';
import type { TaskExecutionSectionVM } from './TaskExecutionViewModel';
import { getTaskExecutionChipToneClass } from './TaskExecutionViewModel';

interface TaskExecutionChipGridProps {
  sections: TaskExecutionSectionVM[];
  onMarkDone?: (itemId: string) => void | Promise<void>;
  onOpenMenu: (event: MouseEvent, taskKey: string) => void;
}

export function TaskExecutionChipGrid({ sections, onMarkDone, onOpenMenu }: TaskExecutionChipGridProps) {
  return (
    <>
      {sections.map((section) => (
        <section class="task-execution-section" key={section.key}>
          <div class="task-execution-section-header">
            <h2 class="task-execution-section-title">{section.title}</h2>
          </div>

          <div class="task-execution-section-body">
            {(section.groups || []).map((group) => (
              <div class="task-execution-subsection" key={group.key}>
                <div class="task-execution-subsection-body">
                  <div class="task-execution-subsection-title">{group.title}</div>
                  <div class="task-execution-chip-grid">
                    {(group.tasks || []).map((task) => (
                      <button
                        key={task.key}
                        type="button"
                        class={`task-execution-chip ${getTaskExecutionChipToneClass(task.recurrenceLabel)}`}
                        title={task.recurrenceLabel || task.title}
                        onClick={() => onMarkDone?.(task.itemId)}
                        onContextMenu={(event) => onOpenMenu(event as unknown as MouseEvent, task.key)}
                      >
                        <span class="task-execution-chip-label">{task.title}</span>
                        {task.count > 0 && <span class="task-execution-chip-count">·{task.count}</span>}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}
    </>
  );
}
