/** @jsxImportSource preact */
import { h } from 'preact';
import { Box, TableCell, TableRow, Typography } from '@shared/ui/public';
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

const MatrixTableRow = TableRow as unknown as typeof TableRow;
const MatrixTableCell = TableCell as unknown as typeof TableCell;
const MatrixTypography = Typography as unknown as typeof Typography;
const MatrixBox = Box as unknown as typeof Box;

const PATH_COL_WIDTH = 250;
const BLOCK_COL_WIDTH = 136;
const SEGMENT_HEIGHT = 36;

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

function GoalDragHandle(props: {
  goal: GoalDefinition;
  setDraggingGoalId: (value: string | null) => void;
  setGoalDrop: (value: GoalDropState) => void;
}) {
  const { goal, setDraggingGoalId, setGoalDrop } = props;
  return (
    <span
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
      style={{ color: 'var(--text-muted)', cursor: 'grab', userSelect: 'none', width: 18, textAlign: 'center', flexShrink: 0 }}
    >
      ☰
    </span>
  );
}

function TreeToggle(props: { hasChildren: boolean; expanded: boolean; path: string; toggleTreePath: (path: string) => void }) {
  const { hasChildren, expanded, path, toggleTreePath } = props;
  if (!hasChildren) return <span style={{ display: 'inline-block', width: 18, flexShrink: 0 }} />;
  return (
    <button
      type="button"
      onClick={(event: MouseEvent) => {
        event.stopPropagation();
        toggleTreePath(path);
      }}
      title="折叠/展开子目标"
      style={{ border: 'none', background: 'transparent', color: 'var(--text-muted)', width: 18, padding: 0, cursor: 'pointer', flexShrink: 0 }}
    >
      {expanded ? '▾' : '▸'}
    </button>
  );
}

function DeleteGoalButton(props: { goal: GoalDefinition; handleDeleteGoal: (event: MouseEvent, goal: GoalDefinition) => Promise<void> }) {
  const { goal, handleDeleteGoal } = props;
  return (
    <button
      type="button"
      title="删除目标"
      onClick={(event: MouseEvent) => handleDeleteGoal(event, goal)}
      onMouseDown={(event: MouseEvent) => event.stopPropagation()}
      style={{
        border: 'none',
        background: 'transparent',
        color: 'var(--text-muted)',
        cursor: 'pointer',
        width: 22,
        height: 22,
        borderRadius: 6,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        lineHeight: 1,
        flexShrink: 0,
        padding: 0,
        margin: 0,
      }}
    >
      ×
    </button>
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
  const goalCellBg = isRoot ? 'rgba(122, 94, 230, 0.18)' : 'rgba(122, 94, 230, 0.06)';

  return (
    <MatrixTableCell sx={{ width: PATH_COL_WIDTH, px: 0.5, py: 0.35, position: 'sticky', left: 0, zIndex: 2, background: 'var(--background-primary)', verticalAlign: 'top' }}>
      <MatrixBox
        onClick={() => toggleGoalRow(goal.id)}
        title="单击折叠/展开本目标；拖动 ☰ 排序"
        sx={{
          minHeight: `${SEGMENT_HEIGHT}px`,
          display: 'flex',
          alignItems: 'center',
          borderRadius: 2,
          backgroundColor: goalCellBg,
          px: isRoot ? 1 : 0.75,
          cursor: 'pointer',
        }}
      >
        <MatrixBox sx={{ display: 'flex', alignItems: 'center', gap: 0.75, minWidth: 0, width: '100%' }}>
          <span style={{ display: 'inline-block', width: depth * 18, flexShrink: 0 }} />
          <GoalDragHandle goal={goal} setDraggingGoalId={setDraggingGoalId} setGoalDrop={setGoalDrop} />
          <TreeToggle hasChildren={hasChildren} expanded={expanded} path={path} toggleTreePath={toggleTreePath} />
          <span style={{ color: collapsed ? 'var(--text-muted)' : 'var(--text-faint)', width: 16, textAlign: 'center', flexShrink: 0 }}>{collapsed ? '▸' : '▾'}</span>
          <MatrixBox sx={{ minWidth: 0, flex: 1 }}>
            <MatrixTypography sx={{ fontWeight: isRoot ? 700 : 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cleanDisplayText(getGoalDisplayName(goal))}</MatrixTypography>
          </MatrixBox>
          <DeleteGoalButton goal={goal} handleDeleteGoal={handleDeleteGoal} />
        </MatrixBox>
      </MatrixBox>
    </MatrixTableCell>
  );
}

function GoalTemplateMatrixGoalRow(props: GoalTemplateMatrixGroupRowsProps & { goal: GoalDefinition }) {
  const { goal, goals, visibleBlocks, templates, themeIconByPath, expandedPaths, collapsedGoalIds, draggingGoalId, goalDrop, draggingPreset, presetDropCell, setDraggingGoalId, setGoalDrop, setDraggingPreset, setPresetDropCell, toggleGoalRow, toggleTreePath, reorderGoalSiblings, handleDeleteGoal, handlePresetDropOnCell, openEditor, openPresetContextMenu } = props;
  const collapsed = collapsedGoalIds.has(goal.id);
  const dropActive = goalDrop?.goalId === goal.id;

  return (
    <MatrixTableRow
      key={goal.id}
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
      sx={{ boxShadow: dropActive ? `inset 0 ${goalDrop?.position === 'before' ? '3px' : '-3px'} 0 #7c3cff` : 'none' }}
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
        <MatrixTableCell key={block.id} align="center" sx={{ width: BLOCK_COL_WIDTH, minWidth: BLOCK_COL_WIDTH, px: 0.35, py: 0.35, verticalAlign: 'top' }}>
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
        </MatrixTableCell>
      ))}
    </MatrixTableRow>
  );
}

export function GoalTemplateMatrixGroupRows(props: GoalTemplateMatrixGroupRowsProps): h.JSX.Element[] {
  const rows: h.JSX.Element[] = [];
  if (props.groupIndex > 0) {
    rows.push(
      <MatrixTableRow key={`spacer-${props.groupIndex}`}>
        <MatrixTableCell colSpan={props.visibleBlockCount + 1} sx={{ border: 0, p: 0, height: 10, background: 'transparent' }} />
      </MatrixTableRow>
    );
  }
  props.group.forEach((goal) => rows.push(<GoalTemplateMatrixGoalRow key={goal.id} {...props} goal={goal} />));
  return rows;
}
