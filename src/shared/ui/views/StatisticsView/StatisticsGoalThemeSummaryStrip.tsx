/** @jsxImportSource preact */
import { h } from 'preact';

export interface StatisticsGoalThemeSummary {
  goalPath: string;
  themes: Array<{ themePath: string; label: string; count: number }>;
}

export function getStatisticsGoalThemeSummaryRows(
  summaries: StatisticsGoalThemeSummary[],
  limit = 6,
): StatisticsGoalThemeSummary[] {
  return (summaries || []).filter((row) => row.themes.length > 0).slice(0, limit);
}

export function getStatisticsGoalThemeSummaryLabel(goalPath: string): string {
  return goalPath.split('/').filter(Boolean).pop() || goalPath;
}

export function getStatisticsGoalThemeSummaryTitle(row: StatisticsGoalThemeSummary): string {
  return `${row.goalPath}: ${row.themes.map((theme) => `${theme.themePath} ${theme.count}`).join(' / ')}`;
}

export function getStatisticsGoalThemeSummaryText(row: StatisticsGoalThemeSummary): string {
  return row.themes.map((theme) => `${theme.label}${theme.count}`).join(' / ');
}

export function StatisticsGoalThemeSummaryStrip({ summaries }: { summaries: StatisticsGoalThemeSummary[] }) {
  const visible = getStatisticsGoalThemeSummaryRows(summaries);
  if (visible.length === 0) return null;

  return (
    <div class="sv-goal-summary-strip">
      {visible.map((row) => (
        <div
          key={row.goalPath}
          class="sv-goal-summary-chip"
          title={getStatisticsGoalThemeSummaryTitle(row)}
        >
          <span class="sv-goal-summary-label">{getStatisticsGoalThemeSummaryLabel(row.goalPath)}</span>
          <span> · </span>
          <span>{getStatisticsGoalThemeSummaryText(row)}</span>
        </div>
      ))}
    </div>
  );
}
