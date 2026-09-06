/** @jsxImportSource preact */
import { h } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import type { GoalDefinition } from '@core/goal/public';
import { getGoalTimePresetInfo, NATURAL_WEEK_MINUTES } from '@core/goal/public';

function formatHumanMinutes(minutes: number | null): string {
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
  return Number.isInteger(value) ? String(value) : value.toFixed(1).replace(/\.0$/, '');
}

function formatHoursInput(minutes: number | null): string {
  if (minutes === null || !Number.isFinite(minutes)) return '';
  const hours = minutes / 60;
  return Number.isInteger(hours) ? String(hours) : String(Math.round(hours * 100) / 100);
}

export type GoalTimePresetDraftPreview =
  | { kind: 'root'; percent: number | null }
  | { kind: 'child'; minutes: number | null };

export type GoalTimePresetDraftPreviewHandler = (
  path: string,
  preview: GoalTimePresetDraftPreview | null,
) => void;

function parseDraftPreview(rawValue: string, isRoot: boolean): GoalTimePresetDraftPreview {
  const raw = rawValue.trim();
  if (!raw) return isRoot ? { kind: 'root', percent: null } : { kind: 'child', minutes: null };
  const value = Number(raw);
  if (!Number.isFinite(value) || value < 0) {
    return isRoot ? { kind: 'root', percent: null } : { kind: 'child', minutes: null };
  }
  if (isRoot) {
    return { kind: 'root', percent: Math.max(0, Math.min(100, Math.round(value * 10) / 10)) };
  }
  return { kind: 'child', minutes: Math.round(value * 60 / 15) * 15 };
}

export function GoalTimePresetInput({ goal, goals, onRootCommit, onChildCommit, onDraftPreview }: {
  goal: GoalDefinition;
  goals: GoalDefinition[];
  onRootCommit: (path: string, percent: number | null) => Promise<void>;
  onChildCommit: (path: string, minutes: number | null) => Promise<void>;
  onDraftPreview?: GoalTimePresetDraftPreviewHandler;
}) {
  const info = getGoalTimePresetInfo(goal.path, goals);
  const isRoot = info?.parentPath === null;
  const storedPercent = isRoot ? info?.targetPercent ?? null : null;
  const storedMinutes = !isRoot ? info?.weeklyTargetMinutes ?? null : null;
  const storedDraft = isRoot ? (storedPercent === null ? '' : String(storedPercent)) : formatHoursInput(storedMinutes);
  const [draft, setDraft] = useState(storedDraft);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!saving) setDraft(storedDraft);
  }, [storedDraft, saving]);

  const preview = parseDraftPreview(draft, isRoot);
  const displayedTarget = isRoot && preview.kind === 'root'
    ? (preview.percent === null ? null : (NATURAL_WEEK_MINUTES * preview.percent) / 100)
    : info?.weeklyTargetMinutes ?? null;

  const commit = async () => {
    const raw = draft.trim();
    setSaving(true);
    try {
      if (!raw) {
        if (isRoot) await onRootCommit(goal.path, null);
        else await onChildCommit(goal.path, null);
        return;
      }
      const number = Number(raw);
      if (!Number.isFinite(number) || number < 0) {
        setDraft(storedDraft);
        return;
      }
      if (isRoot) {
        const percent = Math.max(0, Math.min(100, Math.round(number * 10) / 10));
        setDraft(String(percent));
        await onRootCommit(goal.path, percent);
      } else {
        const minutes = Math.round(number * 60 / 15) * 15;
        setDraft(formatHoursInput(minutes));
        await onChildCommit(goal.path, minutes);
      }
    } finally {
      setSaving(false);
      onDraftPreview?.(goal.path, null);
    }
  };

  const title = isRoot
    ? `目标 ${formatHumanMinutes(displayedTarget)}/周 · 顶层百分比以一周自然时间 168h 换算 · 平衡弹性 ±10%`
    : info?.configured
      ? `目标 ${formatHumanMinutes(info.weeklyTargetMinutes)}/周 · 子目标时间可选；父目标余额在列表末尾显示`
      : '子目标可选设置周目标时间；不需要时间预设的目标可以留空。';

  return (
    <span className="think-goal-template-matrix__budget" title={title} onMouseDown={(event: MouseEvent) => event.stopPropagation()}>
      <input
        className="think-goal-template-matrix__budget-input"
        type="number"
        min="0"
        max={isRoot ? '100' : undefined}
        step={isRoot ? '0.1' : '0.25'}
        inputMode="decimal"
        value={draft}
        placeholder="—"
        aria-label={isRoot ? `${goal.path} 时间预设百分比` : `${goal.path} 每周目标时间`}
        disabled={saving}
        onInput={(event) => {
          const next = (event.currentTarget as HTMLInputElement).value;
          setDraft(next);
          onDraftPreview?.(goal.path, parseDraftPreview(next, isRoot));
        }}
        onBlur={() => { void commit(); }}
        onKeyDown={(event: KeyboardEvent) => {
          if (event.key === 'Enter') {
            event.preventDefault();
            (event.currentTarget as HTMLInputElement).blur();
          } else if (event.key === 'Escape') {
            event.preventDefault();
            setDraft(storedDraft);
            onDraftPreview?.(goal.path, null);
            (event.currentTarget as HTMLInputElement).blur();
          }
        }}
      />
      <span className="think-goal-template-matrix__budget-unit" aria-hidden="true">{isRoot ? '%' : 'h/周'}</span>
      {isRoot && displayedTarget !== null ? <span className="think-goal-template-matrix__budget-derived">{formatHumanMinutes(displayedTarget)}/周</span> : null}
      {isRoot && storedPercent !== null ? <span className="sr-only">{formatPercent(storedPercent)}%</span> : null}
    </span>
  );
}
