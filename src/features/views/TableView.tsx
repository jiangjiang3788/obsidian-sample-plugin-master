// src/features/dashboard/ui/TableView.tsx

/** @jsxImportSource preact */
import { h } from 'preact';
import { Item } from '@/core/types/schema';
import { App } from 'obsidian';
import type { TimerService } from '@features/timer/TimerService';
import { buildTableMatrix } from '@core/utils/itemGrouping';
import { TaskRow } from '@shared/ui/items/TaskRow';
import { ItemLink } from '@shared/ui/items/ItemLink';

interface TableViewProps {
    items: Item[];
    rowField: string;
    colField: string;
    onMarkDone: (id: string) => void;
    app: App;
    timerService: TimerService;
    timers: any[];
    allThemes?: any[]; // 为了兼容 TaskRow 组件
}

export function TableView({ items, rowField, colField, onMarkDone, app, timerService, timers, allThemes = [] }: TableViewProps) {
    if (!rowField || !colField) {
        return <div>（表格视图需要配置"行字段"和"列字段"）</div>;
    }

    const { matrix, sortedRows, sortedCols } = buildTableMatrix(items, rowField, colField);

    function renderCellItem(item: Item) {
        if (item.type === 'task') {
            const timer = timers.find(t => t.taskId === item.id);
            return (
                <TaskRow 
                    item={item} 
                    onMarkDone={onMarkDone} 
                    app={app} 
                    timerService={timerService} 
                    timer={timer}
                    allThemes={allThemes}
                    compact={true} // 表格视图使用紧凑模式
                />
            );
        }
        
        return <ItemLink item={item} app={app} />;
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
