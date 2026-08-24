/** @jsxImportSource preact */
import { h } from 'preact';
import type { TemplateRecordTypeDefinition } from '@core/recordTypes/public';
import type { GoalDefinition, GoalTemplate } from '@core/goal/public';
import { GoalTemplateMatrixGroupRows } from './GoalTemplateMatrixRow';
import { splitGoalsByRoot } from './goalTemplateMatrixModel';
import type { GoalDropState } from './goalTemplateMatrixModel';

export interface GoalTemplateMatrixTableProps {
  visibleGoals: GoalDefinition[];
  goals: GoalDefinition[];
  visibleBlocks: TemplateRecordTypeDefinition[];
  templates: GoalTemplate[];
  expandedPaths: Set<string>;
  draggingGoalPath: string | null;
  goalDrop: GoalDropState;
  setDraggingGoalPath: (value: string | null) => void;
  setGoalDrop: (value: GoalDropState) => void;
  toggleTreePath: (path: string) => void;
  reorderGoalSiblings: (dragGoalPath: string, targetGoalPath: string, position: 'before' | 'after') => Promise<void>;
  handleDeleteGoal: (event: MouseEvent, goal: GoalDefinition) => Promise<void>;
  openEditor: (goal: GoalDefinition, block: TemplateRecordTypeDefinition, template?: GoalTemplate | null) => void;
}

function GoalTemplateMatrixHeader({ visibleBlocks }: { visibleBlocks: TemplateRecordTypeDefinition[] }) {
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
