/** @jsxImportSource preact */
import { h } from 'preact';
import type { CoreBlockDefinition } from '@core/blocks/public';
import type { GoalDefinition, GoalTemplate } from '@core/goal/public';
import { GoalPresetCard } from './GoalPresetCard';
import { buildGoalTemplateCell, goalTemplateIcon, goalTemplateKey } from './goalTemplateMatrixModel';

export interface GoalTemplateMatrixCellProps {
  goal: GoalDefinition;
  block: CoreBlockDefinition;
  templates: GoalTemplate[];
  openEditor: (goal: GoalDefinition, block: CoreBlockDefinition, template?: GoalTemplate | null) => void;
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
          icon={goalTemplateIcon(template, goal)}
          onOpen={() => openEditor(goal, block, template)}
        />
      </div>
    );
  }

  if (template && template.enabled === false) {
    return (
      <button
        type="button"
        className="think-goal-template-matrix__preset-cell is-disabled"
        title="该目标下已隐藏此记录类型，点击修改"
        onClick={() => openEditor(goal, block, template)}
      >
        <span className="think-goal-template-matrix__disabled-label">隐藏</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      className="think-goal-template-matrix__preset-cell is-empty"
      title="点击创建这个目标的字段预设"
      onClick={() => openEditor(goal, block, null)}
    >
      <span className="think-goal-template-matrix__empty-add" aria-hidden="true">+</span>
    </button>
  );
}
