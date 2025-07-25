
// views/TableView.tsx

import { JSX, h } from 'preact';
import { Item, readField } from '../config/schema';
import { DataStore } from '../data/store';
import './styles.css';
import { makeObsUri } from '../utils/obsidian';
import { EMPTY_LABEL } from '../config/constants';

interface TableViewProps {
  items: Item[];
  rowField: string;
  colField: string;
}

export function TableView({ items, rowField, colField }: TableViewProps) {
  if (!rowField || !colField) return <div>（TableView 需要配置 rowField 和 colField）</div>;

  const rowValues: string[] = [];
  const colValues: string[] = [];
  const matrix: Record<string, Record<string, Item[]>> = {};

  for (const item of items) {
    const rv = readField(item, rowField) ?? EMPTY_LABEL;
    const cv = readField(item, colField) ?? EMPTY_LABEL;
    const rKey = String(rv);
    const cKey = String(cv);

    if (!matrix[rKey]) { matrix[rKey] = {}; rowValues.push(rKey); }
    if (!matrix[rKey][cKey]) matrix[rKey][cKey] = [];
    matrix[rKey][cKey].push(item);
    if (!colValues.includes(cKey)) colValues.push(cKey);
  }

  rowValues.sort();
  colValues.sort();

  return (
    <table class="think-table">
      <thead>
        <tr>
          <th>{rowField}</th>
          {colValues.map(col => <th key={col}>{col}</th>)}
        </tr>
      </thead>
      <tbody>
        {rowValues.map(row => (
          <tr key={row}>
            <td><strong>{row}</strong></td>
            {colValues.map(col => {
              const cellItems = matrix[row]?.[col] || [];
              return cellItems.length === 0 ? (
                <td key={col} class="empty" />
              ) : (
                <td key={col}>
                  {cellItems.map(it => <div key={it.id}>{renderItemCell(it)}</div>)}
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function renderItemCell(item: Item) {
  if (item.type === 'task') {
    const isDone = item.status === 'done';
    const checkboxId = 'cb-' + item.id.replace(/[^a-zA-Z0-9]/g, '_');

    const handleChange: JSX.GenericEventHandler<HTMLInputElement> = evt => {
      if (evt.currentTarget.checked) DataStore.instance.markItemDone(item.id);
    };

    return (
      <span>
        {!isDone && (
          <input type="checkbox" id={checkboxId} class="task-checkbox" onChange={handleChange} />
        )}
        {isDone && (
          <input
            type="checkbox"
            id={checkboxId}
            class="task-checkbox done"
            checked
            onClick={e => e.preventDefault()}
          />
        )}
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
