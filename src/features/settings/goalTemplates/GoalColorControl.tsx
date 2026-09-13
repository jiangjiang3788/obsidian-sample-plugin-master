/** @jsxImportSource preact */
import { h } from 'preact';
import type { GoalDefinition } from '@core/goal/public';
import { resolveGoalColor } from '@core/goal/public';
import { ThinkIcon, ThinkIconButton } from '@shared/ui/public';
import { getGoalDisplayPath } from './goalTemplateMatrixModel';

export function GoalColorControl({ goal, setGoalColor }: {
  goal: GoalDefinition;
  setGoalColor: (path: string, color: string | null) => Promise<void>;
}) {
  const path = getGoalDisplayPath(goal);
  const effective = resolveGoalColor(goal, path);
  return (
    <span
      className="think-goal-template-matrix__goal-color-control"
      data-goal-color-source={goal.color ? 'explicit' : 'auto'}
      title={goal.color ? `目标颜色：${goal.color}` : `目标颜色：自动 ${effective}`}
    >
      <input
        className="think-goal-template-matrix__goal-color-picker"
        type="color"
        aria-label={`${path} 目标颜色`}
        value={effective}
        onInput={(event) => {
          event.stopPropagation();
          void setGoalColor(path, (event.currentTarget as HTMLInputElement).value);
        }}
        onClick={(event) => event.stopPropagation()}
        onMouseDown={(event) => event.stopPropagation()}
      />
      {goal.color ? (
        <ThinkIconButton
          className="think-goal-template-matrix__goal-color-reset"
          size="sm"
          label={`恢复 ${path} 自动颜色`}
          icon={<ThinkIcon name="rotate-ccw" />}
          onClick={(event: MouseEvent) => {
            event.stopPropagation();
            void setGoalColor(path, null);
          }}
          onMouseDown={(event: MouseEvent) => event.stopPropagation()}
        />
      ) : null}
    </span>
  );
}
