/** @jsxImportSource preact */
import { h } from 'preact';
import type { TemplateRecordTypeDefinition } from '@core/recordTypes/public';
import type { GoalDefinition, GoalTemplate } from '@core/goal/public';
import { getGoalLeaf, getGoalTemplateDisplayName, resolveGoalIcon } from '@core/goal/public';

interface GoalPresetCardProps {
  goal: GoalDefinition;
  block: TemplateRecordTypeDefinition;
  template: GoalTemplate;
  templateKey: string;
  onOpen: () => void;
}

export function GoalPresetCard({ goal, block, template, templateKey, onOpen }: GoalPresetCardProps) {
  const icon = resolveGoalIcon(goal);
  const leaf = getGoalLeaf(goal.path) || goal.path;
  const displayName = getGoalTemplateDisplayName(template, goal, block.name) || block.name;
  const detail = displayName !== leaf && displayName !== block.name ? displayName : '';

  return (
    <button
      key={templateKey}
      type="button"
      data-goal-template-key={templateKey}
      className="think-goal-preset"
      title={detail ? `编辑「${goal.path}」的「${block.name}」模板 · ${detail}` : `编辑「${goal.path}」的「${block.name}」模板`}
      onClick={onOpen}
    >
      <span className="think-goal-preset__identity">
        <span className="think-goal-preset__icon" aria-hidden="true">{icon || '◇'}</span>
        <span className="think-goal-preset__goal">{leaf}</span>
      </span>
    </button>
  );
}
