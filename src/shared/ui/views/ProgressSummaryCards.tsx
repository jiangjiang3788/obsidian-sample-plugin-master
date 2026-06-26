/** @jsxImportSource preact */
import { h } from 'preact';
import type { ProgressSummaryModel } from './ProgressViewModel';

interface ProgressSummaryCardsProps {
  summary: ProgressSummaryModel;
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <div class="think-card" style={{ padding: '14px', border: '1px solid var(--background-modifier-border)', borderRadius: '12px' }}>
      <div style={{ color: 'var(--text-muted)', fontSize: '12px' }}>{label}</div>
      <div style={{ fontSize: '28px', fontWeight: 700, marginTop: '4px' }}>{value}</div>
    </div>
  );
}

export function ProgressSummaryCards({ summary }: ProgressSummaryCardsProps) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px' }}>
      <SummaryCard label="目标数" value={summary.goalCount} />
      <SummaryCard label="目标经验" value={summary.totalPoints} />
      <SummaryCard label="目标记录" value={summary.totalItems} />
    </div>
  );
}
