/** @jsxImportSource preact */
import { h } from 'preact';
import type { TemplateRecordTypeDefinition } from '@core/recordTypes/public';
import type { GoalDefinition } from '@core/goal/public';
import { getGoalTimePresetInfo } from '@core/goal/public';
import { getGoalDepth, getGoalDisplayPath, getGoalParentPath } from './goalTemplateMatrixModel';

function formatBalanceMinutes(minutes: number): string {
  const total = Math.max(0, Math.round(minutes));
  const hours = Math.floor(total / 60);
  const mins = total % 60;
  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h${mins}m`;
}

export function GoalTimePresetBalanceRow({ goal, goals, visibleBlocks }: {
  goal: GoalDefinition;
  goals: GoalDefinition[];
  visibleBlocks: TemplateRecordTypeDefinition[];
}) {
  const info = getGoalTimePresetInfo(goal.path, goals);
  if (!info?.configured || info.directChildrenCount <= 0) return null;
  const isOver = info.overallocatedMinutes > 0.01;
  const value = isOver ? info.overallocatedMinutes : info.unallocatedMinutes;
  const label = isOver ? '超出' : '未细分';
  const depth = getGoalDepth(goal) + 1;
  const title = isOver
    ? `子目标已预设 ${formatBalanceMinutes(info.directChildrenTargetMinutes)}，父目标 ${formatBalanceMinutes(info.weeklyTargetMinutes || 0)}，超出 ${formatBalanceMinutes(info.overallocatedMinutes)}。`
    : `子目标已预设 ${formatBalanceMinutes(info.directChildrenTargetMinutes)} + 未细分 ${formatBalanceMinutes(info.unallocatedMinutes)} = 父目标 ${formatBalanceMinutes(info.weeklyTargetMinutes || 0)}。`;

  return (
    <tr className={`think-goal-template-matrix__balance-row${isOver ? ' is-over' : ''}`}>
      <td className="think-goal-template-matrix__path-cell">
        <div
          className="think-goal-template-matrix__balance"
          data-goal-depth={depth}
          title={title}
        >
          <span>{label}</span>
          <strong>{formatBalanceMinutes(value)}</strong>
        </div>
      </td>
      {visibleBlocks.map((block) => <td key={block.id} className="think-goal-template-matrix__block-cell think-goal-template-matrix__balance-empty" />)}
    </tr>
  );
}

export function getClosedTimePresetParents(
  current: GoalDefinition,
  next: GoalDefinition | undefined,
  goals: GoalDefinition[],
): GoalDefinition[] {
  const byPath = new Map(goals.map((goal) => [getGoalDisplayPath(goal), goal] as const));
  const nextPath = next ? getGoalDisplayPath(next) : '';
  const closed: GoalDefinition[] = [];
  let candidatePath = getGoalDisplayPath(current);
  while (candidatePath) {
    if (!nextPath || !nextPath.startsWith(`${candidatePath}/`)) {
      const candidate = byPath.get(candidatePath);
      if (candidate) closed.push(candidate);
    }
    const candidate = byPath.get(candidatePath);
    if (!candidate) break;
    candidatePath = getGoalParentPath(candidate);
  }
  return closed;
}
