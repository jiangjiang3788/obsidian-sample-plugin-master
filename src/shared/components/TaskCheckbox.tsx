/** @jsxImportSource preact */
import { h } from 'preact';

interface Props {
  done: boolean;
  onMarkDone?: () => void;
}

export function TaskCheckbox({ done, onMarkDone }: Props) {
  const cls = 'task-checkbox' + (done ? ' done' : '');
  return (
    <input
      type="checkbox"
      class={cls}
      checked={done}
      onClick={done ? e => e.preventDefault() : undefined}
      onChange={() => !done && onMarkDone?.()}
    />
  );
}
