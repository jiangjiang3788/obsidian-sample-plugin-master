/** @jsxImportSource preact */
import { h } from 'preact';
import type { CoreBlockDefinition } from '@core/blocks/public';
import type { GoalDefinition, GoalTemplate } from '@core/goal/public';
import { GoalTemplateMatrixGroupRows } from './GoalTemplateMatrixRow';
import { splitGoalsByRoot } from './goalTemplateMatrixModel';
import type { GoalDropState, PresetDragState, PresetDropCellState } from './goalTemplateMatrixModel';

export interface GoalTemplateMatrixTableProps {
  visibleGoals: GoalDefinition[];
  goals: GoalDefinition[];
  visibleBlocks: CoreBlockDefinition[];
  templates: GoalTemplate[];
  themeIconByPath: Map<string, string>;
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

function GoalTemplateMatrixHeader({ visibleBlocks }: { visibleBlocks: CoreBlockDefinition[] }) {
  return (
    <thead>
      <tr>
        <th className="think-goal-template-matrix__path-header">目标</th>
        {visibleBlocks.map((block) => (
          <th key={block.id} className="think-goal-template-matrix__block-header">{block.name}</th>
        ))}
      </tr>
    </thead>
  );
}

export function GoalTemplateMatrixTable(props: GoalTemplateMatrixTableProps) {
  const { visibleGoals, visibleBlocks } = props;
  const activeGroups = splitGoalsByRoot(visibleGoals);

  return (
    <div className="think-goal-template-matrix__scroll">
      <table className="think-goal-template-matrix">
        <GoalTemplateMatrixHeader visibleBlocks={visibleBlocks} />
        <tbody>
          {activeGroups.length > 0 ? activeGroups.flatMap((group, groupIndex) => (
            GoalTemplateMatrixGroupRows({ ...props, group, groupIndex, visibleBlockCount: visibleBlocks.length })
          )) : (
            <tr>
              <td colSpan={visibleBlocks.length + 1} className="think-goal-template-matrix__empty">暂无匹配目标</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
