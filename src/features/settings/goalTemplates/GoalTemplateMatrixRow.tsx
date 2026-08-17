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
import type { GoalDropState } from './goalTemplateMatrixModel';

export interface GoalTemplateMatrixGroupRowsProps {
  group: GoalDefinition[];
  groupIndex: number;
  goals: GoalDefinition[];
  visibleBlocks: CoreBlockDefinition[];
  templates: GoalTemplate[];
  visibleBlockCount: number;
  expandedPaths: Set<string>;
  draggingGoalPath: string | null;
  goalDrop: GoalDropState;
  setDraggingGoalPath: (value: string | null) => void;
  setGoalDrop: (value: GoalDropState) => void;
  toggleTreePath: (path: string) => void;
  reorderGoalSiblings: (dragGoalPath: string, targetGoalPath: string, position: 'before' | 'after') => Promise<void>;
  handleDeleteGoal: (event: MouseEvent, goal: GoalDefinition) => Promise<void>;
  openEditor: (goal: GoalDefinition, block: CoreBlockDefinition, template?: GoalTemplate | null) => void;
}

function GoalDragHandle({ goal, setDraggingGoalPath, setGoalDrop }: {
  goal: GoalDefinition;
  setDraggingGoalPath: (value: string | null) => void;
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
          event.dataTransfer.setData('text/plain', goal.path);
        }
        setDraggingGoalPath(goal.path);
      }}
      onDragEnd={() => {
        setDraggingGoalPath(null);
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
  setDraggingGoalPath: (value: string | null) => void;
  setGoalDrop: (value: GoalDropState) => void;
  toggleTreePath: (path: string) => void;
  handleDeleteGoal: (event: MouseEvent, goal: GoalDefinition) => Promise<void>;
}) {
  const { goal, goals, expandedPaths, setDraggingGoalPath, setGoalDrop, toggleTreePath, handleDeleteGoal } = props;
  const path = getGoalDisplayPath(goal);
  const depth = getGoalDepth(goal);
  const hasChildren = goalHasChildren(goal, goals);
  const expanded = expandedPaths.has(path);
  const isRoot = depth === 0;

  return (
    <td className="think-goal-template-matrix__path-cell">
      <div
        className={`think-goal-template-matrix__goal${isRoot ? ' is-root' : ''}`}
        title={hasChildren ? '使用箭头展开/折叠子目标；拖动排序' : '拖动排序'}
      >
        <span className="think-goal-template-matrix__indent" style={{ '--think-goal-depth': depth } as any} />
        <GoalDragHandle goal={goal} setDraggingGoalPath={setDraggingGoalPath} setGoalDrop={setGoalDrop} />
        <TreeToggle hasChildren={hasChildren} expanded={expanded} path={path} toggleTreePath={toggleTreePath} />
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
  const { goal, goals, visibleBlocks, templates, expandedPaths, draggingGoalPath, goalDrop, setDraggingGoalPath, setGoalDrop, toggleTreePath, reorderGoalSiblings, handleDeleteGoal, openEditor } = props;
  const dropActive = goalDrop?.goalPath === getGoalDisplayPath(goal);

  return (
    <tr
      key={goal.path}
      className={dropActive ? `think-goal-template-matrix__goal-row is-drop-${goalDrop?.position}` : 'think-goal-template-matrix__goal-row'}
      onDragEnter={(event: DragEvent) => {
        if (!draggingGoalPath || draggingGoalPath === goal.path) return;
        event.preventDefault();
        setGoalDrop({ goalPath: getGoalDisplayPath(goal), position: getEventDropPosition(event) });
      }}
      onDragOver={(event: DragEvent) => {
        if (!draggingGoalPath || draggingGoalPath === goal.path) return;
        event.preventDefault();
      }}
      onDrop={async (event: DragEvent) => {
        if (!draggingGoalPath || !goalDrop) return;
        event.preventDefault();
        await reorderGoalSiblings(draggingGoalPath, goals.find((item) => getGoalDisplayPath(item) === goalDrop.goalPath)?.path || goal.path, goalDrop.position);
        setDraggingGoalPath(null);
        setGoalDrop(null);
      }}
      onDragEnd={() => {
        setDraggingGoalPath(null);
        setGoalDrop(null);
      }}
    >
      <GoalPathCell
        goal={goal}
        goals={goals}
        expandedPaths={expandedPaths}
        setDraggingGoalPath={setDraggingGoalPath}
        setGoalDrop={setGoalDrop}
        toggleTreePath={toggleTreePath}
        handleDeleteGoal={handleDeleteGoal}
      />
      {visibleBlocks.map((block) => (
        <td key={block.id} className="think-goal-template-matrix__block-cell">
          <GoalTemplateMatrixCell goal={goal} block={block} templates={templates} openEditor={openEditor} />
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
  props.group.forEach((goal) => rows.push(<GoalTemplateMatrixGoalRow key={goal.path} {...props} goal={goal} />));
  return rows;
}
