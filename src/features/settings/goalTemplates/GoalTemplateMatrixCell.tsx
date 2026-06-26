/** @jsxImportSource preact */
import { h } from 'preact';
import type { CoreBlockDefinition, GoalDefinition, GoalTemplate } from '@core/public';
import { GoalPresetCard } from './GoalPresetCard';
import { readGoalTemplateIcon, readGoalTemplateThemePath } from './goalTemplateCopy';
import {
  buildGoalTemplateCell,
  getPresetCardName,
  goalTemplateKey,
  sortPresets,
} from './goalTemplateMatrixModel';
import type { PresetDragState, PresetDropCellState } from './goalTemplateMatrixModel';

const ADD_BUTTON_HEIGHT = 36;

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

function AddPresetButton(props: { goal: GoalDefinition; block: CoreBlockDefinition; openEditor: GoalTemplateMatrixCellProps['openEditor'] }) {
  const { goal, block, openEditor } = props;
  return (
    <button
      type="button"
      onClick={(event: any) => {
        event.stopPropagation();
        openEditor(goal, block);
      }}
      title="添加预设"
      style={{
        width: '100%',
        height: ADD_BUTTON_HEIGHT,
        minHeight: ADD_BUTTON_HEIGHT,
        border: '1px dashed var(--background-modifier-border)',
        borderRadius: 8,
        background: 'var(--background-secondary)',
        color: 'var(--text-muted)',
        cursor: 'pointer',
        font: 'inherit',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 0,
        margin: 0,
        boxShadow: 'none',
        lineHeight: 1,
      }}
    >
      ＋
    </button>
  );
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
      title="＋ 添加；左键编辑；右键复制；拖动排序或移动"
      onDragEnter={(event: any) => {
        if (!draggingPreset) return;
        event.preventDefault();
        event.stopPropagation();
        if (!presetDropCell || presetDropCell.goalId !== goal.id || presetDropCell.blockId !== block.id) setPresetDropCell({ goalId: goal.id, blockId: block.id });
      }}
      onDragOver={(event: any) => {
        if (!draggingPreset) return;
        event.preventDefault();
      }}
      onDrop={(event: any) => handlePresetDropOnCell(event, goal, block)}
      style={{
        display: 'grid',
        gridAutoRows: 'min-content',
        alignContent: 'start',
        justifyItems: 'stretch',
        gap: 4,
        minHeight: ADD_BUTTON_HEIGHT + 8,
        padding: '0 4px 4px',
        borderRadius: 10,
        background: 'transparent',
        outline: isDropCell ? '2px dashed #7c3cff' : 'none',
        outlineOffset: isDropCell ? -2 : 0,
      }}
    >
      <AddPresetButton goal={goal} block={block} openEditor={openEditor} />
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
    </div>
  );
}
