// src/features/dashboard/ui/TableView.tsx
import { h } from 'preact';
import { useContext } from 'preact/hooks'; // [REFACTOR] Import useContext hook.
import { Item, readField } from '@core/domain/schema';
import { makeObsUri } from '@core/utils/obsidian';
import { EMPTY_LABEL } from '@core/domain/constants';
import { TaskCheckbox } from '@shared/components/TaskCheckbox';
import { DashboardContext } from './DashboardContext'; // [REFACTOR] Import the context.

interface TableViewProps {
  items: Item[];
  rowField: string;
  colField: string;
  // [REFACTOR] onMarkItemDone prop is no longer needed.
}

const isDone = (k?: string) => /\/done$/i.test(k || '');

export function TableView({ items, rowField, colField }: TableViewProps) {
  // [REFACTOR] Consume the context to get the required function.
  const { onMarkItemDone } = useContext(DashboardContext);

  if (!rowField || !colField)
    return <div>（TableView 需要配置 rowField 和 colField）</div>;

  const rowVals: string[] = [];
  const colVals: string[] = [];
  const matrix: Record<string, Record<string, Item[]>> = {};

  items.forEach(it => {
    const r = String(readField(it, rowField) ?? EMPTY_LABEL);
    const c = String(readField(it, colField) ?? EMPTY_LABEL);
    if (!matrix[r]) {
      matrix[r] = {};
      rowVals.push(r);
    }
    if (!matrix[r][c]) matrix[r][c] = [];
    matrix[r][c].push(it);
    if (!colVals.includes(c)) colVals.push(c);
  });

  rowVals.sort();
  colVals.sort();

  function renderCellItem(item: Item) {
    if (item.type === 'task') {
      const done = isDone(item.categoryKey);
      return (
        <span>
          <TaskCheckbox
            done={done}
            // [REFACTOR] Use the function obtained from the context.
            onMarkDone={() => onMarkItemDone(item.id)}
          />
          {item.icon && <span class="task-icon">{item.icon}</span>}
          <a href={makeObsUri(item)} target="_blank" rel="noopener" class={done ? 'task-done' : ''}>
            {item.title}
          </a>
        </span>
      );
    }
    return (
      <a href={makeObsUri(item)} target="_blank" rel="noopener">
        {item.title}
      </a>
    );
  }

  return (
    <table class="think-table">
      <thead>
        <tr>
          <th>{rowField}</th>
          {colVals.map(c => (<th key={c}>{c}</th>))}
        </tr>
      </thead>
      <tbody>
        {rowVals.map(r => (
          <tr key={r}>
            <td><strong>{r}</strong></td>
            {colVals.map(c => {
              const cellItems = matrix[r]?.[c] || [];
              return !cellItems.length ? (
                <td key={c} class="empty" />
              ) : (
                <td key={c}>
                  {cellItems.map(it => (<div key={it.id}>{renderCellItem(it)}</div>))}
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}