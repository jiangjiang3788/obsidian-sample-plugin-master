// scr/views/common/TaskCheckbox.tsx
import { h, JSX } from 'preact';

interface TaskCheckboxProps {
  done: boolean;
  /** 勾选后触发（仅在未完成 → 完成时调用） */
  onMarkDone?: () => void;
}

export function TaskCheckbox({ done, onMarkDone }: TaskCheckboxProps) {
  const base = 'task-checkbox' + (done ? ' done' : '');
  const handle: JSX.GenericEventHandler<HTMLInputElement> = e => {
    if (!done && onMarkDone) onMarkDone();
  };

  return (
    <input
      type="checkbox"
      class={base}
      checked={done}
      onClick={done ? e => e.preventDefault() : undefined}
      onChange={handle}
    />
  );
}