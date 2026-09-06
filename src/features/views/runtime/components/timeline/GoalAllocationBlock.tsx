/** @jsxImportSource preact */
import { h } from 'preact';
import type { JSX } from 'preact';
import type { GoalTimeAllocationEntry, GoalTimeAllocationSummary } from '@core/goal/public';

export type GoalAllocationTimelineView = '年' | '季' | '月' | '周' | '天';

interface GoalAllocationBlockProps {
  summary: GoalTimeAllocationSummary;
  currentView: GoalAllocationTimelineView;
  metric?: 'deviation' | 'percent' | 'hours';
  hideZeroActual?: boolean;
}

export function formatGoalMinutes(minutes: number | null): string {
  if (minutes === null || !Number.isFinite(minutes)) return '—';
  const total = Math.max(0, Math.round(minutes));
  const hours = Math.floor(total / 60);
  const mins = total % 60;
  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h${mins}m`;
}

function formatPercent(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return '—';
  if (Math.abs(value - Math.round(value)) < 0.05) return `${Math.round(value)}%`;
  return `${value.toFixed(1)}%`;
}

function formatSignedPercent(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return '—';
  const sign = value > 0 ? '+' : value < 0 ? '-' : '';
  return `${sign}${formatPercent(Math.abs(value))}`;
}

function formatSignedMinutes(minutes: number): string {
  const sign = minutes > 0 ? '+' : minutes < 0 ? '-' : '';
  return `${sign}${formatGoalMinutes(Math.abs(minutes))}`;
}

function rangeActualLabel(view: GoalAllocationTimelineView): string {
  switch (view) {
    case '周': return '本周';
    case '月': return '本月';
    case '季': return '本季';
    case '年': return '本年';
    case '天':
    default: return '今天';
  }
}

function balanceLabel(state: GoalTimeAllocationEntry['balanceState']): string {
  switch (state) {
    case 'low': return '偏低';
    case 'high': return '偏高';
    case 'balanced': return '平衡范围内';
    case 'insufficient': return '记录不足';
    case 'pending': return '周期尚未开始';
    default: return '未设置时间预设';
  }
}

function targetSourceLabel(row: GoalTimeAllocationEntry): string {
  switch (row.targetSource) {
    case 'historical': return '当时预设';
    case 'current-fallback': return '当时未设 · 按当前预设回算';
    case 'mixed': return '部分按当时预设，缺失部分按当前预设回算';
    default: return '当前预设';
  }
}

function childRows(summary: GoalTimeAllocationSummary, row: GoalTimeAllocationEntry): GoalTimeAllocationEntry[] {
  return summary.rows.filter((candidate) => candidate.parentPath === row.path);
}

function buildRowTooltip(row: GoalTimeAllocationEntry, summary: GoalTimeAllocationSummary, view: GoalAllocationTimelineView): string {
  const lines = [row.path];
  if (row.targetMinutes === null) {
    lines.push(`${rangeActualLabel(view)}已记录 ${formatGoalMinutes(row.minutes)} · 未设置目标时间`);
  } else {
    const presentationState = resolvePresentationBalanceState(row, summary.toleranceRatio);
    lines.push(`平衡范围 ${formatGoalMinutes(row.lowerBoundMinutes)}–${formatGoalMinutes(row.upperBoundMinutes)}（±${Math.round(summary.toleranceRatio * 100)}%） · ${balanceLabel(presentationState)}`);
    lines.push('');
    lines.push(`目标 ${formatGoalMinutes(row.targetMinutes)}  |  已记录 ${formatGoalMinutes(row.minutes)}  |  相差 ${formatSignedMinutes(row.differenceMinutes || 0)}`);
    lines.push(`目标来源：${targetSourceLabel(row)}`);
  }
  const children = childRows(summary, row);
  if (children.length > 0) {
    lines.push('');
    lines.push('子目标（目标 / 已记录 / 相差）：');
    for (const child of children) {
      const difference = child.targetMinutes === null || child.differenceMinutes === null ? '—' : formatSignedMinutes(child.differenceMinutes);
      lines.push(`· ${child.label}  ${formatGoalMinutes(child.targetMinutes)} / ${formatGoalMinutes(child.minutes)}  ${difference}`);
    }
    if (row.directMinutes > 0) lines.push(`· 直接归属父目标  — / ${formatGoalMinutes(row.directMinutes)}  —`);
  }
  if (row.balanceState === 'insufficient') {
    lines.push('');
    lines.push(`记录覆盖 ${formatGoalMinutes(summary.observationCoverageMinutes)} / ${formatGoalMinutes(summary.comparisonNaturalMinutes)}；未记录代表未知，不按 0 处理。`);
  }
  return lines.join('\n');
}


function resolvePresentationBalanceState(
  row: GoalTimeAllocationEntry,
  toleranceRatio: number,
): GoalTimeAllocationEntry['balanceState'] {
  if (row.balanceState === 'unconfigured' || row.targetMinutes === null) return 'unconfigured';
  if (row.balanceState === 'pending') return 'pending';
  if (row.balanceState === 'insufficient') return 'insufficient';

  const deviation = row.relativeDifferencePercent;
  if (deviation === null || !Number.isFinite(deviation)) return 'insufficient';
  const tolerancePercent = Math.max(0, toleranceRatio) * 100;
  const epsilon = 1e-6;

  // Presentation contract:
  // - green only when evidence is conclusive AND deviation is inside ± tolerance;
  // - red only when evidence is conclusive AND deviation is outside ± tolerance;
  // - any evidence/state mismatch degrades to neutral "insufficient" rather than
  //   manufacturing a red/green conclusion from sparse records.
  if (Math.abs(deviation) <= tolerancePercent + epsilon) {
    return row.balanceState === 'balanced' ? 'balanced' : 'insufficient';
  }
  if (deviation < -tolerancePercent - epsilon) {
    return row.balanceState === 'low' ? 'low' : 'insufficient';
  }
  if (deviation > tolerancePercent + epsilon) {
    return row.balanceState === 'high' ? 'high' : 'insufficient';
  }
  return 'insufficient';
}

function rowColor(row: GoalTimeAllocationEntry, index: number): string {
  return row.color || `var(--think-data-${(index % 6) + 1})`;
}

export function GoalAllocationBlock({
  summary,
  currentView,
  metric = 'deviation',
  hideZeroActual = false,
}: GoalAllocationBlockProps) {
  const rows = summary.rootRows.filter((row) => !hideZeroActual || row.minutes > 0.01);
  const showUnallocated = summary.unallocatedMinutes > 0.01;
  if (rows.length === 0 && !showUnallocated) return null;

  return (
    <div class="timeline-goal-allocation-block">
      {rows.map((row, index) => {
        // The number answers "how far from my preset?"; the bar keeps the original
        // Timeline semantics: confirmed Goal time as a share of natural time, with the
        // preset shown as a vertical quota marker.  Even when coverage is insufficient,
        // keep the observed deviation number visible but neutral-coloured instead of
        // turning missing observations into a false low conclusion.
        const presentationState = resolvePresentationBalanceState(row, summary.toleranceRatio);
        const deviation = row.targetMinutes === null ? null : row.relativeDifferencePercent;
        const displayMetric = metric === 'hours'
          ? formatGoalMinutes(row.minutes)
          : metric === 'percent'
            ? formatPercent(row.actualPercentOfNaturalTime)
            : formatSignedPercent(deviation);
        const color = rowColor(row, index);
        const lineStyle = { '--timeline-goal-allocation-color': color } as JSX.CSSProperties;
        const actualWidth = Math.min(100, Math.max(0, row.actualPercentOfNaturalTime));
        const targetPosition = row.targetPercentOfNaturalTime === null
          ? null
          : Math.min(100, Math.max(0, row.targetPercentOfNaturalTime));
        const fillStyle = { width: `${actualWidth}%` } as JSX.CSSProperties;
        const markerStyle = targetPosition === null ? undefined : { left: `${targetPosition}%` } as JSX.CSSProperties;
        return (
          <div key={row.path} class={`timeline-goal-allocation-line is-${presentationState}`} title={buildRowTooltip(row, summary, currentView)} style={lineStyle}>
            {actualWidth > 0 ? <div class="timeline-goal-allocation-fill" style={fillStyle} /> : null}
            {markerStyle ? <span class="timeline-goal-allocation-budget-marker" style={markerStyle} aria-hidden="true" /> : null}
            <span class="timeline-goal-allocation-text">
              {row.icon ? <span class="timeline-goal-allocation-icon" aria-hidden="true">{row.icon}</span> : null}
              <span class="timeline-goal-allocation-label">{row.label}</span>
              <span class="timeline-goal-allocation-metric">{displayMetric}</span>
            </span>
          </div>
        );
      })}
      {showUnallocated ? (() => (
        <div
          class="timeline-goal-allocation-line is-unallocated"
          title={`未归属时间\n${rangeActualLabel(currentView)}已记录 ${formatGoalMinutes(summary.unallocatedMinutes)}\n有 TaskSession，但 Task 没有可解析的 Goal。`}
        >
          <span class="timeline-goal-allocation-text">
            <span class="timeline-goal-allocation-label">未归属</span>
            <span class="timeline-goal-allocation-metric">{formatPercent(summary.unallocatedPercentOfNaturalTime)}</span>
          </span>
        </div>
      ))() : null}
    </div>
  );
}
