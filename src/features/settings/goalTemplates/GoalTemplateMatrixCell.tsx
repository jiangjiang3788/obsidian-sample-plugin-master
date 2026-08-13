/** @jsxImportSource preact */
import { h } from 'preact';
import { ThinkButton, ThinkIcon } from '@shared/ui/public';
import type { CoreBlockDefinition } from '@core/blocks/public';
import type { GoalDefinition, GoalTemplate } from '@core/goal/public';
import { GoalPresetCard } from './GoalPresetCard';
import { readGoalTemplateIcon, readGoalTemplateThemePath } from './goalTemplateCopy';
import {
  buildGoalTemplateCell,
  getPresetCardName,
  goalTemplateKey,
  sortPresets,
} from './goalTemplateMatrixModel';
import type { PresetDragState, PresetDropCellState } from './goalTemplateMatrixModel';

export interface GoalTemplateMatrixCellProps {
  goal: GoalDefinition;
  block: CoreBlockDefinition;
  goals: GoalDefinition[];
  templates: GoalTemplate[];
  themeIconByPath: Map<string, string>;
  collapsed: boolean;
  draggingPreset: PresetDragState | null;
  presetDropCell: PresetDropCellState;
  setDraggingPreset: (value: PresetDragState | null) => void;
  setPresetDropCell: (value: PresetDropCellState) => void;
  handlePresetDropOnCell: (event: DragEvent, goal: GoalDefinition, block: CoreBlockDefinition) => Promise<void>;
  openEditor: (goal: GoalDefinition, block: CoreBlockDefinition, template?: GoalTemplate | null) => void;
  openPresetContextMenu: (event: MouseEvent, goal: GoalDefinition, block: CoreBlockDefinition, template: GoalTemplate) => void;
}

function PresetCard(props: {
  goal: GoalDefinition;
  block: CoreBlockDefinition;
  template: GoalTemplate;
  themeIconByPath: Map<string, string>;
  draggingPreset: PresetDragState | null;
  setDraggingPreset: (value: PresetDragState | null) => void;
  setPresetDropCell: (value: PresetDropCellState) => void;
  openEditor: GoalTemplateMatrixCellProps['openEditor'];
  openPresetContextMenu: GoalTemplateMatrixCellProps['openPresetContextMenu'];
}) {
  const { goal, block, template, themeIconByPath, draggingPreset, setDraggingPreset, setPresetDropCell, openEditor, openPresetContextMenu } = props;
  const themePath = readGoalTemplateThemePath(template, goal);
  const icon = readGoalTemplateIcon(template, themeIconByPath.get(themePath));
  const name = getPresetCardName(template, goal);
  const key = goalTemplateKey(template);
  return (
    <GoalPresetCard
      goal={goal}
      block={block}
      template={template}
      templateKey={key}
      name={name}
      icon={icon}
      themePath={themePath}
      isDragging={draggingPreset?.templateKey === key}
      onOpen={() => openEditor(goal, block, template)}
      onContextMenu={(event) => openPresetContextMenu(event, goal, block, template)}
      onDragStart={(event) => {
        event.stopPropagation();
        if (event.dataTransfer) {
          event.dataTransfer.effectAllowed = 'move';
          event.dataTransfer.setData('text/plain', key);
        }
        setDraggingPreset({ goalId: goal.id, blockId: block.id, templateKey: key });
      }}
      onDragEnd={() => {
        setDraggingPreset(null);
        setPresetDropCell(null);
      }}
    />
  );
}

export function GoalTemplateMatrixCell(props: GoalTemplateMatrixCellProps) {
  const {
    goal,
    block,
    goals,
    templates,
    themeIconByPath,
    collapsed,
    draggingPreset,
    presetDropCell,
    setDraggingPreset,
    setPresetDropCell,
    handlePresetDropOnCell,
    openEditor,
    openPresetContextMenu,
  } = props;
  const cell = buildGoalTemplateCell(goal, block, templates);
  const presets = sortPresets(cell.enabledTemplates, goals);
  const isDropCell = presetDropCell?.goalId === goal.id && presetDropCell.blockId === block.id;

  return (
    <div
      className={`think-goal-template-matrix__preset-cell${isDropCell ? ' is-drop-target' : ''}`}
      title="添加、编辑或拖动记录预设"
      onDragEnter={(event: DragEvent) => {
        if (!draggingPreset) return;
        event.preventDefault();
        event.stopPropagation();
        if (!presetDropCell || presetDropCell.goalId !== goal.id || presetDropCell.blockId !== block.id) setPresetDropCell({ goalId: goal.id, blockId: block.id });
      }}
      onDragOver={(event: DragEvent) => {
        if (!draggingPreset) return;
        event.preventDefault();
      }}
      onDrop={(event: DragEvent) => handlePresetDropOnCell(event, goal, block)}
    >
      {!collapsed && presets.map((template) => (
        <PresetCard
          key={goalTemplateKey(template)}
          goal={goal}
          block={block}
          template={template}
          themeIconByPath={themeIconByPath}
          draggingPreset={draggingPreset}
          setDraggingPreset={setDraggingPreset}
          setPresetDropCell={setPresetDropCell}
          openEditor={openEditor}
          openPresetContextMenu={openPresetContextMenu}
        />
      ))}
      <ThinkButton
        size="sm"
        variant="ghost"
        className="think-goal-template-matrix__add"
        leadingIcon={<ThinkIcon name="plus" />}
        onClick={(event: MouseEvent) => {
          event.stopPropagation();
          openEditor(goal, block);
        }}
      >
        添加
      </ThinkButton>
    </div>
  );
}
