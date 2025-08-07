// views/TableView.tsx
// 精简复选框逻辑，复用 TaskCheckbox
import { h } from 'preact';
import { JSX } from 'preact';
import { Item, readField } from '@core/domain/schema';
import { DataStore } from '@core/services/dataStore';
import { makeObsUri } from '@core/utils/obsidian';
import { EMPTY_LABEL } from '@core/domain/constants';
import { TaskCheckbox } from '@shared/components/TaskCheckbox';   // ★ 新增

interface TableViewProps {
  items: Item[];
  rowField: string;
  colField: string;
}

export function TableView({ items, rowField, colField }: TableViewProps) {
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

  return (
    <table class="think-table">
      <thead>
        <tr>
          <th>{rowField}</th>
          {colVals.map(c => (
            <th key={c}>{c}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rowVals.map(r => (
          <tr key={r}>
            <td>
              <strong>{r}</strong>
            </td>
            {colVals.map(c => {
              const cellItems = matrix[r]?.[c] || [];
              return !cellItems.length ? (
                <td key={c} class="empty" />
              ) : (
                <td key={c}>
                  {cellItems.map(it => (
                    <div key={it.id}>{renderCellItem(it)}</div>
                  ))}
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/* ---------- 单元格内渲染 ---------- */
function renderCellItem(item: Item) {
  if (item.type === 'task') {
    const isDone = item.status === 'done';
    return (
      <span>
        <TaskCheckbox
          done={isDone}
          onMarkDone={() => DataStore.instance.markItemDone(item.id)}
        />
        {item.icon && <span class="task-icon">{item.icon}</span>}
        <a href={makeObsUri(item.id)} target="_blank" rel="noopener">
          {item.title}
        </a>
      </span>
    );
  }
  return (
    <a href={makeObsUri(item.id)} target="_blank" rel="noopener">
      {item.title}
    </a>
  );
}