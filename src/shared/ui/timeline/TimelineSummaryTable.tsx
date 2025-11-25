// src/shared/ui/timeline/TimelineSummaryTable.tsx
/** @jsxImportSource preact */
import { h } from 'preact';
import { ProgressBlock } from './ProgressBlock';

interface WeeklySummary {
    summary: Record<string, number>;
    totalHours: number;
}

interface MonthData {
    month: string;
    monthlySummary: Record<string, number>;
    totalMonthHours: number;
    weeklySummaries: (WeeklySummary | null)[];
}

interface TimelineSummaryTableProps {
    summaryData: MonthData[];
    colorMap: Record<string, string>;
    progressOrder?: string[];
    untrackedLabel: string;
}

export function TimelineSummaryTable({ 
    summaryData, 
    colorMap, 
    progressOrder, 
    untrackedLabel 
}: TimelineSummaryTableProps) {
    if (!summaryData || summaryData.length === 0) {
        return <div class="timeline-empty-state">此时间范围内无数据可供总结。</div>;
    }
    
    return (
        <table class="timeline-summary-table">
            <thead>
                <tr>
                    <th>月份</th>
                    <th>月度总结</th>
                    <th>W1</th>
                    <th>W2</th>
                    <th>W3</th>
                    <th>W4</th>
                    <th>W5</th>
                </tr>
            </thead>
            <tbody>
                {summaryData.map((monthData) => (
                    <tr key={monthData.month}>
                        <td><strong>{monthData.month}</strong></td>
                        <td>
                            <ProgressBlock 
                                categoryHours={monthData.monthlySummary} 
                                order={progressOrder} 
                                totalHours={monthData.totalMonthHours} 
                                colorMap={colorMap} 
                                untrackedLabel={untrackedLabel} 
                            />
                        </td>
                        {monthData.weeklySummaries.map((weekData, index) => (
                            <td key={index}>
                                {weekData ? (
                                    <ProgressBlock 
                                        categoryHours={weekData.summary} 
                                        order={progressOrder} 
                                        totalHours={weekData.totalHours} 
                                        colorMap={colorMap} 
                                        untrackedLabel={untrackedLabel} 
                                    />
                                ) : null}
                            </td>
                        ))}
                    </tr>
                ))}
            </tbody>
        </table>
    );
}
