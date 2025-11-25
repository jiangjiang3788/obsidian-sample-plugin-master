// src/features/dashboard/ui/TableView.tsx

/** @jsxImportSource preact */
import { h } from 'preact';
import { Item, readField } from '@/core/types/schema';
import { makeObsUri } from '@core/utils/obsidian';
import { EMPTY_LABEL } from '@/core/types/constants';
import { TaskCheckbox } from '@shared/ui/composites/TaskCheckbox';
import { TaskSendToTimerButton } from '@shared/ui/composites/TaskSendToTimerButton';
import { App } from 'obsidian'; // [新增] 导入 App 类型
import type { TimerService } from '@features/timer/TimerService';
import { isDone } from '@core/utils/taskUtils';
import { buildTableMatrix } from '@core/utils/itemGrouping';

// [修改] 接口现在需要 app 实例
interface TableViewProps {
    items: Item[];
    rowField: string;
    colField: string;
    onMarkDone: (id: string) => void;
    app: App;
    timerService: TimerService;
    timers: any[];
}

// [修改] 函数签名现在接收 app
export function TableView({ items, rowField, colField, onMarkDone, app, timerService, timers }: TableViewProps) {
    if (!rowField || !colField) {
        return <div>（表格视图需要配置“行字段”和“列字段”）</div>;
    }

    const { matrix, sortedRows, sortedCols } = buildTableMatrix(items, rowField, colField);

    function renderCellItem(item: Item) {
        if (item.type === 'task') {
            const done = isDone(item.categoryKey);
            const timer = timers.find(t => t.taskId === item.id);
            
            // [重构] 采用与 BlockView 统一的渲染逻辑，以实现视图间的一致性
            return (
                <span class="table-view-task-cell">
                    <TaskCheckbox
                        done={done}
                        onMarkDone={() => onMarkDone(item.id)}
                    />
                    {item.icon && <span class="task-icon">{item.icon}</span>}
                    {/* [修复] 调用 makeObsUri 时传入 app 实例 */}
                    <a href={makeObsUri(item, app)} target="_blank" rel="noopener" class={`table-view-task-title ${done ? 'task-done' : ''}`}>
                        {item.title}
                    </a>
                    {!done && (
                        <TaskSendToTimerButton 
                            taskId={item.id} 
                            timerStatus={timer?.status}
                            onStart={() => timerService?.startOrResume(item.id)}
                        />
                    )}
                </span>
            );
        }
        // [修复] Block 类型的链接也需要 app 实例
        return (
            <a href={makeObsUri(item, app)} target="_blank" rel="noopener">
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
