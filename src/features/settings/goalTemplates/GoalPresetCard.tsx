/** @jsxImportSource preact */
import { h } from 'preact';
import type { TemplateRecordTypeDefinition } from '@core/recordTypes/public';
import type { GoalDefinition, GoalTemplate } from '@core/goal/public';
import { getGoalTemplateDisplayName, readGoalTemplateIcon } from '@core/goal/public';

interface GoalPresetCardProps {
  goal: GoalDefinition;
  block: TemplateRecordTypeDefinition;
  template: GoalTemplate;
  templateKey: string;
  onOpen: () => void;
}

export function GoalPresetCard({ goal, block, template, templateKey, onOpen }: GoalPresetCardProps) {
  const icon = readGoalTemplateIcon(template, goal.icon) || goal.icon || '◇';
  const name = getGoalTemplateDisplayName(template, goal, block.name) || block.name;

  return (
    <button
      key={templateKey}
      type="button"
      data-goal-template-key={templateKey}
      className="think-goal-preset"
      title={`编辑「${goal.path}」的「${block.name}」模板`}
      onClick={onOpen}
    >
      <span className="think-goal-preset__icon" aria-hidden="true">{icon}</span>
      <span className="think-goal-preset__name">{name}</span>
    </button>
  );
}
