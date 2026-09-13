/** @jsxImportSource preact */
import { h } from 'preact';
import { useMemo, useState } from 'preact/hooks';
import { normalizeRecordTypePresentationKey, type TemplateRecordTypeDefinition } from '@core/recordTypes/public';
import type { GoalDefinition, GoalTemplate } from '@core/goal/public';
import { getRootTimePresetTotals } from '@core/goal/public';
import { GoalTemplateMatrixGroupRows } from './GoalTemplateMatrixRow';
import type { GoalTimePresetDraftPreview, GoalTimePresetDraftPreviewHandler } from './GoalTimePresetInput';
import { splitGoalsByRoot } from './goalTemplateMatrixModel';
import type { GoalDropState } from './goalTemplateMatrixModel';

export interface GoalTemplateMatrixTableProps {
  visibleGoals: GoalDefinition[];
  goals: GoalDefinition[];
  visibleBlocks: TemplateRecordTypeDefinition[];
  templates: GoalTemplate[];
  expandedPaths: Set<string>;
  draggingGoalPath: string | null;
  goalDrop: GoalDropState;
  setDraggingGoalPath: (value: string | null) => void;
  setGoalDrop: (value: GoalDropState) => void;
  toggleTreePath: (path: string) => void;
  reorderGoalSiblings: (dragGoalPath: string, targetGoalPath: string, position: 'before' | 'after') => Promise<void>;
  handleDeleteGoal: (event: MouseEvent, goal: GoalDefinition) => Promise<void>;
  handleEditGoalIcon: (event: MouseEvent, goal: GoalDefinition) => Promise<void>;
  openEditor: (goal: GoalDefinition, block: TemplateRecordTypeDefinition, template?: GoalTemplate | null) => void;
  setGoalTimePresetPercent: (path: string, percent: number | null) => Promise<void>;
  setGoalWeeklyTargetMinutes: (path: string, minutes: number | null) => Promise<void>;
  setGoalColor: (path: string, color: string | null) => Promise<void>;
}

function formatHumanMinutes(minutes: number): string {
  const total = Math.max(0, Math.round(minutes));
  const hours = Math.floor(total / 60);
  const mins = total % 60;
  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h${mins}m`;
}

function applyDraftPreviews(
  goals: GoalDefinition[],
  previews: Record<string, GoalTimePresetDraftPreview>,
): GoalDefinition[] {
  return goals.map((goal) => {
    const preview = previews[goal.path];
    if (!preview) return goal;
    if (preview.kind === 'root') {
      const next = { ...goal };
      if (preview.percent === null) delete next.timePresetPercent;
      else next.timePresetPercent = preview.percent;
      return next;
    }
    const next = { ...goal };
    if (preview.minutes === null) delete next.weeklyTargetMinutes;
    else next.weeklyTargetMinutes = preview.minutes;
    return next;
  });
}

function GoalTemplateMatrixHeader({ visibleBlocks }: { visibleBlocks: TemplateRecordTypeDefinition[] }) {
  return (
    <thead>
      <tr>
        <th className="think-goal-template-matrix__path-header">目标</th>
        {visibleBlocks.map((block) => (
          <th key={block.id} className="think-goal-template-matrix__block-header think-record-type-header" data-record-type={normalizeRecordTypePresentationKey(block.recordType)}>{block.name}</th>
        ))}
      </tr>
    </thead>
  );
}

export function GoalTemplateMatrixTable(props: GoalTemplateMatrixTableProps) {
  const { visibleGoals, visibleBlocks, goals } = props;
  const [draftPreviews, setDraftPreviews] = useState<Record<string, GoalTimePresetDraftPreview>>({});
  const previewGoals = useMemo(() => applyDraftPreviews(goals, draftPreviews), [goals, draftPreviews]);
  const totals = getRootTimePresetTotals(previewGoals);
  const activeGroups = splitGoalsByRoot(visibleGoals);

  const handleDraftPreview: GoalTimePresetDraftPreviewHandler = (path, preview) => {
    setDraftPreviews((previous) => {
      if (preview === null) {
        if (!(path in previous)) return previous;
        const next = { ...previous };
        delete next[path];
        return next;
      }
      return { ...previous, [path]: preview };
    });
  };

  const hasOvercommit = totals.overcommittedMinutes > 0.01;
  const balanceText = hasOvercommit
    ? `超出 ${formatHumanMinutes(totals.overcommittedMinutes)}`
    : `剩余 ${formatHumanMinutes(totals.reserveMinutes)}`;
  const balanceTitle = hasOvercommit
    ? `顶层目标已预设 ${formatHumanMinutes(totals.configuredMinutes)}，超过一周自然时间 168h 共 ${formatHumanMinutes(totals.overcommittedMinutes)}。`
    : `顶层目标已预设 ${formatHumanMinutes(totals.configuredMinutes)}，剩余 ${formatHumanMinutes(totals.reserveMinutes)} 未预设；总计 168h。`;

  return (
    <>
      <div
        className={`think-goal-template-matrix__time-total${hasOvercommit ? ' is-over' : ''}`}
        title={balanceTitle}
      >
        {balanceText}
      </div>
      <div className="think-goal-template-matrix__scroll">
        <table className="think-goal-template-matrix">
          <GoalTemplateMatrixHeader visibleBlocks={visibleBlocks} />
          <tbody>
            {activeGroups.length > 0 ? activeGroups.flatMap((group, groupIndex) => (
              GoalTemplateMatrixGroupRows({
                ...props,
                group,
                groupIndex,
                visibleBlockCount: visibleBlocks.length,
                previewGoals,
                onTimePresetDraftPreview: handleDraftPreview,
              })
            )) : (
              <tr>
                <td colSpan={visibleBlocks.length + 1} className="think-goal-template-matrix__empty">暂无匹配目标</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
