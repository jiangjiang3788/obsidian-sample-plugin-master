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
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '10px' }}>
      {visible.map((row) => (
        <div
          key={row.goalPath}
          style={{
            border: '1px solid var(--background-modifier-border)',
            borderRadius: '999px',
            padding: '5px 9px',
            fontSize: '12px',
            color: 'var(--text-muted)',
          }}
          title={getStatisticsGoalThemeSummaryTitle(row)}
        >
          <span style={{ color: 'var(--text-normal)', fontWeight: 600 }}>{getStatisticsGoalThemeSummaryLabel(row.goalPath)}</span>
          <span> · </span>
          <span>{getStatisticsGoalThemeSummaryText(row)}</span>
        </div>
      ))}
    </div>
  );
}
