/** @jsxImportSource preact */
import { h } from 'preact';
import { ThinkIcon, ThinkIconButton } from '@shared/ui/public';
import type { CoreBlockDefinition } from '@core/blocks/public';
import type { GoalDefinition, GoalTemplate } from '@core/goal/public';
import { GoalTemplateMatrixCell } from './GoalTemplateMatrixCell';
import {
  cleanDisplayText,
  getEventDropPosition,
  getGoalDepth,
  getGoalDisplayName,
  getGoalDisplayPath,
  goalHasChildren,
} from './goalTemplateMatrixModel';
import type { GoalDropState, PresetDragState, PresetDropCellState } from './goalTemplateMatrixModel';

export interface GoalTemplateMatrixGroupRowsProps {
  group: GoalDefinition[];
  groupIndex: number;
  goals: GoalDefinition[];
  visibleBlocks: CoreBlockDefinition[];
  templates: GoalTemplate[];
  themeIconByPath: Map<string, string>;
  visibleBlockCount: number;
  expandedPaths: Set<string>;
  collapsedGoalIds: Set<string>;
  draggingGoalId: string | null;
  goalDrop: GoalDropState;
  draggingPreset: PresetDragState | null;
  presetDropCell: PresetDropCellState;
  setDraggingGoalId: (value: string | null) => void;
  setGoalDrop: (value: GoalDropState) => void;
  setDraggingPreset: (value: PresetDragState | null) => void;
  setPresetDropCell: (value: PresetDropCellState) => void;
  toggleGoalRow: (goalId: string) => void;
  toggleTreePath: (path: string) => void;
  reorderGoalSiblings: (dragGoalId: string, targetGoalId: string, position: 'before' | 'after') => Promise<void>;
  handleDeleteGoal: (event: MouseEvent, goal: GoalDefinition) => Promise<void>;
  handlePresetDropOnCell: (event: DragEvent, goal: GoalDefinition, block: CoreBlockDefinition) => Promise<void>;
  openEditor: (goal: GoalDefinition, block: CoreBlockDefinition, template?: GoalTemplate | null) => void;
  openPresetContextMenu: (event: MouseEvent, goal: GoalDefinition, block: CoreBlockDefinition, template: GoalTemplate) => void;
}

function GoalDragHandle({ goal, setDraggingGoalId, setGoalDrop }: {
  goal: GoalDefinition;
  setDraggingGoalId: (value: string | null) => void;
  setGoalDrop: (value: GoalDropState) => void;
}) {
  return (
    <span
      className="think-goal-template-matrix__drag-handle"
      draggable
      onClick={(event: MouseEvent) => event.stopPropagation()}
      onMouseDown={(event: MouseEvent) => event.stopPropagation()}
      onDragStart={(event: DragEvent) => {
        event.stopPropagation();
        if (event.dataTransfer) {
          event.dataTransfer.effectAllowed = 'move';
          event.dataTransfer.setData('text/plain', goal.id);
        }
        setDraggingGoalId(goal.id);
      }}
      onDragEnd={() => {
        setDraggingGoalId(null);
        setGoalDrop(null);
      }}
      title="拖动目标排序"
    >
      <ThinkIcon name="grip-vertical" />
    </span>
  );
}

function TreeToggle({ hasChildren, expanded, path, toggleTreePath }: {
  hasChildren: boolean;
  expanded: boolean;
  path: string;
  toggleTreePath: (path: string) => void;
}) {
  if (!hasChildren) return <span className="think-goal-template-matrix__tree-spacer" />;
  return (
    <ThinkIconButton
      className="think-goal-template-matrix__tree-toggle"
      size="sm"
      label={expanded ? '折叠子目标' : '展开子目标'}
      icon={<ThinkIcon name={expanded ? 'chevron-down' : 'chevron-right'} />}
      onClick={(event: MouseEvent) => {
        event.stopPropagation();
        toggleTreePath(path);
      }}
    />
  );
}

function GoalPathCell(props: {
  goal: GoalDefinition;
  goals: GoalDefinition[];
  expandedPaths: Set<string>;
  collapsed: boolean;
  setDraggingGoalId: (value: string | null) => void;
  setGoalDrop: (value: GoalDropState) => void;
  toggleGoalRow: (goalId: string) => void;
  toggleTreePath: (path: string) => void;
  handleDeleteGoal: (event: MouseEvent, goal: GoalDefinition) => Promise<void>;
}) {
  const { goal, goals, expandedPaths, collapsed, setDraggingGoalId, setGoalDrop, toggleGoalRow, toggleTreePath, handleDeleteGoal } = props;
  const path = getGoalDisplayPath(goal);
  const depth = getGoalDepth(goal);
  const hasChildren = goalHasChildren(goal, goals);
  const expanded = expandedPaths.has(path);
  const isRoot = depth === 0;

  return (
    <td className="think-goal-template-matrix__path-cell">
      <div
        className={`think-goal-template-matrix__goal${isRoot ? ' is-root' : ''}`}
        onClick={() => toggleGoalRow(goal.id)}
        title="单击折叠/展开本目标；拖动排序"
      >
        <span className="think-goal-template-matrix__indent" style={{ '--think-goal-depth': depth } as any} />
        <GoalDragHandle goal={goal} setDraggingGoalId={setDraggingGoalId} setGoalDrop={setGoalDrop} />
        <TreeToggle hasChildren={hasChildren} expanded={expanded} path={path} toggleTreePath={toggleTreePath} />
        <ThinkIcon className="think-goal-template-matrix__collapse-state" name={collapsed ? 'chevron-right' : 'chevron-down'} />
        <span className="think-goal-template-matrix__goal-name">{cleanDisplayText(getGoalDisplayName(goal))}</span>
        <ThinkIconButton
          className="think-goal-template-matrix__delete"
          size="sm"
          tone="danger"
          label="删除目标"
          icon={<ThinkIcon name="trash-2" />}
          onClick={(event: MouseEvent) => handleDeleteGoal(event, goal)}
          onMouseDown={(event: MouseEvent) => event.stopPropagation()}
        />
      </div>
    </td>
  );
}

function GoalTemplateMatrixGoalRow(props: GoalTemplateMatrixGroupRowsProps & { goal: GoalDefinition }) {
  const { goal, goals, visibleBlocks, templates, themeIconByPath, expandedPaths, collapsedGoalIds, draggingGoalId, goalDrop, draggingPreset, presetDropCell, setDraggingGoalId, setGoalDrop, setDraggingPreset, setPresetDropCell, toggleGoalRow, toggleTreePath, reorderGoalSiblings, handleDeleteGoal, handlePresetDropOnCell, openEditor, openPresetContextMenu } = props;
  const collapsed = collapsedGoalIds.has(goal.id);
  const dropActive = goalDrop?.goalId === goal.id;

  return (
    <tr
      key={goal.id}
      className={dropActive ? `think-goal-template-matrix__goal-row is-drop-${goalDrop?.position}` : 'think-goal-template-matrix__goal-row'}
      onDragEnter={(event: DragEvent) => {
        if (!draggingGoalId || draggingGoalId === goal.id) return;
        event.preventDefault();
        setGoalDrop({ goalId: goal.id, position: getEventDropPosition(event) });
      }}
      onDragOver={(event: DragEvent) => {
        if (!draggingGoalId || draggingGoalId === goal.id) return;
        event.preventDefault();
      }}
      onDrop={async (event: DragEvent) => {
        if (!draggingGoalId || !goalDrop) return;
        event.preventDefault();
        await reorderGoalSiblings(draggingGoalId, goalDrop.goalId, goalDrop.position);
        setDraggingGoalId(null);
        setGoalDrop(null);
      }}
      onDragEnd={() => {
        setDraggingGoalId(null);
        setGoalDrop(null);
      }}
    >
      <GoalPathCell
        goal={goal}
        goals={goals}
        expandedPaths={expandedPaths}
        collapsed={collapsed}
        setDraggingGoalId={setDraggingGoalId}
        setGoalDrop={setGoalDrop}
        toggleGoalRow={toggleGoalRow}
        toggleTreePath={toggleTreePath}
        handleDeleteGoal={handleDeleteGoal}
      />
      {visibleBlocks.map((block) => (
        <td key={block.id} className="think-goal-template-matrix__block-cell">
          <GoalTemplateMatrixCell
            goal={goal}
            block={block}
            goals={goals}
            templates={templates}
            themeIconByPath={themeIconByPath}
            collapsed={collapsed}
            draggingPreset={draggingPreset}
            presetDropCell={presetDropCell}
            setDraggingPreset={setDraggingPreset}
            setPresetDropCell={setPresetDropCell}
            handlePresetDropOnCell={handlePresetDropOnCell}
            openEditor={openEditor}
            openPresetContextMenu={openPresetContextMenu}
          />
        </td>
      ))}
    </tr>
  );
}

export function GoalTemplateMatrixGroupRows(props: GoalTemplateMatrixGroupRowsProps): h.JSX.Element[] {
  const rows: h.JSX.Element[] = [];
  if (props.groupIndex > 0) {
    rows.push(
      <tr key={`spacer-${props.groupIndex}`} className="think-goal-template-matrix__spacer-row">
        <td colSpan={props.visibleBlockCount + 1} />
      </tr>,
    );
  }
  props.group.forEach((goal) => rows.push(<GoalTemplateMatrixGoalRow key={goal.id} {...props} goal={goal} />));
  return rows;
}
