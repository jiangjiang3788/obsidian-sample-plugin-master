// src/features/dashboard/ui/TableView.tsx

/** @jsxImportSource preact */
import { h } from 'preact';
import { Item, type GoalDefinition } from '@core/public';
import type { OpenRecordHandler, OpenRecordOriginHandler, ResolveResourcePathHandler, TimerController } from '../../types/actions';
import { buildTableMatrix } from '@core/public';
import { TaskRow } from '../items/TaskRow';
import { ItemLink } from '../items/ItemLink';

interface TableViewProps {
    items: Item[];
    rowField: string;
    colField: string;
    onMarkDone: (id: string) => void;
    resolveResourcePath?: ResolveResourcePathHandler;
    onOpenRecordOrigin?: OpenRecordOriginHandler;
    timerService: TimerController;
    timers: any[];
    allThemes?: any[]; // 为了兼容 TaskRow 组件
    goals?: GoalDefinition[];
    onOpenRecord?: OpenRecordHandler;
}

export function TableView({ items, rowField, colField, onMarkDone, resolveResourcePath, onOpenRecordOrigin, timerService, timers, allThemes = [], goals = [], onOpenRecord }: TableViewProps) {
    if (!rowField || !colField) {
        return <div>（表格视图需要配置"行字段"和"列字段"）</div>;
    }

    const { matrix, sortedRows, sortedCols } = buildTableMatrix(items, rowField, colField, { goals });

    function renderCellItem(item: Item) {
        if (item.type === 'task') {
            const timer = timers.find(t => t.taskId === item.id);
            return (
                <TaskRow 
                    item={item} 
                    onMarkDone={onMarkDone} 
                    resolveResourcePath={resolveResourcePath}
                    onOpenRecordOrigin={onOpenRecordOrigin}
                    timerService={timerService} 
                    timer={timer}
                    allThemes={allThemes}
                    compact={true} // 表格视图使用紧凑模式
                    onOpenRecord={onOpenRecord}
                />
            );
        }
        
        return <ItemLink item={item} onOpenRecord={onOpenRecord} onOpenRecordOrigin={onOpenRecordOrigin} />;
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
                                    {cellItems.map(it => (<div key={it.id} class="table-view-cell-item">{renderCellItem(it)}</div>))}
                                </td>
                            );
                        })}
                    </tr>
                ))}
            </tbody>
        </table>
    );
}
