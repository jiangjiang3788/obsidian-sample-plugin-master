/** @jsxImportSource preact */
import { h } from 'preact';
import type { TemplateRecordTypeDefinition } from '@core/recordTypes/public';
import type { GoalDefinition, GoalTemplate } from '@core/goal/public';
import { getGoalLeaf, resolveGoalIcon } from '@core/goal/public';
import { GoalPresetCard } from './GoalPresetCard';
import { buildGoalTemplateCell, goalTemplateKey } from './goalTemplateMatrixModel';

export interface GoalTemplateMatrixCellProps {
  goal: GoalDefinition;
  block: TemplateRecordTypeDefinition;
  templates: GoalTemplate[];
  openEditor: (goal: GoalDefinition, block: TemplateRecordTypeDefinition, template?: GoalTemplate | null) => void;
}

export function GoalTemplateMatrixCell({ goal, block, templates, openEditor }: GoalTemplateMatrixCellProps) {
  const cell = buildGoalTemplateCell(goal, block, templates);
  const template = cell.template;

  if (template && template.enabled !== false) {
    return (
      <div className="think-goal-template-matrix__preset-cell">
        <GoalPresetCard
          goal={goal}
          block={block}
          template={template}
          templateKey={goalTemplateKey(template)}
          onOpen={() => openEditor(goal, block, template)}
        />
      </div>
    );
  }

  if (template && template.enabled === false) {
    const leaf = getGoalLeaf(goal.path) || goal.path;
    return (
      <button
        type="button"
        className="think-goal-template-matrix__preset-cell is-disabled"
        title="该目标下已隐藏此记录类型，点击修改"
        onClick={() => openEditor(goal, block, template)}
      >
        <span className="think-goal-preset__identity">
          <span className="think-goal-preset__icon" aria-hidden="true">{resolveGoalIcon(goal) || '◇'}</span>
          <span className="think-goal-preset__goal">{leaf}</span>
        </span>
      </button>
    );
  }

  // Empty matrix cells are intentionally inert. Creation belongs to the Goal
  // row itself so the grid does not become a wall of plus buttons.
  return <div className="think-goal-template-matrix__preset-cell is-empty" aria-label={`${goal.path} / ${block.name} 未配置模板`} />;
}
