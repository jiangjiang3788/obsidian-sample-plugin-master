/** @jsxImportSource preact */
import { h } from 'preact';
import type { ProgressSummaryModel } from './ProgressViewModel';

interface ProgressSummaryCardsProps {
  summary: ProgressSummaryModel;
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <div class="think-card think-progress-summary__card">
      <div class="think-progress-summary__label">{label}</div>
      <div class="think-progress-summary__value">{value}</div>
    </div>
  );
}

export function ProgressSummaryCards({ summary }: ProgressSummaryCardsProps) {
  return (
    <div class="think-progress-summary">
      <SummaryCard label="目标数" value={summary.goalCount} />
      <SummaryCard label="目标经验" value={summary.totalPoints} />
      <SummaryCard label="目标记录" value={summary.totalItems} />
    </div>
  );
}
