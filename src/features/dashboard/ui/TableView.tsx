// src/features/dashboard/ui/TableView.tsx
/** @jsxImportSource preact */
import { h } from 'preact';
import { Item, readField } from '@core/domain/schema';
import { makeObsUri } from '@core/utils/obsidian';
import { EMPTY_LABEL } from '@core/domain/constants';
import { TaskCheckbox } from '@shared/components/TaskCheckbox';
import { DataStore } from '@core/services/dataStore';
import { TaskSendToTimerButton } from '@shared/components/TaskSendToTimerButton'; // 确认导入的是新按钮

interface TableViewProps {
    items: Item[];
    rowField: string;
    colField: string;
}

const isDone = (k?: string) => /\/(done|cancelled)$/i.test(k || '');

export function TableView({ items, rowField, colField }: TableViewProps) {
    const onMarkItemDone = (itemId: string) => {
        DataStore.instance.markItemDone(itemId);
    };

    if (!rowField || !colField) {
        return <div>（表格视图需要配置“行字段”和“列字段”）</div>;
    }

    const rowVals: Set<string> = new Set();
    const colVals: Set<string> = new Set();
    const matrix: Record<string, Record<string, Item[]>> = {};

    items.forEach(it => {
        const r = String(readField(it, rowField) ?? EMPTY_LABEL);
        const c = String(readField(it, colField) ?? EMPTY_LABEL);
        rowVals.add(r);
        colVals.add(c);
        if (!matrix[r]) matrix[r] = {};
        if (!matrix[r][c]) matrix[r][c] = [];
        matrix[r][c].push(it);
    });

    const sortedRows = Array.from(rowVals).sort((a,b) => a.localeCompare(b, 'zh-CN'));
    const sortedCols = Array.from(colVals).sort((a,b) => a.localeCompare(b, 'zh-CN'));

    function renderCellItem(item: Item) {
        if (item.type === 'task') {
            const done = isDone(item.categoryKey);
            return (
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <TaskCheckbox
                        done={done}
                        onMarkDone={() => onMarkItemDone(item.id)}
                    />
                    {item.icon && <span class="task-icon">{item.icon}</span>}
                    <a href={makeObsUri(item)} target="_blank" rel="noopener" class={done ? 'task-done' : ''} style={{ flexGrow: 1, minWidth: 0, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                        {item.title}
                    </a>
                    {!done && <TaskSendToTimerButton taskId={item.id} />}
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
                    {sortedCols.map(c => (<th key={c}>{c}</th>))}
                </tr>
            </thead>
            <tbody>
                {sortedRows.map(r => (
                    <tr key={r}>
                        <td><strong>{r}</strong></td>
                        {sortedCols.map(c => {
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