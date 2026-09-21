// src/features/settings/views/runtime/timeline/components/TimelineSummaryTable.tsx
/** @jsxImportSource preact */
import { h } from 'preact';
import type { GoalTimeAllocationSummary } from '@core/goal/public';
import { ProgressBlock } from '../../components/timeline/ProgressBlock';
import { GoalAllocationBlock } from '../../components/timeline/GoalAllocationBlock';
import type { GoalAllocationTimelineView } from '../../components/timeline/GoalAllocationBlock';

interface WeeklySummary {
    summary: Record<string, number>;
    totalHours: number;
    goalSummary?: GoalTimeAllocationSummary | null;
}

interface MonthData {
    month: string;
    monthlySummary: Record<string, number>;
    totalMonthHours: number;
    monthlyGoalSummary?: GoalTimeAllocationSummary | null;
    weeklySummaries: (WeeklySummary | null)[];
}

interface TimelineSummaryTableProps {
    summaryData: MonthData[];
    colorMap: Record<string, string>;
    goalOrder?: string[];
    untrackedLabel: string;
    overallGoalSummary?: GoalTimeAllocationSummary | null;
    currentView: '年' | '季';
}

function SummaryCell({ goalSummary, goalHours, totalHours, colorMap, goalOrder, untrackedLabel, view }: {
    goalSummary?: GoalTimeAllocationSummary | null;
    goalHours: Record<string, number>;
    totalHours: number;
    colorMap: Record<string, string>;
    goalOrder?: string[];
    untrackedLabel: string;
    view: GoalAllocationTimelineView;
}) {
    if (goalSummary) return <GoalAllocationBlock summary={goalSummary} currentView={view} metric="deviation" />;
    return <ProgressBlock goalHours={goalHours} order={goalOrder} totalHours={totalHours} colorMap={colorMap} untrackedLabel={untrackedLabel} />;
}

export function TimelineSummaryTable({ summaryData, colorMap, goalOrder, untrackedLabel, overallGoalSummary, currentView }: TimelineSummaryTableProps) {
    if (!summaryData || summaryData.length === 0) {
        return <div class="timeline-empty-state think-viz-empty">此时间范围内无数据可供总结。</div>;
    }

    return (
        <div class="timeline-summary-scroll think-data-grid-scroll">
        <table class="timeline-summary-table think-data-grid">
            <thead>
                <tr>
                    <th>月份</th>
                    <th>月度总结</th>
                    <th>第1周</th>
                    <th>第2周</th>
                    <th>第3周</th>
                    <th>第4周</th>
                    <th>第5周</th>
                </tr>
            </thead>
            <tbody>
                {summaryData.map((monthData) => (
                    <tr key={monthData.month}>
                        <td><strong class="timeline-summary-table__month-label">{monthData.month}</strong></td>
                        <td>
                            <SummaryCell
                                goalSummary={monthData.monthlyGoalSummary}
                                goalHours={monthData.monthlySummary}
                                totalHours={monthData.totalMonthHours}
                                colorMap={colorMap}
                                goalOrder={goalOrder}
                                untrackedLabel={untrackedLabel}
                                view="月"
                            />
                        </td>
                        {monthData.weeklySummaries.map((weekData, index) => (
                            <td key={index}>
                                {weekData ? (
                                    <SummaryCell
                                        goalSummary={weekData.goalSummary}
                                        goalHours={weekData.summary}
                                        totalHours={weekData.totalHours}
                                        colorMap={colorMap}
                                        goalOrder={goalOrder}
                                        untrackedLabel={untrackedLabel}
                                        view="周"
                                    />
                                ) : null}
                            </td>
                        ))}
                    </tr>
                ))}
                {overallGoalSummary ? (
                    <tr class="timeline-summary-table__range-total">
                        <td><strong>{currentView === '年' ? '本年度' : '本季度'}</strong></td>
                        <td>
                            <GoalAllocationBlock summary={overallGoalSummary} currentView={currentView} metric="deviation" />
                        </td>
                        <td colSpan={5} />
                    </tr>
                ) : null}
            </tbody>
        </table>
        </div>
    );
}
