// src/features/dashboard/ui/TableView.tsx

/** @jsxImportSource preact */
import { h } from 'preact';
import type { GoalDefinition } from '@core/goal/public';
import type { Item, ThemeDefinition } from '@core/types/public';
import type { OpenRecordHandler, OpenRecordOriginHandler, ResolveResourcePathHandler, TimerController } from '@shared/types/public';
import { TableViewCell } from './TableViewCell';
import { buildTableViewRenderModel } from './TableViewModel';

interface TableViewProps {
    items: Item[];
    rowField: string;
    colField: string;
    onMarkDone: (id: string) => void;
    resolveResourcePath?: ResolveResourcePathHandler;
    onOpenRecordOrigin?: OpenRecordOriginHandler;
    timerService: TimerController;
    timers: any[];
    allThemes?: ThemeDefinition[];
    goals?: GoalDefinition[];
    onOpenRecord?: OpenRecordHandler;
}

export function TableView({ items, rowField, colField, onMarkDone, resolveResourcePath, onOpenRecordOrigin, timerService, timers, allThemes = [], goals = [], onOpenRecord }: TableViewProps) {
    const renderModel = buildTableViewRenderModel({ items, rowField, colField, goals });

    if (!renderModel.isConfigured) {
        return <div>{renderModel.emptyMessage}</div>;
    }

    return (
        <table class="think-table">
            <thead>
                <tr>
                    <th>{rowField}</th>
                    {renderModel.sortedCols.map(col => (<th key={col}>{col}</th>))}
                </tr>
            </thead>
            <tbody>
                {renderModel.sortedRows.map(row => (
                    <tr key={row}>
                        <td><strong>{row}</strong></td>
                        {renderModel.sortedCols.map(col => (
                            <TableViewCell
                                key={col}
                                items={renderModel.matrix[row]?.[col] || []}
                                onMarkDone={onMarkDone}
                                resolveResourcePath={resolveResourcePath}
                                onOpenRecordOrigin={onOpenRecordOrigin}
                                timerService={timerService}
                                timers={timers}
                                allThemes={allThemes}
                                onOpenRecord={onOpenRecord}
                            />
                        ))}
                    </tr>
                ))}
            </tbody>
        </table>
    );
}
