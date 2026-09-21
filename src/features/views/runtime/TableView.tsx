// src/features/dashboard/ui/TableView.tsx

/** @jsxImportSource preact */
import { h } from 'preact';
import type { GoalDefinition } from '@core/goal/public';
import type { RecordViewItem } from '@core/types/public';
import { formatFieldValue, getFieldLabel } from '@core/fields/public';
import type { OpenRecordHandler, OpenRecordOriginHandler, ResolveResourcePathHandler, TimerController } from '@shared/types/public';
import { TableViewCell } from './TableViewCell';
import { buildTableViewRenderModel } from './TableViewModel';

interface TableViewProps {
    items: RecordViewItem[];
    rowField: string;
    colField: string;
    onMarkDone: (id: string) => void;
    resolveResourcePath?: ResolveResourcePathHandler;
    onOpenRecordOrigin?: OpenRecordOriginHandler;
    timerService: TimerController;
    timers: any[];
    goals?: GoalDefinition[];
    onOpenRecord?: OpenRecordHandler;
}

export function TableView({ items, rowField, colField, onMarkDone, resolveResourcePath, onOpenRecordOrigin, timerService, timers, goals = [], onOpenRecord }: TableViewProps) {
    const renderModel = buildTableViewRenderModel({ items, rowField, colField, goals });

    if (!renderModel.isConfigured) {
        return <div class="think-data-grid-empty">{renderModel.emptyMessage}</div>;
    }

    return (
        <div class="think-data-grid-scroll">
            <table class="think-table think-data-grid think-data-grid--matrix">
                <thead>
                    <tr>
                        <th>{getFieldLabel(rowField)}</th>
                        {renderModel.sortedCols.map(col => (<th key={col}>{formatFieldValue(colField, col)}</th>))}
                    </tr>
                </thead>
                <tbody>
                    {renderModel.sortedRows.map(row => (
                        <tr key={row}>
                            <td><strong>{formatFieldValue(rowField, row)}</strong></td>
                            {renderModel.sortedCols.map(col => (
                                <TableViewCell
                                    key={col}
                                    items={renderModel.matrix[row]?.[col] || []}
                                    onMarkDone={onMarkDone}
                                    resolveResourcePath={resolveResourcePath}
                                    onOpenRecordOrigin={onOpenRecordOrigin}
                                    timerService={timerService}
                                    timers={timers}
                                                          onOpenRecord={onOpenRecord}
                                />
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
